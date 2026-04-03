import { describe, it, expect, vi } from "vitest";

describe("AdminWorkspace (Fix 2.2 + 2.3)", () => {
  it("does not create workspace-room-read pg_changes channel", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/pages/AdminWorkspace.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should NOT have workspace-room-read channel
    expect(content).not.toMatch(/channel\(.*workspace-room-read/);

    // Should use onRoomStatusChange for visitor_last_read_at
    expect(content).toMatch(/onRoomStatusChange/);
    expect(content).toMatch(/visitor_last_read_at/);
  });

  it("pendingRefreshTrigger uses 10s debounce", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/pages/AdminWorkspace.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should have setTimeout with 10000ms for pendingRefreshTrigger
    expect(content).toMatch(/setTimeout\(.*setPendingRefreshTrigger.*10000/s);
  });

  it("debounce pattern: multiple rapid events result in single increment", () => {
    vi.useFakeTimers();

    let triggerCount = 0;
    const setPendingRefreshTrigger = () => { triggerCount++; };
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const onRoomStatusChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(setPendingRefreshTrigger, 10000);
    };

    // Simulate 10 rapid room status changes
    for (let i = 0; i < 10; i++) {
      onRoomStatusChange();
    }

    // Before 10s: nothing fired
    vi.advanceTimersByTime(9999);
    expect(triggerCount).toBe(0);

    // At 10s: exactly one increment
    vi.advanceTimersByTime(1);
    expect(triggerCount).toBe(1);

    vi.useRealTimers();
  });
});

describe("AttendantLite (Fix 2.2 + 2.3)", () => {
  it("does not create lite-room-read pg_changes channel", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/pages/AttendantLite.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should NOT have lite-room-read channel
    expect(content).not.toMatch(/channel\(.*lite-room-read/);

    // Should use onRoomStatusChange for visitor_last_read_at
    expect(content).toMatch(/onRoomStatusChange/);
    expect(content).toMatch(/visitor_last_read_at/);
  });

  it("pendingRefreshTrigger uses 10s debounce", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/pages/AttendantLite.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toMatch(/setTimeout\(.*setPendingRefreshTrigger.*10000/s);
  });
});
