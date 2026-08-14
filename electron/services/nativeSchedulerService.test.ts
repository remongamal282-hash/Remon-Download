import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NativeSchedulerService } from './nativeSchedulerService';
import type { ScheduledDownload } from '../../src/types/download';
import * as fileStorage from '../utils/fileStorage';

// Mock fileStorage module
vi.mock('../utils/fileStorage', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

describe('NativeSchedulerService', () => {
  let service: NativeSchedulerService;
  let mockReadJsonFile: ReturnType<typeof vi.fn>;
  let mockWriteJsonFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReadJsonFile = vi.mocked(fileStorage.readJsonFile);
    mockWriteJsonFile = vi.mocked(fileStorage.writeJsonFile);

    // Default: empty scheduler file
    mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });
    mockWriteJsonFile.mockResolvedValue(undefined);

    service = new NativeSchedulerService();
  });

  describe('initialization', () => {
    it('should load scheduler from file on construction', async () => {
      const mockData: ScheduledDownload[] = [
        {
          id: 'sched-1',
          url: 'https://example.com/video1',
          time: '14:30',
          repeat: 'once',
          status: 'pending',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z',
          triggerCount: 0,
        },
        {
          id: 'sched-2',
          url: 'https://example.com/video2',
          time: '09:00',
          repeat: 'daily',
          status: 'active',
          createdAt: '2024-01-02T08:00:00Z',
          updatedAt: '2024-01-02T08:00:00Z',
          triggerCount: 5,
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });

      const newService = new NativeSchedulerService();
      await newService.initialize();

      expect(mockReadJsonFile).toHaveBeenCalledWith('scheduler.json', {
        version: '1.0.0',
        data: [],
      });

      const items = await newService.getAll();
      expect(items).toEqual(mockData);
    });

    it('should start with empty array if file does not exist', async () => {
      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: [] });

      const newService = new NativeSchedulerService();
      await newService.initialize();

      const items = await newService.getAll();
      expect(items).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));

      const newService = new NativeSchedulerService();

      await expect(newService.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('getAll', () => {
    it('should return all scheduled items', async () => {
      const mockData: ScheduledDownload[] = [
        {
          id: 'sched-1',
          url: 'https://example.com/video1',
          time: '14:30',
          repeat: 'once',
          status: 'pending',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z',
          triggerCount: 0,
        },
      ];

      mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: mockData });
      await service.initialize();

      const items = await service.getAll();

      expect(items).toEqual(mockData);
    });

    it('should return a copy of items array', async () => {
      const mockData: ScheduledDownload[] = [
        {
          id: 'sched-1',
          url: 'https://example.com/video1',
          time: '14:30',
          repeat: 'once',
          status: 'pending',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z',
          triggerCount: 0,
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

  describe('create', () => {
    it('should create new scheduled item and persist to file', async () => {
      await service.initialize();

      const newSchedule = {
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once' as const,
        status: 'pending' as const,
      };

      const result = await service.create(newSchedule);

      expect(result).toMatchObject(newSchedule);
      expect(result.id).toMatch(/^sched-/);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.triggerCount).toBe(0);

      expect(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
        version: '1.0.0',
        data: [result],
      });
    });

    it('should add new item to beginning of list', async () => {
      const existingItem: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      const newSchedule = {
        url: 'https://example.com/video2',
        time: '09:00',
        repeat: 'daily' as const,
        status: 'active' as const,
      };

      const result = await service.create(newSchedule);

      const items = await service.getAll();
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(result);
      expect(items[1]).toEqual(existingItem);
    });

    it('should persist to file after creating', async () => {
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      const newSchedule = {
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once' as const,
        status: 'pending' as const,
      };

      await service.create(newSchedule);

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update existing item and persist to file', async () => {
      const existingItem: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      const updatedSchedule: ScheduledDownload = {
        ...existingItem,
        time: '15:00',
        status: 'active',
      };

      const result = await service.update(updatedSchedule);

      expect(result.time).toBe('15:00');
      expect(result.status).toBe('active');
      expect(result.updatedAt).not.toBe(existingItem.updatedAt);

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'scheduler.json',
        expect.objectContaining({
          version: '1.0.0',
        })
      );
    });

    it('should persist to file after updating', async () => {
      const existingItem: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.update({ ...existingItem, time: '15:00' });

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('should cancel item and persist to file', async () => {
      const existingItem: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      const result = await service.cancel('sched-1');

      expect(result.status).toBe('canceled');
      expect(result.updatedAt).not.toBe(existingItem.updatedAt);

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'scheduler.json',
        expect.objectContaining({
          version: '1.0.0',
        })
      );
    });

    it('should throw error if item not found', async () => {
      await service.initialize();

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        'Scheduled item not found: nonexistent'
      );
    });

    it('should persist to file after canceling', async () => {
      const existingItem: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [existingItem],
      });
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.cancel('sched-1');

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should remove item by id and persist to file', async () => {
      const item1: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      const item2: ScheduledDownload = {
        id: 'sched-2',
        url: 'https://example.com/video2',
        time: '09:00',
        repeat: 'daily',
        status: 'active',
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z',
        triggerCount: 5,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [item1, item2],
      });
      await service.initialize();

      const removedId = await service.remove('sched-1');

      expect(removedId).toBe('sched-1');
      expect(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
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
      const item: ScheduledDownload = {
        id: 'sched-1',
        url: 'https://example.com/video1',
        time: '14:30',
        repeat: 'once',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        triggerCount: 0,
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: [item],
      });
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.remove('sched-1');

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('scheduler.json', {
        version: '1.0.0',
        data: [],
      });
    });
  });
});
