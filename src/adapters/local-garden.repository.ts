import type { GardenRepository } from '../ports/garden-repository.port';
import type { GardenSnapshot, GardenStore } from '../core/models';
import { createProfile, sampleSnapshot, syncPlants } from '../core/garden-engine';

const STORE_KEY = 'c2c-002-emotion-garden:profiles';
const LEGACY_KEY = 'c2c-002-emotion-garden';

function normalize(store: GardenStore): GardenStore {
  const profiles = (store.profiles ?? []).filter((profile) => profile && Array.isArray(profile.entries));
  if (!profiles.length) profiles.push(createProfile('我的花园', sampleSnapshot()));
  for (const profile of profiles) profile.plants = syncPlants(profile.entries, profile.plants ?? []);
  const currentProfileId = profiles.some((profile) => profile.id === store.currentProfileId) ? store.currentProfileId : profiles[0].id;
  return { profiles, currentProfileId };
}

export class LocalGardenRepository implements GardenRepository {
  load(): GardenStore {
    try {
      const value = localStorage.getItem(STORE_KEY);
      if (value) return normalize(JSON.parse(value) as GardenStore);
    } catch { /* fall through to migration / seed */ }
    let snapshot: GardenSnapshot | null = null;
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) snapshot = JSON.parse(legacy) as GardenSnapshot;
    } catch { snapshot = null; }
    const profile = createProfile('我的花园', snapshot ?? sampleSnapshot());
    const store: GardenStore = { profiles: [profile], currentProfileId: profile.id };
    this.save(store);
    if (snapshot) localStorage.removeItem(LEGACY_KEY);
    return store;
  }
  save(store: GardenStore) { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
}
