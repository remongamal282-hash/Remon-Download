"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fileStorage_1 = require("./fileStorage");
(0, vitest_1.describe)('fileStorage', () => {
    let mockFs;
    let mockApp;
    (0, vitest_1.beforeEach)(() => {
        // Create fresh mocks for each test
        mockFs = {
            mkdir: vitest_1.vi.fn().mockResolvedValue(undefined),
            readFile: vitest_1.vi.fn(),
            writeFile: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        mockApp = {
            getUserDataPath: vitest_1.vi.fn(() => '/mock/appdata'),
        };
        (0, fileStorage_1.setFileSystemOperations)(mockFs);
        (0, fileStorage_1.setAppPathProvider)(mockApp);
    });
    (0, vitest_1.afterEach)(() => {
        (0, fileStorage_1.resetToRealImplementations)();
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('getStoragePath', () => {
        (0, vitest_1.it)('should return correct path using app.getPath(userData)', () => {
            const path = (0, fileStorage_1.getStoragePath)('test.json');
            (0, vitest_1.expect)(path).toContain('remon-download');
            (0, vitest_1.expect)(path).toContain('test.json');
        });
        (0, vitest_1.it)('should handle different filenames', () => {
            const historyPath = (0, fileStorage_1.getStoragePath)('history.json');
            const settingsPath = (0, fileStorage_1.getStoragePath)('settings.json');
            (0, vitest_1.expect)(historyPath).toContain('history.json');
            (0, vitest_1.expect)(settingsPath).toContain('settings.json');
            (0, vitest_1.expect)(historyPath).not.toBe(settingsPath);
        });
    });
    (0, vitest_1.describe)('ensureStorageDirectory', () => {
        (0, vitest_1.it)('should create directory with recursive option', async () => {
            await (0, fileStorage_1.ensureStorageDirectory)();
            (0, vitest_1.expect)(mockFs.mkdir).toHaveBeenCalledWith(vitest_1.expect.stringContaining('remon-download'), { recursive: true });
        });
        (0, vitest_1.it)('should not throw if directory already exists', async () => {
            mockFs.mkdir = vitest_1.vi.fn().mockResolvedValue(undefined);
            await (0, vitest_1.expect)((0, fileStorage_1.ensureStorageDirectory)()).resolves.not.toThrow();
        });
        (0, vitest_1.it)('should propagate mkdir errors', async () => {
            const error = new Error('Permission denied');
            mockFs.mkdir = vitest_1.vi.fn().mockRejectedValue(error);
            await (0, vitest_1.expect)((0, fileStorage_1.ensureStorageDirectory)()).rejects.toThrow('Permission denied');
        });
    });
    (0, vitest_1.describe)('readJsonFile', () => {
        (0, vitest_1.it)('should read and parse valid JSON file', async () => {
            const mockData = { version: '1.0.0', data: [{ id: '1', name: 'test' }] };
            mockFs.readFile = vitest_1.vi.fn().mockResolvedValue(JSON.stringify(mockData));
            const result = await (0, fileStorage_1.readJsonFile)('test.json', { version: '1.0.0', data: [] });
            (0, vitest_1.expect)(mockFs.readFile).toHaveBeenCalledWith(vitest_1.expect.stringContaining('test.json'), 'utf-8');
            (0, vitest_1.expect)(result).toEqual(mockData);
        });
        (0, vitest_1.it)('should return fallback if file does not exist (ENOENT)', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            mockFs.readFile = vitest_1.vi.fn().mockRejectedValue(error);
            const fallback = { version: '1.0.0', data: [] };
            const result = await (0, fileStorage_1.readJsonFile)('missing.json', fallback);
            (0, vitest_1.expect)(result).toEqual(fallback);
        });
        (0, vitest_1.it)('should return fallback if JSON is invalid', async () => {
            mockFs.readFile = vitest_1.vi.fn().mockResolvedValue('{ invalid json');
            const fallback = { version: '1.0.0', data: [] };
            const result = await (0, fileStorage_1.readJsonFile)('corrupt.json', fallback);
            (0, vitest_1.expect)(result).toEqual(fallback);
        });
        (0, vitest_1.it)('should throw on read errors other than ENOENT', async () => {
            const error = new Error('Permission denied');
            error.code = 'EACCES';
            mockFs.readFile = vitest_1.vi.fn().mockRejectedValue(error);
            const fallback = { version: '1.0.0', data: [] };
            await (0, vitest_1.expect)((0, fileStorage_1.readJsonFile)('test.json', fallback)).rejects.toThrow('Permission denied');
        });
        (0, vitest_1.it)('should handle empty file with fallback', async () => {
            mockFs.readFile = vitest_1.vi.fn().mockResolvedValue('');
            const fallback = { version: '1.0.0', data: [] };
            const result = await (0, fileStorage_1.readJsonFile)('empty.json', fallback);
            (0, vitest_1.expect)(result).toEqual(fallback);
        });
        (0, vitest_1.it)('should parse array data correctly', async () => {
            const mockData = [{ id: '1' }, { id: '2' }];
            mockFs.readFile = vitest_1.vi.fn().mockResolvedValue(JSON.stringify(mockData));
            const result = await (0, fileStorage_1.readJsonFile)('array.json', []);
            (0, vitest_1.expect)(result).toEqual(mockData);
            (0, vitest_1.expect)(Array.isArray(result)).toBe(true);
        });
    });
    (0, vitest_1.describe)('writeJsonFile', () => {
        (0, vitest_1.it)('should ensure directory exists before writing', async () => {
            const data = { version: '1.0.0', data: [{ id: '1' }] };
            await (0, fileStorage_1.writeJsonFile)('test.json', data);
            (0, vitest_1.expect)(mockFs.mkdir).toHaveBeenCalledWith(vitest_1.expect.stringContaining('remon-download'), { recursive: true });
        });
        (0, vitest_1.it)('should write JSON data with pretty formatting', async () => {
            const data = { version: '1.0.0', data: [{ id: '1', name: 'test' }] };
            await (0, fileStorage_1.writeJsonFile)('test.json', data);
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledWith(vitest_1.expect.stringContaining('test.json'), JSON.stringify(data, null, 2), 'utf-8');
        });
        (0, vitest_1.it)('should handle empty objects', async () => {
            const data = {};
            await (0, fileStorage_1.writeJsonFile)('empty.json', data);
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledWith(vitest_1.expect.any(String), JSON.stringify(data, null, 2), 'utf-8');
        });
        (0, vitest_1.it)('should handle arrays', async () => {
            const data = [{ id: '1' }, { id: '2' }];
            await (0, fileStorage_1.writeJsonFile)('array.json', data);
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledWith(vitest_1.expect.any(String), JSON.stringify(data, null, 2), 'utf-8');
        });
        (0, vitest_1.it)('should propagate write errors', async () => {
            const error = new Error('Disk full');
            mockFs.writeFile = vitest_1.vi.fn().mockRejectedValue(error);
            const data = { version: '1.0.0', data: [] };
            await (0, vitest_1.expect)((0, fileStorage_1.writeJsonFile)('test.json', data)).rejects.toThrow('Disk full');
        });
        (0, vitest_1.it)('should propagate directory creation errors', async () => {
            const error = new Error('Permission denied');
            mockFs.mkdir = vitest_1.vi.fn().mockRejectedValue(error);
            const data = { version: '1.0.0', data: [] };
            await (0, vitest_1.expect)((0, fileStorage_1.writeJsonFile)('test.json', data)).rejects.toThrow('Permission denied');
        });
    });
    (0, vitest_1.describe)('integration scenarios', () => {
        (0, vitest_1.it)('should write and read back the same data', async () => {
            const originalData = {
                version: '1.0.0',
                data: [
                    { id: '1', title: 'Test 1' },
                    { id: '2', title: 'Test 2' },
                ],
            };
            // Simulate write
            let writtenData = '';
            mockFs.writeFile = vitest_1.vi.fn().mockImplementation(async (path, data) => {
                writtenData = data;
            });
            await (0, fileStorage_1.writeJsonFile)('test.json', originalData);
            // Simulate read
            mockFs.readFile = vitest_1.vi.fn().mockResolvedValue(writtenData);
            const readData = await (0, fileStorage_1.readJsonFile)('test.json', { version: '1.0.0', data: [] });
            (0, vitest_1.expect)(readData).toEqual(originalData);
        });
        (0, vitest_1.it)('should handle multiple files independently', async () => {
            const historyData = { version: '1.0.0', data: [{ id: '1' }] };
            const favoritesData = { version: '1.0.0', data: [{ id: '2' }] };
            await (0, fileStorage_1.writeJsonFile)('history.json', historyData);
            await (0, fileStorage_1.writeJsonFile)('favorites.json', favoritesData);
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledWith(vitest_1.expect.stringContaining('history.json'), vitest_1.expect.any(String), 'utf-8');
            (0, vitest_1.expect)(mockFs.writeFile).toHaveBeenCalledWith(vitest_1.expect.stringContaining('favorites.json'), vitest_1.expect.any(String), 'utf-8');
        });
    });
});
//# sourceMappingURL=fileStorage.test.js.map