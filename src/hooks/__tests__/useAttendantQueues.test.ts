import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Supabase mock (no top-level variable references) ──────────────────
vi.mock("@/integrations/supabase/client", () => {
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
      in: vi.fn().mockReturnValue({
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
  }));
  return {
    supabase: {
      from: mockFrom,
      channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
      removeChannel: vi.fn(),
    },
  };
});

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
    onNewMessageActivity: () => () => {},
    onAttendantUpdate: (cb: any) => {
      capturedAttendantCb = cb;
      return () => { capturedAttendantCb = null; };
    },
  }),
}));

import { useAttendantQueues } from "../useChatRealtime";

describe("useAttendantQueues (Fix 1.1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedAttendantCb = null;
    capturedRoomStatusCb = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("uses 120s safety net interval, not 10s", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    const { unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    const has10s = setIntervalSpy.mock.calls.some(([, ms]) => ms === 10000);
    const has120s = setIntervalSpy.mock.calls.some(([, ms]) => ms === 120000);

    expect(has10s).toBe(false);
    expect(has120s).toBe(true);

    setIntervalSpy.mockRestore();
    unmount();
  });

  it("inline updates attendant via onAttendantUpdate without extra DB calls", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    const callCountBefore = (supabase.from as any).mock.calls.length;

    act(() => {
      capturedAttendantCb?.({
        attendant_id: "att-1",
        status: "online",
        active_conversations: 3,
        display_name: "Agent Updated",
      });
    });

    const callCountAfter = (supabase.from as any).mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore);

    unmount();
  });

  it("removes room from unassigned when attendant_id is assigned", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    // Add unassigned room
    act(() => {
      capturedRoomStatusCb?.({ room_id: "room-99", status: "active", attendant_id: null, updated_at: new Date().toISOString() }, "pg");
    });

    // Assign it
    act(() => {
      capturedRoomStatusCb?.({ room_id: "room-99", status: "active", attendant_id: "att-1", updated_at: new Date().toISOString() }, "pg");
    });

    expect(result.current.unassignedRooms.find((r) => r.id === "room-99")).toBeUndefined();
    unmount();
  });

  it("adds new unassigned room when waiting with no attendant", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    act(() => {
      capturedRoomStatusCb?.({ room_id: "room-new", status: "waiting", attendant_id: null, updated_at: new Date().toISOString() }, "pg");
    });

    expect(result.current.unassignedRooms.some((r) => r.id === "room-new")).toBe(true);
    unmount();
  });

  it("removes room from unassigned on _deleted status", async () => {
    const { result, unmount } = renderHook(() => useAttendantQueues("tenant-1"));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    act(() => {
      capturedRoomStatusCb?.({ room_id: "room-del", status: "waiting", attendant_id: null, updated_at: "2026-01-01T00:00:00Z" }, "pg");
    });

    act(() => {
      capturedRoomStatusCb?.({ room_id: "room-del", status: "_deleted" }, "pg");
    });

    expect(result.current.unassignedRooms.find((r) => r.id === "room-del")).toBeUndefined();
    unmount();
  });
});
