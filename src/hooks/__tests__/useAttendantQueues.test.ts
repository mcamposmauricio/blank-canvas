import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Supabase mock ─────────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

// ── TenantRealtime mock ───────────────────────────────────────────────
let capturedAttendantCb: ((p: any) => void) | null = null;
let capturedRoomStatusCb: ((p: any, src: string) => void) | null = null;

vi.mock("@/contexts/TenantRealtimeContext", () => ({
  useTenantRealtime: () => ({
    broadcastEvent: vi.fn(),
    onRoomStatusChange: (cb: any) => {
      capturedRoomStatusCb = cb;
      return () => { capturedRoomStatusCb = null; };
    },
    onNewMessageActivity: (cb: any) => () => {},
    onAttendantUpdate: (cb: any) => {
      capturedAttendantCb = cb;
      return () => { capturedAttendantCb = null; };
    },
  }),
}));

import { useAttendantQueues } from "../useChatRealtime";

function buildChain(resolvedValue: any) {
  const chain: any = {};
  const methods = ["select", "eq", "in", "is", "not", "order", "limit", "maybeSingle", "gt", "lt", "rpc"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal: resolves data
  chain.select = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => resolve(resolvedValue);
  // Make it thenable for await
  (chain as any)[Symbol.for("thenable")] = true;
  return chain;
}

describe("useAttendantQueues (Fix 1.1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedAttendantCb = null;
    capturedRoomStatusCb = null;

    // Mock supabase.from to return chainable queries that resolve empty
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      const proxy = new Proxy(chain, {
        get(target, prop) {
          if (prop === "then") return undefined; // Not directly thenable
          return (...args: any[]) => {
            // Terminal methods that return data
            if (prop === "maybeSingle") return Promise.resolve({ data: null });
            return proxy;
          };
        },
      });
      // Override for actual resolution
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
          in: vi.fn().mockReturnValue({
            then: undefined,
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
          order: vi.fn().mockResolvedValue({ data: [] }),
          not: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [] }),
          }),
          is: vi.fn().mockResolvedValue({ data: [] }),
        }),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("uses 120s safety net interval, not 10s", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    const { unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    // Check all setInterval calls — none should be 10000
    const intervalCalls = setIntervalSpy.mock.calls;
    const has10s = intervalCalls.some(([, ms]) => ms === 10000);
    const has120s = intervalCalls.some(([, ms]) => ms === 120000);

    expect(has10s).toBe(false);
    expect(has120s).toBe(true);

    setIntervalSpy.mockRestore();
    unmount();
  });

  it("inline updates attendant via onAttendantUpdate without refetch", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    // Wait for initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Track calls to supabase.from after initial load
    const callCountBefore = mockFrom.mock.calls.length;

    // Simulate onAttendantUpdate payload
    act(() => {
      capturedAttendantCb?.({
        attendant_id: "att-1",
        status: "online",
        active_conversations: 3,
        display_name: "Agent Updated",
      });
    });

    // No new supabase.from calls should have been made (inline update)
    const callCountAfter = mockFrom.mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore);

    unmount();
  });

  it("removes room from unassigned when attendant_id is assigned via onRoomStatusChange", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Add an unassigned room
    act(() => {
      capturedRoomStatusCb?.(
        { room_id: "room-99", status: "active", attendant_id: null, updated_at: new Date().toISOString() },
        "pg"
      );
    });

    // Now assign it
    act(() => {
      capturedRoomStatusCb?.(
        { room_id: "room-99", status: "active", attendant_id: "att-1", updated_at: new Date().toISOString() },
        "pg"
      );
    });

    // Room should be removed from unassigned
    expect(result.current.unassignedRooms.find((r) => r.id === "room-99")).toBeUndefined();

    unmount();
  });

  it("adds new unassigned room when status is active/waiting with no attendant", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      capturedRoomStatusCb?.(
        { room_id: "room-new", status: "waiting", attendant_id: null, updated_at: new Date().toISOString() },
        "pg"
      );
    });

    expect(result.current.unassignedRooms.some((r) => r.id === "room-new")).toBe(true);

    unmount();
  });

  it("removes room from unassigned on closed/_deleted status", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Add room
    act(() => {
      capturedRoomStatusCb?.(
        { room_id: "room-del", status: "waiting", attendant_id: null, updated_at: "2026-01-01T00:00:00Z" },
        "pg"
      );
    });

    // Delete it
    act(() => {
      capturedRoomStatusCb?.(
        { room_id: "room-del", status: "_deleted" },
        "pg"
      );
    });

    expect(result.current.unassignedRooms.find((r) => r.id === "room-del")).toBeUndefined();

    unmount();
  });
});
