/**
 * NativeFavoritesService — Main Process favorites boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * Favorites are stored in %APPDATA%/remon-download/favorites.json
 *
 * Note: remove() returns string (id) to match the IPC contract response type,
 * unlike MockFavoritesService which returns void.
 */
import type { FavoriteItem } from '../../src/types/download';
import { readJsonFile, writeJsonFile } from '../utils/fileStorage';

interface FavoritesFileFormat {
  version: string;
  data: FavoriteItem[];
}

export class NativeFavoritesService {
  private items: FavoriteItem[] = [];
  private readonly FAVORITES_FILE = 'favorites.json';
  private readonly FILE_VERSION = '1.0.0';

  /**
   * Initialize service by loading favorites from disk
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    const fileData = await readJsonFile<FavoritesFileFormat>(
      this.FAVORITES_FILE,
      {
        version: this.FILE_VERSION,
        data: [],
      }
    );

    // Data is already in correct format (dateAdded is string)
    this.items = fileData.data;
  }

  /**
   * Persist current favorites to disk
   */
  private async persist(): Promise<void> {
    await writeJsonFile<FavoritesFileFormat>(this.FAVORITES_FILE, {
      version: this.FILE_VERSION,
      data: this.items,
    });
  }

  async getAll(): Promise<FavoriteItem[]> {
    return [...this.items];
  }

  async add(item: FavoriteItem): Promise<FavoriteItem> {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    await this.persist();
    return item;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }
}
