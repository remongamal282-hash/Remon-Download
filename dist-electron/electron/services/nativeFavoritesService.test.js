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
const nativeFavoritesService_1 = require("./nativeFavoritesService");
const fileStorage = __importStar(require("../utils/fileStorage"));
// Mock fileStorage module
vitest_1.vi.mock('../utils/fileStorage', () => ({
    readJsonFile: vitest_1.vi.fn(),
    writeJsonFile: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('NativeFavoritesService', () => {
    let service;
    let mockReadJsonFile;
    let mockWriteJsonFile;
    (0, vitest_1.beforeEach)(() => {
        mockReadJsonFile = vitest_1.vi.mocked(fileStorage.readJsonFile);
        mockWriteJsonFile = vitest_1.vi.mocked(fileStorage.writeJsonFile);
        // Default: empty favorites file
        mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
        mockWriteJsonFile.mockResolvedValue(undefined);
        service = new nativeFavoritesService_1.NativeFavoritesService();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should load favorites from file on construction', async () => {
            const mockData = [
                {
                    id: '1',
                    sourceUrl: 'https://example.com/video1',
                    title: 'Video 1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    channel: 'Channel 1',
                    dateAdded: '2024-01-01T00:00:00.000Z',
                },
                {
                    id: '2',
                    sourceUrl: 'https://example.com/video2',
                    title: 'Video 2',
                    thumbnail: 'https://example.com/thumb2.jpg',
                    channel: 'Channel 2',
                    dateAdded: '2024-01-02T00:00:00.000Z',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledWith('favorites.json', {
                version: '1.0.0',
                data: [],
            });
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual(mockData);
        });
        (0, vitest_1.it)('should start with empty array if file does not exist', async () => {
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await newService.initialize();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
        (0, vitest_1.it)('should ignore legacy array-shaped favorites file and fall back to empty state', async () => {
            mockReadJsonFile.mockResolvedValue([
                {
                    id: 'legacy-1',
                    sourceUrl: 'https://example.com/legacy',
                    title: 'Legacy Favorite',
                    thumbnail: 'https://example.com/legacy.jpg',
                    channel: 'Legacy Channel',
                    dateAdded: '2024-01-01T00:00:00.000Z',
                },
            ]);
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await (0, vitest_1.expect)(newService.initialize()).resolves.toBeUndefined();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
        (0, vitest_1.it)('should normalize invalid dateAdded values from disk before rendering', async () => {
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [
                    {
                        id: 'broken-date',
                        sourceUrl: 'https://example.com/broken',
                        title: 'Broken Favorite',
                        thumbnail: 'https://example.com/broken.jpg',
                        channel: 'Broken Channel',
                        dateAdded: 'not-a-valid-date',
                    },
                ],
            });
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await newService.initialize();
            const [favorite] = await newService.getAll();
            (0, vitest_1.expect)(favorite.dateAdded).toBeTypeOf('string');
            (0, vitest_1.expect)(Number.isNaN(new Date(favorite.dateAdded).getTime())).toBe(false);
        });
        (0, vitest_1.it)('should handle file read errors gracefully', async () => {
            mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await (0, vitest_1.expect)(newService.initialize()).rejects.toThrow('Permission denied');
        });
    });
    (0, vitest_1.describe)('getAll', () => {
        (0, vitest_1.it)('should return all favorite items', async () => {
            const mockData = [
                {
                    id: '1',
                    sourceUrl: 'https://example.com/video1',
                    title: 'Video 1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    channel: 'Channel 1',
                    dateAdded: '2024-01-01T00:00:00.000Z',
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
                    sourceUrl: 'https://example.com/video1',
                    title: 'Video 1',
                    thumbnail: 'https://example.com/thumb1.jpg',
                    channel: 'Channel 1',
                    dateAdded: '2024-01-01T00:00:00.000Z',
                },
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            await service.initialize();
            const items1 = await service.getAll();
            const items2 = await service.getAll();
            (0, vitest_1.expect)(items1).toEqual(items2);
            (0, vitest_1.expect)(items1).not.toBe(items2); // Different array instances
        });
    });
    (0, vitest_1.describe)('add', () => {
        (0, vitest_1.it)('should add new item to favorites and persist to file', async () => {
            await service.initialize();
            const newItem = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
            };
            const result = await service.add(newItem);
            (0, vitest_1.expect)(result).toEqual(newItem);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('favorites.json', {
                version: '1.0.0',
                data: [newItem],
            });
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([newItem]);
        });
        (0, vitest_1.it)('should add new item to beginning of list', async () => {
            const existingItem = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [existingItem],
            });
            await service.initialize();
            const newItem = {
                id: '2',
                sourceUrl: 'https://example.com/video2',
                title: 'Video 2',
                thumbnail: 'https://example.com/thumb2.jpg',
                channel: 'Channel 2',
                dateAdded: '2024-01-02T00:00:00.000Z',
            };
            await service.add(newItem);
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([newItem, existingItem]);
        });
        (0, vitest_1.it)('should replace existing item with same id', async () => {
            const existingItem = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
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
            // Clear mock call history after initialize
            mockWriteJsonFile.mockClear();
            const newItem = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
            };
            await service.add(newItem);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('favorites.json', {
                version: '1.0.0',
                data: [newItem],
            });
        });
    });
    (0, vitest_1.describe)('remove', () => {
        (0, vitest_1.it)('should remove item by id and persist to file', async () => {
            const item1 = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
            };
            const item2 = {
                id: '2',
                sourceUrl: 'https://example.com/video2',
                title: 'Video 2',
                thumbnail: 'https://example.com/thumb2.jpg',
                channel: 'Channel 2',
                dateAdded: '2024-01-02T00:00:00.000Z',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [item1, item2],
            });
            await service.initialize();
            const removedId = await service.remove('1');
            (0, vitest_1.expect)(removedId).toBe('1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('favorites.json', {
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
        (0, vitest_1.it)('should persist to file after removing', async () => {
            const item = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Channel 1',
                dateAdded: '2024-01-01T00:00:00.000Z',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [item],
            });
            await service.initialize();
            // Clear mock call history after initialize
            mockWriteJsonFile.mockClear();
            await service.remove('1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('favorites.json', {
                version: '1.0.0',
                data: [],
            });
        });
    });
    (0, vitest_1.describe)('persistence', () => {
        (0, vitest_1.it)('should serialize and deserialize dates correctly', async () => {
            const item = {
                id: '1',
                sourceUrl: 'https://example.com/video1',
                title: 'Video 1',
                thumbnail: 'https://example.com/thumb1.jpg',
                channel: 'Test Channel',
                dateAdded: '2024-01-01T12:00:00.000Z',
            };
            await service.initialize();
            await service.add(item);
            // Verify writeJsonFile was called
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalled();
            // Simulate reading back
            const serializedData = {
                version: '1.0.0',
                data: [item],
            };
            mockReadJsonFile.mockResolvedValue(serializedData);
            const newService = new nativeFavoritesService_1.NativeFavoritesService();
            await newService.initialize();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items[0].dateAdded).toBe('2024-01-01T12:00:00.000Z');
        });
    });
});
//# sourceMappingURL=nativeFavoritesService.test.js.map