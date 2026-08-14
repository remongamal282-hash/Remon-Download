/**
 * NativeFavoritesService — Main Process favorites boundary.
 *
 * Phase 2 Foundation: In-memory implementation. The IPC handlers delegate here.
 *
 * Note: remove() returns string (id) to match the IPC contract response type,
 * unlike MockFavoritesService which returns void.
 */
import type { FavoriteItem } from "../../src/types/download";

export class NativeFavoritesService {
  private items: FavoriteItem[] = [];

  async getAll(): Promise<FavoriteItem[]> {
    return [...this.items];
  }

  async add(item: FavoriteItem): Promise<FavoriteItem> {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    return item;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }
}
