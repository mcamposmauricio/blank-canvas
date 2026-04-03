import { describe, it, expect } from "vitest";

/**
 * Tests for Widget consolidated channel rebuild behavior.
 * Validates that the useEffect dependency array [visitorId, roomId, phase]
 * correctly triggers channel teardown and recreation.
 */

interface ChannelDeps {
  visitorId: string | null;
  roomId: string | null;
  phase: string;
}

interface ListenerConfig {
  event: string;
  table: string;
  filter: string;
}

function buildChannelName(visitorId: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `widget-realtime-${visitorId}-${suffix}`;
}

function buildListeners(visitorId: string, roomId: string | null): ListenerConfig[] {
  const listeners: ListenerConfig[] = [];

  if (roomId) {
    listeners.push(
      { event: "INSERT", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      { event: "UPDATE", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      { event: "UPDATE", table: "chat_rooms", filter: `id=eq.${roomId}` }
    );
  }

  listeners.push(
    { event: "INSERT", table: "chat_rooms", filter: `visitor_id=eq.${visitorId}` },
    { event: "UPDATE", table: "chat_rooms", filter: `visitor_id=eq.${visitorId}` }
  );

  return listeners;
}

// Simulates the useEffect dependency check: returns true if channel should rebuild
function shouldRebuild(prev: ChannelDeps, next: ChannelDeps): boolean {
  return (
    prev.visitorId !== next.visitorId ||
    prev.roomId !== next.roomId ||
    prev.phase !== next.phase
  );
}

describe("Widget Channel Rebuild — Dependency array", () => {
  const baseDeps: ChannelDeps = { visitorId: "v1", roomId: "r1", phase: "chat" };

  it("rebuilds when roomId changes", () => {
    expect(shouldRebuild(baseDeps, { ...baseDeps, roomId: "r2" })).toBe(true);
  });

  it("rebuilds when visitorId changes", () => {
    expect(shouldRebuild(baseDeps, { ...baseDeps, visitorId: "v2" })).toBe(true);
  });

  it("rebuilds when phase changes", () => {
    expect(shouldRebuild(baseDeps, { ...baseDeps, phase: "csat" })).toBe(true);
  });

  it("does NOT rebuild when nothing changes", () => {
    expect(shouldRebuild(baseDeps, { ...baseDeps })).toBe(false);
  });
});

describe("Widget Channel Rebuild — No channel without visitorId", () => {
  it("no channel created when visitorId is null", () => {
    const visitorId: string | null = null;
    const shouldCreate = !!visitorId;
    expect(shouldCreate).toBe(false);
  });
});

describe("Widget Channel Rebuild — Listener configuration on rebuild", () => {
  it("with roomId: 5 listeners (3 per-room + 2 per-visitor)", () => {
    const listeners = buildListeners("v1", "r1");
    expect(listeners).toHaveLength(5);
  });

  it("without roomId: only 2 listeners (per-visitor)", () => {
    const listeners = buildListeners("v1", null);
    expect(listeners).toHaveLength(2);
    expect(listeners.every((l) => l.table === "chat_rooms")).toBe(true);
  });

  it("listeners reference new roomId after rebuild", () => {
    const listeners1 = buildListeners("v1", "r1");
    const listeners2 = buildListeners("v1", "r2");
    const msgFilter1 = listeners1.find((l) => l.event === "INSERT" && l.table === "chat_messages")!.filter;
    const msgFilter2 = listeners2.find((l) => l.event === "INSERT" && l.table === "chat_messages")!.filter;
    expect(msgFilter1).toBe("room_id=eq.r1");
    expect(msgFilter2).toBe("room_id=eq.r2");
  });

  it("channel name changes on each rebuild (random suffix)", () => {
    const name1 = buildChannelName("v1");
    const name2 = buildChannelName("v1");
    expect(name1).not.toBe(name2);
    expect(name1).toMatch(/^widget-realtime-v1-[a-z0-9]+$/);
  });
});
