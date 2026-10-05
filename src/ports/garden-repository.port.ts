import type { ProfileBook } from '../core/models';
export interface GardenRepository {
  /** 载入档案簿；首次打开时自动完成旧版单花园数据迁移。 */
  load(): ProfileBook;
  save(book: ProfileBook): void;
}
