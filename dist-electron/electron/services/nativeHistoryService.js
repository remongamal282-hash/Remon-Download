"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeHistoryService = void 0;
const fileStorage_1 = require("../utils/fileStorage");
function isHistoryFileFormat(value) {
    return !!value && typeof value === 'object' && 'data' in value && Array.isArray(value.data);
}
function normalizeHistoryItem(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }
    const dateValue = typeof item.date === 'string' ? item.date : new Date().toISOString();
    return {
        id: String(item.id ?? crypto.randomUUID()),
        sourceDownloadId: String(item.sourceDownloadId ?? ''),
        metadataId: String(item.metadataId ?? ''),
        thumbnail: String(item.thumbnail ?? ''),
        title: String(item.title ?? 'Untitled Download'),
        sourceUrl: String(item.sourceUrl ?? item['url'] ?? ''), // Fallback to legacy 'url' if exists
        date: dateValue,
        quality: String(item.quality ?? 'Unknown'),
        format: String(item.format ?? 'Unknown'),
        fileSize: typeof item.fileSize === 'number' ? item.fileSize : typeof item.size === 'number' ? item.size : 0, // Fallback to legacy 'size' if exists
        status: item.status === 'completed' || item.status === 'failed' || item.status === 'canceled' ? item.status : 'completed',
        errorCode: item.errorCode,
        errorMessage: item.errorMessage ? String(item.errorMessage) : undefined,
    };
}
class NativeHistoryService {
    constructor() {
        this.items = [];
        this.HISTORY_FILE = 'history.json';
        this.FILE_VERSION = '1.0.0';
        this.initializationPromise = null;
    }
    /**
     * Initialize service by loading history from disk
     * Must be called after construction
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            const fileData = await (0, fileStorage_1.readJsonFile)(this.HISTORY_FILE, {
                version: this.FILE_VERSION,
                data: [],
            });
            if (isHistoryFileFormat(fileData)) {
                this.items = fileData.data
                    .map((item) => normalizeHistoryItem(item))
                    .filter((item) => item !== null);
                return;
            }
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
     * Persist current history to disk
     */
    async persist() {
        await (0, fileStorage_1.writeJsonFile)(this.HISTORY_FILE, {
            version: this.FILE_VERSION,
            data: this.items,
        });
    }
    async getAll() {
        await this.ensureInitialized();
        return [...this.items];
    }
    async add(item) {
        await this.ensureInitialized();
        this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
        await this.persist();
        return item;
    }
    async remove(id) {
        await this.ensureInitialized();
        this.items = this.items.filter((i) => i.id !== id);
        await this.persist();
        return id;
    }
    async clear() {
        await this.ensureInitialized();
        this.items = [];
        await this.persist();
    }
}
exports.NativeHistoryService = NativeHistoryService;
//# sourceMappingURL=nativeHistoryService.js.map