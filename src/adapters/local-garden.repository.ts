import type { GardenRepository } from '../ports/garden-repository.port';
import type { GardenSnapshot, ProfileBook } from '../core/models';
import { sampleSnapshot } from '../core/garden-engine';
import { createProfile, currentProfile, migrateLegacySnapshot, switchProfile } from '../core/profiles';

const KEY = 'c2c-002-emotion-garden:profiles';
const LEGACY_KEY = 'c2c-002-emotion-garden';

function normalizeSnapshot(value: unknown): GardenSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<GardenSnapshot>;
  if (!Array.isArray(candidate.entries) || !Array.isArray(candidate.plants)) return null;
  return { entries: candidate.entries as GardenSnapshot['entries'], plants: candidate.plants as GardenSnapshot['plants'] };
}

/** 容错解析：currentId 失效时回退第一个档案，任何坏数据都不会让档案簿空掉。 */
function normalizeBook(value: unknown): ProfileBook | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProfileBook>;
  if (!Array.isArray(candidate.profiles) || !candidate.profiles.length) return null;
  const profiles = candidate.profiles
    .filter((profile) => profile && typeof profile.id === 'string' && normalizeSnapshot(profile.garden))
    .map((profile) => ({
      id: profile.id,
      name: typeof profile.name === 'string' && profile.name.trim() ? profile.name : '未命名花园',
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
      garden: normalizeSnapshot(profile.garden) as GardenSnapshot,
    }));
  if (!profiles.length) return null;
  const book: ProfileBook = { currentId: typeof candidate.currentId === 'string' ? candidate.currentId : profiles[0].id, profiles };
  return switchProfile(book, currentProfile(book).id);
}

export class LocalGardenRepository implements GardenRepository {
  load(): ProfileBook {
    try {
      const value = localStorage.getItem(KEY);
      if (value) {
        const book = normalizeBook(JSON.parse(value));
        if (book) return book;
      }
      // 首次打开：旧版单花园数据整体迁入默认档案，保留全部旧记录；旧键保留作为备份。
      if (localStorage.getItem(LEGACY_KEY)) {
        const legacy = normalizeSnapshot(JSON.parse(localStorage.getItem(LEGACY_KEY) as string));
        if (legacy) {
          const migrated = migrateLegacySnapshot(legacy);
          this.save(migrated);
          return migrated;
        }
      }
    } catch { /* 落回全新默认档案 */ }
    const book = { currentId: '', profiles: [createProfile(undefined, sampleSnapshot())] };
    book.currentId = book.profiles[0].id;
    this.save(book);
    return book;
  }

  save(book: ProfileBook) { localStorage.setItem(KEY, JSON.stringify(book)); }
}
