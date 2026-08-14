import { describe, expect, it } from "vitest";
import { MockSchedulerService } from "./schedulerService";

const scheduleInput = {
  sourceUrl: "https://www.youtube.com/watch?v=scheduled-test",
  date: "2026-08-14",
  time: "10:00",
  repeat: "once" as const
};

describe("MockSchedulerService", () => {
  it("creates and loads scheduled downloads", async () => {
    const service = new MockSchedulerService();

    const item = await service.create(scheduleInput);
    const items = await service.getAll();

    expect(items).toEqual([item]);
    expect(item).toMatchObject({
      sourceUrl: scheduleInput.sourceUrl,
      repeat: "once",
      status: "scheduled",
      triggerCount: 0
    });
  });

  it("triggers due one-time schedules and returns queue metadata", async () => {
    const service = new MockSchedulerService();
    const item = await service.create(scheduleInput);

    const result = await service.tick(new Date(item.nextRunAt).getTime());

    expect(result.triggered).toHaveLength(1);
    expect(result.triggered[0]?.metadata).toMatchObject({
      sourceUrl: scheduleInput.sourceUrl,
      linkType: "video"
    });
    expect(result.items[0]).toMatchObject({
      status: "triggered",
      triggerCount: 1
    });
  });

  it("keeps repeating schedules scheduled and advances the next run", async () => {
    const service = new MockSchedulerService();
    const item = await service.create({ ...scheduleInput, repeat: "daily" });
    const firstRunAt = new Date(item.nextRunAt).getTime();

    const result = await service.tick(firstRunAt);

    expect(result.triggered).toHaveLength(1);
    expect(result.items[0]?.status).toBe("scheduled");
    expect(new Date(result.items[0]?.nextRunAt ?? "").getTime()).toBeGreaterThan(firstRunAt);
  });

  it("updates, cancels, removes, and clears schedules", async () => {
    const service = new MockSchedulerService();
    const item = await service.create(scheduleInput);

    const updated = await service.update(item.id, { ...scheduleInput, time: "11:30", repeat: "weekly" });
    expect(updated).toMatchObject({ time: "11:30", repeat: "weekly", status: "scheduled" });

    const canceled = await service.cancel(item.id);
    expect(canceled.status).toBe("canceled");

    await service.remove(item.id);
    expect(await service.getAll()).toEqual([]);

    await service.create(scheduleInput);
    await service.clear();
    expect(await service.getAll()).toEqual([]);
  });

  it("supports one-shot mock errors", async () => {
    const service = new MockSchedulerService();
    service.failNext({ code: "network_error", message: "errors.networkError", recoverable: true });

    await expect(service.getAll()).rejects.toMatchObject({ code: "network_error" });
    await expect(service.getAll()).resolves.toEqual([]);
  });
});
