"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeFavoritesService = void 0;
const fileStorage_1 = require("../utils/fileStorage");
function isFavoritesFileFormat(value) {
    return !!value && typeof value === 'object' && 'data' in value && Array.isArray(value.data);
}
function normalizeFavoriteItem(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }
    const dateValue = typeof item.dateAdded === 'string' ? item.dateAdded : new Date().toISOString();
    const parsedDate = new Date(dateValue);
    const normalizedDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    return {
        id: String(item.id ?? crypto.randomUUID()),
        sourceUrl: String(item.sourceUrl ?? ''),
        thumbnail: String(item.thumbnail ?? ''),
        title: String(item.title ?? 'Untitled Favorite'),
        channel: String(item.channel ?? 'Unknown channel'),
        dateAdded: normalizedDate,
    };
}
class NativeFavoritesService {
    constructor() {
        this.items = [];
        this.FAVORITES_FILE = 'favorites.json';
        this.FILE_VERSION = '1.0.0';
        this.initializationPromise = null;
    }
    /**
     * Initialize service by loading favorites from disk
     * Must be called after construction
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            const fileData = await (0, fileStorage_1.readJsonFile)(this.FAVORITES_FILE, {
                version: this.FILE_VERSION,
                data: [],
            });
            if (isFavoritesFileFormat(fileData)) {
                this.items = fileData.data
                    .map((item) => normalizeFavoriteItem(item))
                    .filter((item) => item !== null);
                return;
            }
            // Backward compatibility: older or malformed favorites files may be stored
            // as a bare array or any other non-standard structure. Fall back safely.
            this.items = [];
        })();
        return this.initializationPromise;
    }
    /**
     * Ensure service is initialized before proceeding
     */
    async ensureInitialized() {
        if (!this.initializationPromise) {
            await this.initialize();
        }
        else {
            await this.initializationPromise;
        }
    }
    /**
     * Persist current favorites to disk
     */
    async persist() {
        await (0, fileStorage_1.writeJsonFile)(this.FAVORITES_FILE, {
            version: this.FILE_VERSION,
            data: this.items,
        });
    }
    async getAll() {
        await this.ensureInitialized();
        return [...this.items];
    }
    async add(item) {
        this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
        await this.persist();
        return item;
    }
    async remove(id) {
        this.items = this.items.filter((i) => i.id !== id);
        await this.persist();
        return id;
    }
}
exports.NativeFavoritesService = NativeFavoritesService;
//# sourceMappingURL=nativeFavoritesService.js.map