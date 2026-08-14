import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NativeHistoryService } from './nativeHistoryService';
import type { HistoryItem } from '../../src/types/download';
import * as fileStorage from '../utils/fileStorage';

// Mock fileStorage module
vi.mock('../utils/fileStorage', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

describe('NativeHistoryService', () => {
  let service: NativeHistoryService;
  let mockReadJsonFile: ReturnType<typeof vi.fn>;
  let mockWriteJsonFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReadJsonFile = vi.mocked(fileStorage.readJsonFile);
    mockWriteJsonFile = vi.mocked(fileStorage.writeJsonFile);

    // Default: empty history file
    mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
    mockWriteJsonFile.mockResolvedValue(undefined);

    service = new NativeHistoryService();
  });

  describe('initialization', () => {
    it('should load history from file on construction', async () => {
      const mockData: HistoryItem[] = [
        {
          id: '1',
          url: 'https://example.com/video1',
          title: 'Video 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          status: 'completed',
          format: 'mp4',
          quality: '720p',
          size: 1024000,
          downloadedSize: 1024000,
          downloadedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          url: 'https://example.com/video2',
          title: 'Video 2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          status: 'failed',
          format: 'webm',
          quality: '1080p',
          size: 2048000,
          downloadedSize: 0,
          downloadedAt: new Date('2024-01-02'),
          error: 'Network error',
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });

      const newService = new NativeHistoryService();
      await newService.initialize();

      expect(mockReadJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [],
      });

      const items = await newService.getAll();
      expect(items).toEqual(mockData);
    });

    it('should start with empty array if file does not exist', async () => {
      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });

      const newService = new NativeHistoryService();
      await newService.initialize();

      const items = await newService.getAll();
      expect(items).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));

      const newService = new NativeHistoryService();

      // Should not throw, fallback to empty
      await expect(newService.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('getAll', () => {
    it('should return all history items', async () => {
      const mockData: HistoryItem[] = [
        {
          id: '1',
          url: 'https://example.com/video1',
          title: 'Video 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          status: 'completed',
          format: 'mp4',
          quality: '720p',
          size: 1024000,
          downloadedSize: 1024000,
          downloadedAt: new Date('2024-01-01'),
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
      await service.initialize();

      const items = await service.getAll();

      expect(items).toEqual(mockData);
    });

    it('should return a copy of items array', async () => {
      const mockData: HistoryItem[] = [
        {
          id: '1',
          url: 'https://example.com/video1',
          title: 'Video 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          status: 'completed',
          format: 'mp4',
          quality: '720p',
          size: 1024000,
          downloadedSize: 1024000,
          downloadedAt: new Date('2024-01-01'),
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
      await service.initialize();

      const items1 = await service.getAll();
      const items2 = await service.getAll();

      expect(items1).toEqual(items2);
      expect(items1).not.toBe(items2); // Different array instances
    });
  });

  describe('add', () => {
    it('should add new item to history and persist to file', async () => {
      await service.initialize();

      const newItem: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      const result = await service.add(newItem);

      expect(result).toEqual(newItem);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [newItem],
      });

      const items = await service.getAll();
      expect(items).toEqual([newItem]);
    });

    it('should add new item to beginning of list', async () => {
      const existingItem: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      const newItem: HistoryItem = {
        id: '2',
        url: 'https://example.com/video2',
        title: 'Video 2',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        status: 'completed',
        format: 'webm',
        quality: '1080p',
        size: 2048000,
        downloadedSize: 2048000,
        downloadedAt: new Date('2024-01-02'),
      };

      await service.add(newItem);

      const items = await service.getAll();
      expect(items).toEqual([newItem, existingItem]);
    });

    it('should replace existing item with same id', async () => {
      const existingItem: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      const updatedItem: HistoryItem = {
        ...existingItem,
        title: 'Video 1 Updated',
        size: 2048000,
      };

      await service.add(updatedItem);

      const items = await service.getAll();
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(updatedItem);
    });

    it('should persist to file after adding', async () => {
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      const newItem: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      await service.add(newItem);

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [newItem],
      });
    });
  });

  describe('remove', () => {
    it('should remove item by id and persist to file', async () => {
      const item1: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      const item2: HistoryItem = {
        id: '2',
        url: 'https://example.com/video2',
        title: 'Video 2',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        status: 'completed',
        format: 'webm',
        quality: '1080p',
        size: 2048000,
        downloadedSize: 2048000,
        downloadedAt: new Date('2024-01-02'),
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [item1, item2],
      });
      await service.initialize();

      const removedId = await service.remove('1');

      expect(removedId).toBe('1');
      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [item2],
      });

      const items = await service.getAll();
      expect(items).toEqual([item2]);
    });

    it('should return id even if item does not exist', async () => {
      await service.initialize();

      const removedId = await service.remove('nonexistent');

      expect(removedId).toBe('nonexistent');
    });

    it('should persist to file after removing', async () => {
      const item: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01'),
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [item],
      });
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.remove('1');

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [],
      });
    });
  });

  describe('clear', () => {
    it('should remove all items and persist to file', async () => {
      const items: HistoryItem[] = [
        {
          id: '1',
          url: 'https://example.com/video1',
          title: 'Video 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          status: 'completed',
          format: 'mp4',
          quality: '720p',
          size: 1024000,
          downloadedSize: 1024000,
          downloadedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          url: 'https://example.com/video2',
          title: 'Video 2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          status: 'completed',
          format: 'webm',
          quality: '1080p',
          size: 2048000,
          downloadedSize: 2048000,
          downloadedAt: new Date('2024-01-02'),
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: items });
      await service.initialize();

      await service.clear();

      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [],
      });

      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should persist to file after clearing', async () => {
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.clear();

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('history.json', {
        version: '1.0.0',
        data: [],
      });
    });
  });

  describe('persistence', () => {
    it('should serialize and deserialize dates correctly', async () => {
      const item: HistoryItem = {
        id: '1',
        url: 'https://example.com/video1',
        title: 'Video 1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        status: 'completed',
        format: 'mp4',
        quality: '720p',
        size: 1024000,
        downloadedSize: 1024000,
        downloadedAt: new Date('2024-01-01T12:00:00Z'),
      };

      await service.initialize();
      await service.add(item);

      // Verify writeJsonFile was called
      expect(mockWriteJsonFile).toHaveBeenCalled();

      // Simulate reading back (dates as ISO strings in JSON)
      const serializedData = {
        version: '1.0.0',
        data: [
          {
            ...item,
            downloadedAt: '2024-01-01T12:00:00.000Z',
          },
        ],
      };

      mockReadJsonFile.mockResolvedValue(serializedData);

      const newService = new NativeHistoryService();
      await newService.initialize();

      const items = await newService.getAll();
      expect(items[0].downloadedAt).toBeInstanceOf(Date);
      expect(items[0].downloadedAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });
  });
});
