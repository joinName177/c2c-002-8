import type { GardenStore } from '../core/models';
export interface GardenRepository { load(): GardenStore; save(store: GardenStore): void; }
