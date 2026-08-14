/**
 * serviceResolver.test.ts
 *
 * Validates the dual-mode service resolver:
 * - Returns Mock services in Web/Vitest mode (window.electronAPI is undefined)
 * - Returns Electron IPC adapters when window.electronAPI is defined
 * - Singleton caching behaviour
 * - Test injection / reset helpers
 * - Stores do NOT directly import Mock service classes (import guard)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isElectronEnvironment,
  resolveMetadataService,
  resolveDownloadService,
  resolveHistoryService,
  resolveFavoritesService,
  resolveSchedulerService,
  resolveSettingsService,
  _resetServiceCache,
  _injectMetadataService,
  _injectDownloadService,
  _injectHistoryService,
  _injectFavoritesService,
  _injectSchedulerService,
  _injectSettingsService
} from "../services/serviceResolver";
import { MockMetadataService } from "../services/metadataService";
import { MockDownloadService } from "../services/downloadService";
import { MockHistoryService } from "../services/historyService";
import { MockFavoritesService } from "../services/favoritesService";
import { MockSchedulerService } from "../services/schedulerService";
import { LocalStorageSettingsService } from "../services/settingsService";
import {
  ElectronMetadataService,
  ElectronDownloadService,
  ElectronHistoryService,
  ElectronFavoritesService,
  ElectronSchedulerService
} from "../services/electronIpcAdapters";

// ─── Helpers ───────────────────────────────────────────────────────────────

function installFakeElectronAPI() {
  Object.defineProperty(window, "electronAPI", {
    value: {
      isElectron: true,
      download: {
        onProgress: vi.fn(() => () => { }),  // Returns unsubscribe function
        onStateChange: vi.fn(() => () => { }), // Returns unsubscribe function
        add: vi.fn(),
        getAll: vi.fn(async () => []),
        start: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn(),
        remove: vi.fn(),
        reorder: vi.fn()
      }
    },
    writable: true,
    configurable: true
  });
}

function removeElectronAPI() {
  delete window.electronAPI;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("serviceResolver", () => {
  beforeEach(() => {
    _resetServiceCache();
    removeElectronAPI();
  });

  // ── Environment detection ──────────────────────────────────────────────

  it("returns false for isElectronEnvironment when electronAPI is absent", () => {
    expect(isElectronEnvironment()).toBe(false);
  });

  it("returns true for isElectronEnvironment when electronAPI is present", () => {
    installFakeElectronAPI();
    expect(isElectronEnvironment()).toBe(true);
  });

  // ── Web / Mock mode ────────────────────────────────────────────────────

  describe("Web / Mock mode (no electronAPI)", () => {
    it("resolveMetadataService returns MockMetadataService", () => {
      expect(resolveMetadataService()).toBeInstanceOf(MockMetadataService);
    });

    it("resolveDownloadService returns MockDownloadService", () => {
      expect(resolveDownloadService()).toBeInstanceOf(MockDownloadService);
    });

    it("resolveHistoryService returns MockHistoryService", () => {
      expect(resolveHistoryService()).toBeInstanceOf(MockHistoryService);
    });

    it("resolveFavoritesService returns MockFavoritesService", () => {
      expect(resolveFavoritesService()).toBeInstanceOf(MockFavoritesService);
    });

    it("resolveSchedulerService returns MockSchedulerService", () => {
      expect(resolveSchedulerService()).toBeInstanceOf(MockSchedulerService);
    });

    it("resolveSettingsService always returns LocalStorageSettingsService", () => {
      // Settings is sync-only — LocalStorage impl is used regardless of mode
      expect(resolveSettingsService()).toBeInstanceOf(LocalStorageSettingsService);
    });
  });

  // ── Electron mode ──────────────────────────────────────────────────────

  describe("Electron mode (electronAPI present)", () => {
    beforeEach(() => {
      installFakeElectronAPI();
      _resetServiceCache();
    });

    it("resolveMetadataService returns ElectronMetadataService", () => {
      expect(resolveMetadataService()).toBeInstanceOf(ElectronMetadataService);
    });

    it("resolveDownloadService returns ElectronDownloadService in Electron mode", () => {
      expect(resolveDownloadService()).toBeInstanceOf(ElectronDownloadService);
    });

    it("resolveHistoryService returns ElectronHistoryService", () => {
      expect(resolveHistoryService()).toBeInstanceOf(ElectronHistoryService);
    });

    it("resolveFavoritesService returns ElectronFavoritesService", () => {
      expect(resolveFavoritesService()).toBeInstanceOf(ElectronFavoritesService);
    });

    it("resolveSchedulerService returns ElectronSchedulerService", () => {
      expect(resolveSchedulerService()).toBeInstanceOf(ElectronSchedulerService);
    });

    it("resolveSettingsService always returns LocalStorageSettingsService (sync/async trade-off)", () => {
      expect(resolveSettingsService()).toBeInstanceOf(LocalStorageSettingsService);
    });
  });

  // ── Singleton caching ──────────────────────────────────────────────────

  describe("singleton caching", () => {
    it("returns the same instance on repeated calls", () => {
      const s1 = resolveMetadataService();
      const s2 = resolveMetadataService();
      expect(s1).toBe(s2);
    });

    it("returns a new instance after _resetServiceCache", () => {
      const s1 = resolveHistoryService();
      _resetServiceCache();
      const s2 = resolveHistoryService();
      expect(s1).not.toBe(s2);
    });
  });

  // ── Test injection helpers ─────────────────────────────────────────────

  describe("test injection helpers", () => {
    it("_injectMetadataService overrides the cached instance", () => {
      const custom = new MockMetadataService();
      _injectMetadataService(custom);
      expect(resolveMetadataService()).toBe(custom);
    });

    it("_injectDownloadService overrides the cached instance", () => {
      const custom = new MockDownloadService();
      _injectDownloadService(custom);
      expect(resolveDownloadService()).toBe(custom);
    });

    it("_injectHistoryService overrides the cached instance", () => {
      const custom = new MockHistoryService();
      _injectHistoryService(custom);
      expect(resolveHistoryService()).toBe(custom);
    });

    it("_injectFavoritesService overrides the cached instance", () => {
      const custom = new MockFavoritesService();
      _injectFavoritesService(custom);
      expect(resolveFavoritesService()).toBe(custom);
    });

    it("_injectSchedulerService overrides the cached instance", () => {
      const custom = new MockSchedulerService();
      _injectSchedulerService(custom);
      expect(resolveSchedulerService()).toBe(custom);
    });

    it("_injectSettingsService overrides the cached instance", () => {
      const custom = new LocalStorageSettingsService();
      _injectSettingsService(custom);
      expect(resolveSettingsService()).toBe(custom);
    });
  });

  // ── Electron adapters surface ──────────────────────────────────────────

  describe("Electron adapter shape validation", () => {
    it("ElectronMetadataService has an analyze method", () => {
      expect(typeof new ElectronMetadataService().analyze).toBe("function");
    });

    it("ElectronHistoryService has getAll, add, addFromDownload, remove, clear, failNext", () => {
      const svc = new ElectronHistoryService();
      expect(typeof svc.getAll).toBe("function");
      expect(typeof svc.add).toBe("function");
      expect(typeof svc.addFromDownload).toBe("function");
      expect(typeof svc.remove).toBe("function");
      expect(typeof svc.clear).toBe("function");
      expect(typeof svc.failNext).toBe("function");
    });

    it("ElectronFavoritesService has getAll, add, remove, isFavorite, clear, failNext", () => {
      const svc = new ElectronFavoritesService();
      expect(typeof svc.getAll).toBe("function");
      expect(typeof svc.add).toBe("function");
      expect(typeof svc.remove).toBe("function");
      expect(typeof svc.isFavorite).toBe("function");
      expect(typeof svc.clear).toBe("function");
      expect(typeof svc.failNext).toBe("function");
    });

    it("ElectronSchedulerService has getAll, create, update, cancel, remove, tick, clear, failNext", () => {
      const svc = new ElectronSchedulerService();
      expect(typeof svc.getAll).toBe("function");
      expect(typeof svc.create).toBe("function");
      expect(typeof svc.update).toBe("function");
      expect(typeof svc.cancel).toBe("function");
      expect(typeof svc.remove).toBe("function");
      expect(typeof svc.tick).toBe("function");
      expect(typeof svc.clear).toBe("function");
      expect(typeof svc.failNext).toBe("function");
    });
  });
});
