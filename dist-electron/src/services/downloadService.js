"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadService = exports.MockDownloadService = void 0;
const downloadSimulation_1 = require("../utils/downloadSimulation");
const stateMachine_1 = require("../utils/stateMachine");
class MockDownloadService {
    async remove(_id) {
        // Mock downloads are owned by the renderer queue store.
    }
    createFromMetadata(metadata, order, quality, format) {
        const now = Date.now();
        return {
            id: crypto.randomUUID(),
            metadataId: metadata.id,
            thumbnail: metadata.thumbnail,
            title: metadata.title,
            sourceUrl: metadata.sourceUrl,
            quality,
            format,
            fileSize: metadata.fileSize,
            downloadedSize: 0,
            speed: 0,
            eta: "--",
            progress: 0,
            status: "queued",
            order,
            addedAt: new Date().toISOString(),
            phaseStartedAt: now,
            lastUpdatedAt: now,
            retryCount: 0
        };
    }
    createFromHistoryItem(item, order) {
        const now = Date.now();
        return {
            id: crypto.randomUUID(),
            metadataId: item.metadataId,
            thumbnail: item.thumbnail,
            title: item.title,
            sourceUrl: item.sourceUrl,
            quality: item.quality,
            format: item.format,
            fileSize: item.fileSize,
            downloadedSize: 0,
            speed: 0,
            eta: "--",
            progress: 0,
            status: "queued",
            order,
            addedAt: new Date().toISOString(),
            phaseStartedAt: now,
            lastUpdatedAt: now,
            retryCount: 0
        };
    }
    createFromFavoriteItem(item, order, quality, format) {
        const now = Date.now();
        return {
            id: crypto.randomUUID(),
            metadataId: item.id,
            thumbnail: item.thumbnail,
            title: item.title,
            sourceUrl: item.sourceUrl,
            quality,
            format,
            fileSize: 180 * 1024 * 1024,
            downloadedSize: 0,
            speed: 0,
            eta: "--",
            progress: 0,
            status: "queued",
            order,
            addedAt: new Date().toISOString(),
            phaseStartedAt: now,
            lastUpdatedAt: now,
            retryCount: 0
        };
    }
    transition(item, status, now) {
        (0, stateMachine_1.assertTransition)(item.status, status);
        return {
            ...item,
            status,
            phaseStartedAt: now,
            lastUpdatedAt: now,
            speed: status === "downloading" ? item.speed : 0,
            eta: status === "completed" || status === "canceled" || status === "failed" ? "--" : item.eta
        };
    }
    retry(item, now) {
        (0, stateMachine_1.assertTransition)(item.status, "retrying");
        return {
            ...item,
            status: "retrying",
            progress: 0,
            downloadedSize: 0,
            speed: 0,
            eta: "--",
            retryCount: item.retryCount + 1,
            errorCode: undefined,
            errorMessage: undefined,
            phaseStartedAt: now,
            lastUpdatedAt: now
        };
    }
    fail(item, error, now) {
        (0, stateMachine_1.assertTransition)(item.status, "failed");
        return {
            ...item,
            status: "failed",
            speed: 0,
            eta: "--",
            errorCode: error.code,
            errorMessage: error.message,
            phaseStartedAt: now,
            lastUpdatedAt: now
        };
    }
    tick(item, now, speedLimit) {
        if (item.status === "analyzing" && now - item.phaseStartedAt >= 650) {
            return this.transition(item, "downloading", now);
        }
        if (item.status === "retrying" && now - item.phaseStartedAt >= 300) {
            return this.transition(item, "analyzing", now);
        }
        if (item.status === "merging" && now - item.phaseStartedAt >= 700) {
            return this.transition(item, "converting", now);
        }
        if (item.status === "converting" && now - item.phaseStartedAt >= 700) {
            return {
                ...this.transition(item, "completed", now),
                progress: 100,
                downloadedSize: item.fileSize,
                speed: 0,
                eta: "--"
            };
        }
        if (item.status !== "downloading") {
            return item;
        }
        const elapsedSeconds = Math.max(0.25, (now - item.lastUpdatedAt) / 1000);
        const tickIndex = Math.floor((now - item.phaseStartedAt) / 350);
        const baseSpeed = Math.max(300 * 1024, item.fileSize / 18);
        const speed = (0, downloadSimulation_1.calculateMockSpeed)(baseSpeed, speedLimit, tickIndex);
        const downloadedSize = Math.min(item.fileSize, item.downloadedSize + speed * elapsedSeconds);
        const progress = Math.min(100, (downloadedSize / item.fileSize) * 100);
        if (progress >= 100) {
            return {
                ...this.transition(item, "merging", now),
                downloadedSize: item.fileSize,
                progress: 100,
                speed: 0,
                eta: "--"
            };
        }
        return {
            ...item,
            downloadedSize,
            progress,
            speed,
            eta: (0, downloadSimulation_1.formatEta)((item.fileSize - downloadedSize) / speed),
            lastUpdatedAt: now
        };
    }
}
exports.MockDownloadService = MockDownloadService;
exports.downloadService = new MockDownloadService();
//# sourceMappingURL=downloadService.js.map