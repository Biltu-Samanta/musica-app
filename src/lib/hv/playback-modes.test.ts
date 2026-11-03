import { describe, expect, it } from "vitest";
import { buildOrder, fadeMultiplier, nextPosition, previousPosition, resumePoint } from "./playback-modes";
import { PLAYBACK_SPEEDS, SKIP_INTERVALS, SLEEP_PRESETS, SUPPORTED_FORMATS } from "./types";

describe("repeat modes", () => {
  it("NO_REPEAT stops after the last voice note", () => {
    expect(nextPosition(2, 3, "NO_REPEAT", "ended")).toBeNull();
    expect(nextPosition(0, 3, "NO_REPEAT", "ended")).toBe(1);
  });

  it("REPEAT_ALL wraps back to the first voice note", () => {
    expect(nextPosition(2, 3, "REPEAT_ALL", "ended")).toBe(0);
  });

  it("REPEAT_ONE replays the same voice note when it ends", () => {
    expect(nextPosition(1, 3, "REPEAT_ONE", "ended")).toBe(1);
  });

  it("pressing next with REPEAT_ONE still moves forward", () => {
    expect(nextPosition(1, 3, "REPEAT_ONE", "user")).toBe(2);
  });

  it("previous restarts the track when more than 3 seconds in", () => {
    expect(previousPosition(2, 3, "NO_REPEAT", 10)).toEqual({ pos: 2, restart: true });
    expect(previousPosition(2, 3, "NO_REPEAT", 1)).toEqual({ pos: 1, restart: false });
  });
});

describe("shuffle", () => {
  it("keeps the chosen voice note first and plays every item once", () => {
    const order = buildOrder(6, 3, true);
    expect(order[0]).toBe(3);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("remember last position", () => {
  it("resumes from the saved spot but not at the very end", () => {
    expect(resumePoint(42, 120)).toBe(42);
    expect(resumePoint(119, 120)).toBe(0);
    expect(resumePoint(1, 120)).toBe(0);
  });
});

describe("sleep timer fade", () => {
  it("lowers volume only during the final fade window", () => {
    expect(fadeMultiplier(20_000, 10)).toBe(1);
    expect(fadeMultiplier(5_000, 10)).toBe(0.5);
    expect(fadeMultiplier(0, 10)).toBe(0);
  });
});

describe("spec values", () => {
  it("offers the requested playback speeds", () => {
    expect([...PLAYBACK_SPEEDS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]);
  });
  it("offers the requested skip intervals and sleep presets", () => {
    expect([...SKIP_INTERVALS]).toEqual([5, 10, 15, 30, 60]);
    expect([...SLEEP_PRESETS]).toEqual([5, 10, 15, 30, 45, 60]);
  });
  it("accepts the requested audio formats", () => {
    expect([...SUPPORTED_FORMATS]).toEqual(["opus", "ogg", "mp3", "m4a", "wav", "aac", "flac"]);
  });
});
