"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nativeHistoryService_1 = require("./nativeHistoryService");
const fileStorage = __importStar(require("../utils/fileStorage"));
// Mock fileStorage module
vitest_1.vi.mock('../utils/fileStorage', () => ({
    readJsonFile: vitest_1.vi.fn(),
    writeJsonFile: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('NativeHistoryService', () => {
    let service;
    let mockReadJsonFile;
    let mockWriteJsonFile;
    (0, vitest_1.beforeEach)(() => {
        mockReadJsonFile = vitest_1.vi.mocked(fileStorage.readJsonFile);
        mockWriteJsonFile = vitest_1.vi.mocked(fileStorage.writeJsonFile);
        // Default: empty history file
        mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
        mockWriteJsonFile.mockResolvedValue(undefined);
        service = new nativeHistoryService_1.NativeHistoryService();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should load history from file on construction', async () => {
            const mockData = [
                {
                    id: '1',
                    sourceDownloadId: 'dl-1',
                    metadataId: 'meta-1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    title: 'Video 1',
                    sourceUrl: 'https://example.com/video1',
                    date: '2024-01-01T12:00:00.000Z',
                    quality: '720p',
                    format: 'mp4',
                    fileSize: 1024000,
                    status: 'completed',
                },
                {
                    id: '2',
                    sourceDownloadId: 'dl-2',
                    metadataId: 'meta-2',
                    thumbnail: 'https://example.com/thumb2.jpg',
                    title: 'Video 2',
                    sourceUrl: 'https://example.com/video2',
                    date: '2024-01-02T12:00:00.000Z',
                    quality: '1080p',
                    format: 'webm',
                    fileSize: 2048000,
                    status: 'failed',
                    errorMessage: 'Network error',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            const newService = new nativeHistoryService_1.NativeHistoryService();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledWith('history.json', {
                version: '1.0.0',
                data: [],
            });
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual(mockData);
        });
        (0, vitest_1.it)('should start with empty array if file does not exist', async () => {
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
            const newService = new nativeHistoryService_1.NativeHistoryService();
            await newService.initialize();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
        (0, vitest_1.it)('should handle file read errors gracefully', async () => {
            mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));
            const newService = new nativeHistoryService_1.NativeHistoryService();
            await (0, vitest_1.expect)(newService.initialize()).rejects.toThrow('Permission denied');
        });
        (0, vitest_1.it)('should handle legacy JSON files by mapping property fallbacks', async () => {
            // Legacy item has 'url' instead of 'sourceUrl', and 'size' instead of 'fileSize'
            const legacyData = [
                {
                    id: 'legacy-1',
                    url: 'https://example.com/legacy',
                    title: 'Legacy Title',
                    size: 5000,
                    status: 'completed',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: legacyData });
            const newService = new nativeHistoryService_1.NativeHistoryService();
            await newService.initialize();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toHaveLength(1);
            (0, vitest_1.expect)(items[0].sourceUrl).toBe('https://example.com/legacy');
            (0, vitest_1.expect)(items[0].fileSize).toBe(5000);
        });
    });
    (0, vitest_1.describe)('getAll', () => {
        (0, vitest_1.it)('should return all history items', async () => {
            const mockData = [
                {
                    id: '1',
                    sourceDownloadId: 'dl-1',
                    metadataId: 'meta-1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    title: 'Video 1',
                    sourceUrl: 'https://example.com/video1',
                    date: '2024-01-01T12:00:00.000Z',
                    quality: '720p',
                    format: 'mp4',
                    fileSize: 1024000,
                    status: 'completed',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            await service.initialize();
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual(mockData);
        });
        (0, vitest_1.it)('should return a copy of items array', async () => {
            const mockData = [
                {
                    id: '1',
                    sourceDownloadId: 'dl-1',
                    metadataId: 'meta-1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    title: 'Video 1',
                    sourceUrl: 'https://example.com/video1',
                    date: '2024-01-01T12:00:00.000Z',
                    quality: '720p',
                    format: 'mp4',
                    fileSize: 1024000,
                    status: 'completed',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            await service.initialize();
            const items1 = await service.getAll();
            const items2 = await service.getAll();
            (0, vitest_1.expect)(items1).toEqual(items2);
            (0, vitest_1.expect)(items1).not.toBe(items2);
        });
    });
    (0, vitest_1.describe)('add', () => {
        (0, vitest_1.it)('should add new item to history and persist to file', async () => {
            await service.initialize();
            const newItem = {
                id: '1',
                sourceDownloadId: 'dl-1',
                metadataId: 'meta-1',
                thumbnail: 'https://example.com/thumb1.jpg',
                title: 'Video 1',
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01T12:00:00.000Z',
                quality: '720p',
                format: 'mp4',
                fileSize: 1024000,
                status: 'completed',
            };
            const result = await service.add(newItem);
            (0, vitest_1.expect)(result).toEqual(newItem);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
                version: '1.0.0',
                data: [newItem],
            });
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([newItem]);
        });
        (0, vitest_1.it)('should replace existing item with same id', async () => {
            const existingItem = {
                id: '1',
                sourceDownloadId: 'dl-1',
                metadataId: 'meta-1',
                thumbnail: 'https://example.com/thumb1.jpg',
                title: 'Video 1',
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01T12:00:00.000Z',
                quality: '720p',
                format: 'mp4',
                fileSize: 1024000,
                status: 'completed',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [existingItem],
            });
            await service.initialize();
            const updatedItem = {
                ...existingItem,
                title: 'Video 1 Updated',
            };
            await service.add(updatedItem);
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toHaveLength(1);
            (0, vitest_1.expect)(items[0]).toEqual(updatedItem);
        });
        (0, vitest_1.it)('should persist to file after adding', async () => {
            await service.initialize();
            mockWriteJsonFile.mockClear();
            const newItem = {
                id: '1',
                sourceDownloadId: 'dl-1',
                metadataId: 'meta-1',
                thumbnail: 'https://example.com/thumb1.jpg',
                title: 'Video 1',
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01T12:00:00.000Z',
                quality: '720p',
                format: 'mp4',
                fileSize: 1024000,
                status: 'completed',
            };
            await service.add(newItem);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    (0, vitest_1.describe)('remove', () => {
        (0, vitest_1.it)('should remove item by id and persist to file', async () => {
            const item1 = {
                id: '1',
                sourceDownloadId: 'dl-1',
                metadataId: 'meta-1',
                thumbnail: 'https://example.com/thumb1.jpg',
                title: 'Video 1',
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01T12:00:00.000Z',
                quality: '720p',
                format: 'mp4',
                fileSize: 1024000,
                status: 'completed',
            };
            const item2 = {
                id: '2',
                sourceDownloadId: 'dl-2',
                metadataId: 'meta-2',
                thumbnail: 'https://example.com/thumb2.jpg',
                title: 'Video 2',
                sourceUrl: 'https://example.com/video2',
                date: '2024-01-02T12:00:00.000Z',
                quality: '1080p',
                format: 'webm',
                fileSize: 2048000,
                status: 'failed',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [item1, item2],
            });
            await service.initialize();
            const removedId = await service.remove('1');
            (0, vitest_1.expect)(removedId).toBe('1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
                version: '1.0.0',
                data: [item2],
            });
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([item2]);
        });
        (0, vitest_1.it)('should return id even if item does not exist', async () => {
            await service.initialize();
            const removedId = await service.remove('nonexistent');
            (0, vitest_1.expect)(removedId).toBe('nonexistent');
        });
    });
    (0, vitest_1.describe)('clear', () => {
        (0, vitest_1.it)('should clear all items and persist to file', async () => {
            const item1 = {
                id: '1',
                sourceDownloadId: 'dl-1',
                metadataId: 'meta-1',
                thumbnail: 'https://example.com/thumb1.jpg',
                title: 'Video 1',
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01T12:00:00.000Z',
                quality: '720p',
                format: 'mp4',
                fileSize: 1024000,
                status: 'completed',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [item1],
            });
            await service.initialize();
            await service.clear();
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
                version: '1.0.0',
                data: [],
            });
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
    });
});
//# sourceMappingURL=nativeHistoryService.test.js.map