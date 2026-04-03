import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Proxy-based chainable mock
function createChainProxy(resolveData: any = { data: [], count: 0 }): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") return (resolve: any, _reject?: any) => Promise.resolve(resolveData).then(resolve);
      if (prop === "catch") return (_fn: any) => createChainProxy(resolveData);
      if (prop === "finally") return (fn: any) => { fn(); return createChainProxy(resolveData); };
      return (..._args: any[]) => createChainProxy(resolveData);
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/integrations/supabase/client", () => {
  const mockFrom = vi.fn().mockImplementation(() => createChainProxy());
  return {
    supabase: {
      from: mockFrom,
      channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
      removeChannel: vi.fn(),
      rpc: vi.fn().mockImplementation(() => createChainProxy()),
    },
  };
});

let capturedAttendantCb: ((p: any) => void) | null = null;
let capturedRoomStatusCb: ((p: any, src: string) => void) | null = null;

vi.mock("@/contexts/TenantRealtimeContext", () => ({
  useTenantRealtime: () => ({
    broadcastEvent: vi.fn(),
    onRoomStatusChange: (cb: any) => {
      capturedRoomStatusCb = cb;
      return () => { capturedRoomStatusCb = null; };
    },
    onNewMessageActivity: () => () => {},
    onAttendantUpdate: (cb: any) => {
      capturedAttendantCb = cb;
      return () => { capturedAttendantCb = null; };
    },
  }),
}));

import { useAttendantQueues } from "../useChatRealtime";

// Suppress unhandled rejections from fetchQueues mock chain
const originalListeners = process.listeners("unhandledRejection");
beforeAll(() => {
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", () => {});
});
afterAll(() => {
  process.removeAllListeners("unhandledRejection");
  originalListeners.forEach((l) => process.on("unhandledRejection", l));
});

describe("useAttendantQueues (Fix 1.1)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses 120s safety net interval, not 10s", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    const { unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    const has10s = setIntervalSpy.mock.calls.some(([, ms]) => ms === 10000);
    const has120s = setIntervalSpy.mock.calls.some(([, ms]) => ms === 120000);

    expect(has10s).toBe(false);
    expect(has120s).toBe(true);

    unmount();
  });

  it("inline updates attendant state without extra DB calls", () => {
    const { supabase } = require("@/integrations/supabase/client");
    const { unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    const callCountBefore = supabase.from.mock.calls.length;

    act(() => {
      capturedAttendantCb?.({
        attendant_id: "att-1",
        status: "online",
        active_conversations: 3,
        display_name: "Agent Updated",
      });
    });

    // No new DB calls — inline update only
    expect(supabase.from.mock.calls.length).toBe(callCountBefore);
    unmount();
  });

  it("removes room from unassigned when attendant_id is assigned", () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    act(() => {
      capturedRoomStatusCb?.({ room_id: "r1", status: "active", attendant_id: null, updated_at: "2026-01-01T00:00:01Z" }, "pg");
    });
    expect(result.current.unassignedRooms.some((r) => r.id === "r1")).toBe(true);

    act(() => {
      capturedRoomStatusCb?.({ room_id: "r1", status: "active", attendant_id: "att-1", updated_at: "2026-01-01T00:00:02Z" }, "pg");
    });
    expect(result.current.unassignedRooms.find((r) => r.id === "r1")).toBeUndefined();

    unmount();
  });

  it("adds unassigned room on waiting with no attendant", () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    act(() => {
      capturedRoomStatusCb?.({ room_id: "r2", status: "waiting", attendant_id: null, updated_at: "2026-01-01T00:00:03Z" }, "pg");
    });

    expect(result.current.unassignedRooms.some((r) => r.id === "r2")).toBe(true);
    unmount();
  });

  it("removes room from unassigned on _deleted status", () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    act(() => {
      capturedRoomStatusCb?.({ room_id: "r3", status: "waiting", attendant_id: null, updated_at: "2026-01-01T00:00:04Z" }, "pg");
    });

    act(() => {
      capturedRoomStatusCb?.({ room_id: "r3", status: "_deleted" }, "pg");
    });

    expect(result.current.unassignedRooms.find((r) => r.id === "r3")).toBeUndefined();
    unmount();
  });
});
