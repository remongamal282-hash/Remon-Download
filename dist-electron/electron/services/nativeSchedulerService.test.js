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
const nativeSchedulerService_1 = require("./nativeSchedulerService");
const fileStorage = __importStar(require("../utils/fileStorage"));
// Mock fileStorage module
vitest_1.vi.mock('../utils/fileStorage', () => ({
    readJsonFile: vitest_1.vi.fn(),
    writeJsonFile: vitest_1.vi.fn(),
}));
// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeItem(overrides = {}) {
    return {
        id: 'sched-1',
        sourceUrl: 'https://example.com/video1',
        date: '2024-01-01',
        time: '14:30',
        repeat: 'once',
        status: 'scheduled',
        nextRunAt: '2024-01-01T14:30:00.000Z',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
        ...overrides,
    };
}
// ─── Tests ────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('NativeSchedulerService', () => {
    let service;
    let mockReadJsonFile;
    let mockWriteJsonFile;
    (0, vitest_1.beforeEach)(() => {
        mockReadJsonFile = vitest_1.vi.mocked(fileStorage.readJsonFile);
        mockWriteJsonFile = vitest_1.vi.mocked(fileStorage.writeJsonFile);
        // Default: empty scheduler file
        mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
        mockWriteJsonFile.mockResolvedValue(undefined);
        service = new nativeSchedulerService_1.NativeSchedulerService();
    });
    // ─── initialization ───────────────────────────────────────────────────────
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should load scheduler from file on initialize()', async () => {
            const mockData = [
                makeItem({ id: 'sched-1', repeat: 'once', status: 'scheduled' }),
                makeItem({ id: 'sched-2', time: '09:00', repeat: 'daily', status: 'scheduled', triggerCount: 5 }),
            ];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledWith('scheduler.json', {
                version: '1.0.0',
                data: [],
            });
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual(mockData);
        });
        (0, vitest_1.it)('should start with empty array if file does not exist', async () => {
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            await newService.initialize();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
        (0, vitest_1.it)('should handle file read errors by propagating', async () => {
            mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            await (0, vitest_1.expect)(newService.initialize()).rejects.toThrow('Permission denied');
        });
        (0, vitest_1.it)('should fall back to empty array for legacy/corrupted (non-object) JSON', async () => {
            // Array instead of { version, data } object
            mockReadJsonFile.mockResolvedValue([makeItem()]);
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            await (0, vitest_1.expect)(newService.initialize()).resolves.toBeUndefined();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
        });
        (0, vitest_1.it)('should normalize items with unknown status to "scheduled"', async () => {
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: [{
                        id: 'sched-bad', sourceUrl: 'https://x.com', date: '2024-01-01', time: '10:00',
                        repeat: 'once', status: 'INVALID_STATUS', nextRunAt: '2024-01-01T10:00:00Z',
                        createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', triggerCount: 0
                    }],
            });
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            await newService.initialize();
            const [item] = await newService.getAll();
            (0, vitest_1.expect)(item.status).toBe('scheduled');
        });
        (0, vitest_1.it)('should be idempotent — calling initialize() twice reads file only once', async () => {
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            mockReadJsonFile.mockClear();
            await newService.initialize();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should lazy-initialize on first getAll() without explicit initialize()', async () => {
            const newService = new nativeSchedulerService_1.NativeSchedulerService();
            mockReadJsonFile.mockClear();
            const items = await newService.getAll();
            (0, vitest_1.expect)(items).toEqual([]);
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    // ─── getAll ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('getAll', () => {
        (0, vitest_1.it)('should return all scheduled items', async () => {
            const mockData = [makeItem()];
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
            await service.initialize();
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual(mockData);
        });
        (0, vitest_1.it)('should return a copy of items array (not the same reference)', async () => {
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [makeItem()] });
            await service.initialize();
            const items1 = await service.getAll();
            const items2 = await service.getAll();
            (0, vitest_1.expect)(items1).toEqual(items2);
            (0, vitest_1.expect)(items1).not.toBe(items2);
        });
    });
    // ─── create ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should create a new scheduled item and persist to file', async () => {
            await service.initialize();
            const input = {
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01',
                time: '14:30',
                repeat: 'once',
                status: 'scheduled',
                nextRunAt: '2024-01-01T14:30:00.000Z',
            };
            const result = await service.create(input);
            (0, vitest_1.expect)(result).toMatchObject(input);
            (0, vitest_1.expect)(result.id).toMatch(/^sched-/);
            (0, vitest_1.expect)(result.createdAt).toBeDefined();
            (0, vitest_1.expect)(result.updatedAt).toBeDefined();
            (0, vitest_1.expect)(result.triggerCount).toBe(0);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
                version: '1.0.0',
                data: [result],
            });
        });
        (0, vitest_1.it)('should add new item to beginning of list', async () => {
            const existingItem = makeItem({ id: 'sched-1' });
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [existingItem] });
            await service.initialize();
            const input = {
                sourceUrl: 'https://example.com/video2',
                date: '2024-01-02',
                time: '09:00',
                repeat: 'daily',
                status: 'scheduled',
                nextRunAt: '2024-01-02T09:00:00.000Z',
            };
            const result = await service.create(input);
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toHaveLength(2);
            (0, vitest_1.expect)(items[0]).toEqual(result);
            (0, vitest_1.expect)(items[1]).toEqual(existingItem);
        });
        (0, vitest_1.it)('should persist exactly once per create call', async () => {
            await service.initialize();
            mockWriteJsonFile.mockClear();
            await service.create({
                sourceUrl: 'https://example.com/video1',
                date: '2024-01-01',
                time: '14:30',
                repeat: 'once',
                status: 'scheduled',
                nextRunAt: '2024-01-01T14:30:00.000Z',
            });
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should trigger due scheduled downloads automatically', async () => {
            const dueAt = new Date(Date.now() - 60000).toISOString();
            const item = makeItem({ id: 'sched-trigger', nextRunAt: dueAt, repeat: 'once', status: 'scheduled' });
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [item] });
            await service.initialize();
            const result = await service.tick(Date.now());
            (0, vitest_1.expect)(result.triggered).toHaveLength(1);
            (0, vitest_1.expect)(result.triggered[0].schedule.status).toBe('triggered');
            (0, vitest_1.expect)(result.items[0].status).toBe('triggered');
            (0, vitest_1.expect)(result.items[0].triggerCount).toBe(1);
        });
    });
    // ─── update ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('update', () => {
        (0, vitest_1.it)('should update existing item and persist to file', async () => {
            const existingItem = makeItem({ status: 'scheduled', time: '14:30' });
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [existingItem] });
            await service.initialize();
            const updatedInput = { ...existingItem, time: '15:00', status: 'scheduled' };
            const result = await service.update(updatedInput);
            (0, vitest_1.expect)(result.time).toBe('15:00');
            (0, vitest_1.expect)(result.updatedAt).not.toBe(existingItem.updatedAt);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', vitest_1.expect.objectContaining({ version: '1.0.0' }));
        });
        (0, vitest_1.it)('should persist exactly once per update call', async () => {
            const existingItem = makeItem();
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [existingItem] });
            await service.initialize();
            mockWriteJsonFile.mockClear();
            await service.update({ ...existingItem, time: '15:00' });
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    // ─── cancel ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('cancel', () => {
        (0, vitest_1.it)('should cancel item and persist to file', async () => {
            const existingItem = makeItem({ status: 'scheduled' });
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [existingItem] });
            await service.initialize();
            const result = await service.cancel('sched-1');
            (0, vitest_1.expect)(result.status).toBe('canceled');
            (0, vitest_1.expect)(result.updatedAt).not.toBe(existingItem.updatedAt);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', vitest_1.expect.objectContaining({ version: '1.0.0' }));
        });
        (0, vitest_1.it)('should throw if item not found', async () => {
            await service.initialize();
            await (0, vitest_1.expect)(service.cancel('nonexistent')).rejects.toThrow('Scheduled item not found: nonexistent');
        });
        (0, vitest_1.it)('should persist exactly once per cancel call', async () => {
            const existingItem = makeItem();
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [existingItem] });
            await service.initialize();
            mockWriteJsonFile.mockClear();
            await service.cancel('sched-1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    // ─── remove ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('remove', () => {
        (0, vitest_1.it)('should remove item by id and persist to file', async () => {
            const item1 = makeItem({ id: 'sched-1' });
            const item2 = makeItem({ id: 'sched-2', time: '09:00', repeat: 'daily' });
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [item1, item2] });
            await service.initialize();
            const removedId = await service.remove('sched-1');
            (0, vitest_1.expect)(removedId).toBe('sched-1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
                version: '1.0.0',
                data: [item2],
            });
            const items = await service.getAll();
            (0, vitest_1.expect)(items).toEqual([item2]);
        });
        (0, vitest_1.it)('should return id even if item does not exist (no-op remove)', async () => {
            await service.initialize();
            const removedId = await service.remove('nonexistent');
            (0, vitest_1.expect)(removedId).toBe('nonexistent');
        });
        (0, vitest_1.it)('should persist exactly once per remove call', async () => {
            const item = makeItem();
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [item] });
            await service.initialize();
            mockWriteJsonFile.mockClear();
            await service.remove('sched-1');
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
                version: '1.0.0',
                data: [],
            });
        });
    });
});
//# sourceMappingURL=nativeSchedulerService.test.js.map