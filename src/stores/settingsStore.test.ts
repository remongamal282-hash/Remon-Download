import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { useSettingsStore } from "./settingsStore";

describe("useSettingsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it("updates settings through the service and applies language direction", () => {
    useSettingsStore.getState().updateSettings({
      language: "ar",
      appearance: "dark",
      concurrentDownloads: 5,
      speedLimit: 1024 * 1024
    });

    expect(useSettingsStore.getState().settings).toMatchObject({
      language: "ar",
      appearance: "dark",
      concurrentDownloads: 5,
      speedLimit: 1024 * 1024
    });
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("resets settings and document preferences", () => {
    useSettingsStore.getState().updateSettings({ language: "ar", appearance: "dark" });

    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reloads recovered defaults after corrupt localStorage data", () => {
    window.localStorage.setItem("remon-download-settings", "{bad json");

    useSettingsStore.getState().reloadSettings();

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });
});
