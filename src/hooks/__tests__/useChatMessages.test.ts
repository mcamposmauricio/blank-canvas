import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Track channel subscriptions ───────────────────────────────────────
const channelListeners: Array<{ event: string; table?: string }> = [];
let channelName = "";

const mockOn = vi.fn().mockImplementation((_type: string, filter: any, _cb: any) => {
  channelListeners.push({ event: filter.event, table: filter.table });
  return { on: mockOn, subscribe: vi.fn().mockReturnValue({ id: "ch" }) };
});

const mockSubscribe = vi.fn().mockReturnValue({ id: "ch" });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: [] }),
              then: undefined,
            }),
            then: undefined,
          }),
          then: undefined,
        }),
        then: undefined,
      }),
    }),
    channel: vi.fn().mockImplementation((name: string) => {
      channelName = name;
      channelListeners.length = 0;
      return { on: mockOn, subscribe: mockSubscribe };
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/contexts/TenantRealtimeContext", () => ({
  useTenantRealtime: () => ({
    broadcastEvent: vi.fn(),
    onRoomStatusChange: () => () => {},
    onNewMessageActivity: () => () => {},
    onAttendantUpdate: () => () => {},
  }),
}));

// Fix: need to re-mock from to properly resolve for the hook
const { supabase } = await import("@/integrations/supabase/client");

import { renderHook } from "@testing-library/react";
import { useChatMessages } from "../useChatRealtime";

describe("useChatMessages (Fix 1.2)", () => {
  beforeEach(() => {
    channelListeners.length = 0;
    channelName = "";

    // Re-setup from mock for each test
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => ({
              lt: vi.fn().mockResolvedValue({ data: [] }),
              // Direct resolution (no `before` param)
              then: (resolve: any) => resolve({ data: [] }),
            })),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("only registers INSERT listener, not UPDATE", () => {
    const { unmount } = renderHook(() => useChatMessages("room-abc"));

    const insertListeners = channelListeners.filter(
      (l) => l.event === "INSERT" && l.table === "chat_messages"
    );
    const updateListeners = channelListeners.filter(
      (l) => l.event === "UPDATE" && l.table === "chat_messages"
    );

    expect(insertListeners.length).toBe(1);
    expect(updateListeners.length).toBe(0);

    unmount();
  });

  it("channel name includes random suffix", () => {
    renderHook(() => useChatMessages("room-xyz"));

    expect(channelName).toMatch(/^chat-messages-room-xyz-.+$/);
  });
});
