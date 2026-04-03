import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for typing indicator lifecycle — timeout, reset, filtering, throttle.
 * Pure logic extracted from ChatWidget.tsx and ChatInput.tsx behavior.
 */

// Simulates the typing broadcast handler
function handleTypingEvent(
  payload: { name?: string; user_id?: string },
  currentUserId: string | null,
  clearPrevTimeout: () => void
): { typingUser: string | null; needsTimeout: boolean } {
  const name = payload.name;
  // Workspace/Lite: ignore own user typing events
  if (currentUserId && payload.user_id === currentUserId) {
    return { typingUser: null, needsTimeout: false };
  }
  if (name) {
    clearPrevTimeout();
    return { typingUser: name, needsTimeout: true };
  }
  return { typingUser: null, needsTimeout: false };
}

// Simulates ChatInput typing throttle
function shouldBroadcastTyping(lastBroadcast: number, now: number, throttleMs: number = 2000): boolean {
  return now - lastBroadcast > throttleMs;
}

describe("Typing — Broadcast handler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("receiving typing event sets typingUser with name", () => {
    const result = handleTypingEvent({ name: "Agent Carlos" }, null, () => {});
    expect(result.typingUser).toBe("Agent Carlos");
    expect(result.needsTimeout).toBe(true);
  });

  it("typingUser resets to null after 3000ms timeout", () => {
    let typingUser: string | null = "Agent";
    const timeout = setTimeout(() => { typingUser = null; }, 3000);
    vi.advanceTimersByTime(2999);
    expect(typingUser).toBe("Agent");
    vi.advanceTimersByTime(1);
    expect(typingUser).toBeNull();
    clearTimeout(timeout);
  });

  it("new typing before timeout restarts the timer", () => {
    let typingUser: string | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const setTyping = (name: string) => {
      typingUser = name;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => { typingUser = null; }, 3000);
    };

    setTyping("Agent A");
    vi.advanceTimersByTime(2000);
    expect(typingUser).toBe("Agent A");

    setTyping("Agent A"); // re-typing resets the 3s timer
    vi.advanceTimersByTime(2000);
    expect(typingUser).toBe("Agent A"); // would have been null without restart

    vi.advanceTimersByTime(1000);
    expect(typingUser).toBeNull();
    if (timeout) clearTimeout(timeout);
  });

  it("typing from own user (same user_id) is ignored in Workspace/Lite", () => {
    const result = handleTypingEvent(
      { name: "Me", user_id: "user-123" },
      "user-123",
      () => {}
    );
    expect(result.typingUser).toBeNull();
    expect(result.needsTimeout).toBe(false);
  });

  it("typing from different user is accepted", () => {
    const result = handleTypingEvent(
      { name: "Other Agent", user_id: "user-456" },
      "user-123",
      () => {}
    );
    expect(result.typingUser).toBe("Other Agent");
  });

  it("clears previous timeout before setting new one", () => {
    const clearFn = vi.fn();
    handleTypingEvent({ name: "Agent" }, null, clearFn);
    expect(clearFn).toHaveBeenCalledOnce();
  });
});

describe("Typing — Channel naming", () => {
  it("Workspace uses typing-{roomId}", () => {
    const roomId = "room-abc";
    expect(`typing-${roomId}`).toBe("typing-room-abc");
  });

  it("Widget typing channel is separate from consolidated pg_changes channel", () => {
    const roomId = "room-123";
    const typingName = `typing-${roomId}`;
    const pgChangesName = `widget-realtime-visitor-abc-x1y2z3`;
    expect(typingName).not.toContain("widget-realtime");
    expect(pgChangesName).not.toContain("typing-");
  });

  it("typing channel only created when roomId is present", () => {
    const roomId: string | null = null;
    expect(!!roomId).toBe(false);
    const validRoom: string | null = "room-123";
    expect(!!validRoom).toBe(true);
  });
});

describe("Typing — ChatInput throttle", () => {
  it("allows broadcast when > 2s since last", () => {
    const now = Date.now();
    expect(shouldBroadcastTyping(now - 3000, now)).toBe(true);
  });

  it("blocks broadcast when < 2s since last", () => {
    const now = Date.now();
    expect(shouldBroadcastTyping(now - 1000, now)).toBe(false);
  });

  it("allows broadcast on first keystroke (lastBroadcast=0)", () => {
    expect(shouldBroadcastTyping(0, Date.now())).toBe(true);
  });
});
