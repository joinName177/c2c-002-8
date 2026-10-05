import type { GardenProfile, GardenSnapshot, ProfileBook } from './models';
import { emptySnapshot } from './models';

export const DEFAULT_PROFILE_NAME = '我的花园';

function profileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createProfile(name?: string, garden: GardenSnapshot = emptySnapshot(), createdAt = new Date().toISOString()): GardenProfile {
  const trimmed = (name ?? '').trim();
  return { id: profileId(), name: trimmed || DEFAULT_PROFILE_NAME, createdAt, garden: { entries: garden.entries ?? [], plants: garden.plants ?? [] } };
}

export function createBook(profiles: GardenProfile[]): ProfileBook {
  if (!profiles.length) throw new Error('档案簿至少要保留一个档案');
  return { currentId: profiles[0].id, profiles };
}

/** 找到当前档案；currentId 失效时回退到第一个档案，保证任何时刻都有可用的当前档案。 */
export function currentProfile(book: ProfileBook): GardenProfile {
  return book.profiles.find((profile) => profile.id === book.currentId) ?? book.profiles[0];
}

/** 切换当前档案；目标不存在时保持现状不变。 */
export function switchProfile(book: ProfileBook, id: string): ProfileBook {
  if (!book.profiles.some((profile) => profile.id === id)) return book;
  book.currentId = id;
  return book;
}

export function addProfile(book: ProfileBook, name?: string): { book: ProfileBook; profile: GardenProfile } {
  const profile = createProfile(name);
  book.profiles.push(profile);
  book.currentId = profile.id;
  return { book, profile };
}

/**
 * 删除档案：删的是当前档案时先切到另一个档案再删；
 * 剩下最后一个档案时不允许删除。
 */
export function removeProfile(book: ProfileBook, id: string): ProfileBook {
  if (book.profiles.length <= 1) return book;
  if (id === book.currentId) {
    const fallback = book.profiles.find((profile) => profile.id !== id);
    if (fallback) book.currentId = fallback.id;
  }
  book.profiles = book.profiles.filter((profile) => profile.id !== id);
  return book;
}

/** 首次打开时把已有的单花园数据整体迁入默认档案，不丢任何一条旧记录。 */
export function migrateLegacySnapshot(snapshot: GardenSnapshot): ProfileBook {
  const firstDate = snapshot.entries.map((entry) => entry.date).sort()[0];
  const createdAt = firstDate ? `${firstDate}T00:00:00.000Z` : new Date().toISOString();
  const profile = createProfile(DEFAULT_PROFILE_NAME, snapshot, createdAt);
  return createBook([profile]);
}
