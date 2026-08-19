"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyService = exports.MockHistoryService = void 0;
class MockHistoryService {
    constructor() {
        this.items = [];
        this.nextError = null;
    }
    async getAll() {
        await this.delay();
        this.throwIfNeeded();
        return [...this.items];
    }
    async add(item) {
        await this.delay();
        this.throwIfNeeded();
        this.items = [item, ...this.items.filter((existingItem) => existingItem.id !== item.id)];
        return item;
    }
    async addFromDownload(item, now) {
        const historyItem = {
            id: `history-${item.id}`,
            sourceDownloadId: item.id,
            metadataId: item.metadataId,
            thumbnail: item.thumbnail,
            title: item.title,
            sourceUrl: item.sourceUrl,
            date: now,
            quality: item.quality,
            format: item.format,
            fileSize: item.fileSize,
            status: item.status === "completed" ? "completed" : item.status === "failed" ? "failed" : "canceled",
            errorCode: item.errorCode,
            errorMessage: item.errorMessage
        };
        return this.add(historyItem);
    }
    async remove(id) {
        await this.delay();
        this.throwIfNeeded();
        this.items = this.items.filter((item) => item.id !== id);
    }
    async clear() {
        await this.delay();
        this.throwIfNeeded();
        this.items = [];
    }
    failNext(error) {
        this.nextError = error;
    }
    async delay() {
        await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    throwIfNeeded() {
        if (!this.nextError) {
            return;
        }
        const error = this.nextError;
        this.nextError = null;
        throw error;
    }
}
exports.MockHistoryService = MockHistoryService;
exports.historyService = new MockHistoryService();
//# sourceMappingURL=historyService.js.map