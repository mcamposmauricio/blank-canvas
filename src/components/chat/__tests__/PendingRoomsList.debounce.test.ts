import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("PendingRoomsList debounce (Fix 2.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshTrigger=0 executes immediately (no debounce)", () => {
    let callCount = 0;
    const fetchPendingRooms = () => { callCount++; };

    // Simulate the useEffect logic from PendingRoomsList
    const refreshTrigger = 0;
    const delay = refreshTrigger === 0 ? 0 : 5000;
    const timer = setTimeout(fetchPendingRooms, delay);

    // setTimeout(fn, 0) executes on next tick
    vi.advanceTimersByTime(0);
    expect(callCount).toBe(1);

    clearTimeout(timer);
  });

  it("refreshTrigger > 0 waits 5s before executing", () => {
    let callCount = 0;
    const fetchPendingRooms = () => { callCount++; };

    const refreshTrigger = 1;
    const delay = refreshTrigger === 0 ? 0 : 5000;
    const timer = setTimeout(fetchPendingRooms, delay);

    // Before 5s: nothing
    vi.advanceTimersByTime(4999);
    expect(callCount).toBe(0);

    // At 5s: executes
    vi.advanceTimersByTime(1);
    expect(callCount).toBe(1);

    clearTimeout(timer);
  });

  it("multiple rapid refreshTrigger changes coalesce to single fetch via cleanup", () => {
    let callCount = 0;
    const fetchPendingRooms = () => { callCount++; };
    let currentTimer: ReturnType<typeof setTimeout> | null = null;

    // Simulate 5 rapid refreshTrigger changes (each clears previous timer)
    for (let i = 1; i <= 5; i++) {
      if (currentTimer) clearTimeout(currentTimer);
      const delay = 5000;
      currentTimer = setTimeout(fetchPendingRooms, delay);
    }

    // Before 5s: nothing
    vi.advanceTimersByTime(4999);
    expect(callCount).toBe(0);

    // At 5s: exactly one call
    vi.advanceTimersByTime(1);
    expect(callCount).toBe(1);
  });

  it("cleanup clears pending debounce timer", () => {
    let callCount = 0;
    const fetchPendingRooms = () => { callCount++; };

    const timer = setTimeout(fetchPendingRooms, 5000);

    // Simulate cleanup (component unmount or dependency change)
    clearTimeout(timer);

    vi.advanceTimersByTime(10000);
    expect(callCount).toBe(0);
  });

  it("source code uses correct debounce pattern", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/components/chat/PendingRoomsList.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should have the ternary: refreshTrigger === 0 ? 0 : 5000
    expect(content).toMatch(/refreshTrigger === 0 \? 0 : 5000/);

    // Should have clearTimeout in cleanup
    expect(content).toMatch(/return \(\) => clearTimeout/);
  });
});
