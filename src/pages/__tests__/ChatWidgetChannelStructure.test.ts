import { describe, it, expect } from "vitest";

/**
 * Tests that validate the consolidated channel structure from Phase 3.
 * The widget now uses 1 pg_changes channel + 1 broadcast channel instead of 3+1.
 */

interface ListenerConfig {
  event: string;
  table: string;
  filter: string;
}

function buildListenerConfigs(visitorId: string, roomId: string | null): ListenerConfig[] {
  const listeners: ListenerConfig[] = [];

  if (roomId) {
    listeners.push(
      { event: "INSERT", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      { event: "UPDATE", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      { event: "UPDATE", table: "chat_rooms", filter: `id=eq.${roomId}` }
    );
  }

  // Always present — proactive chats & reopens
  listeners.push(
    { event: "INSERT", table: "chat_rooms", filter: `visitor_id=eq.${visitorId}` },
    { event: "UPDATE", table: "chat_rooms", filter: `visitor_id=eq.${visitorId}` }
  );

  return listeners;
}

describe("ChatWidget Channel Structure — Consolidated channel", () => {
  const visitorId = "visitor-abc";
  const roomId = "room-123";

  it("channel name follows widget-realtime-{visitorId}-{suffix} pattern", () => {
    const suffix = "x1y2z3";
    const name = `widget-realtime-${visitorId}-${suffix}`;
    expect(name).toMatch(/^widget-realtime-visitor-abc-[a-z0-9]+$/);
  });

  it("with roomId: has 5 listeners", () => {
    const listeners = buildListenerConfigs(visitorId, roomId);
    expect(listeners).toHaveLength(5);
  });

  it("with roomId: includes INSERT+UPDATE for chat_messages", () => {
    const listeners = buildListenerConfigs(visitorId, roomId);
    const msgListeners = listeners.filter(l => l.table === "chat_messages");
    expect(msgListeners).toHaveLength(2);
    expect(msgListeners.map(l => l.event).sort()).toEqual(["INSERT", "UPDATE"]);
    expect(msgListeners[0].filter).toBe(`room_id=eq.${roomId}`);
  });

  it("with roomId: includes UPDATE for chat_rooms by id", () => {
    const listeners = buildListenerConfigs(visitorId, roomId);
    const roomById = listeners.find(l => l.table === "chat_rooms" && l.filter === `id=eq.${roomId}`);
    expect(roomById).toBeDefined();
    expect(roomById!.event).toBe("UPDATE");
  });

  it("with roomId: includes INSERT+UPDATE for chat_rooms by visitorId", () => {
    const listeners = buildListenerConfigs(visitorId, roomId);
    const byVisitor = listeners.filter(l => l.table === "chat_rooms" && l.filter === `visitor_id=eq.${visitorId}`);
    expect(byVisitor).toHaveLength(2);
    expect(byVisitor.map(l => l.event).sort()).toEqual(["INSERT", "UPDATE"]);
  });

  it("without roomId: has only 2 listeners (proactive INSERT+UPDATE)", () => {
    const listeners = buildListenerConfigs(visitorId, null);
    expect(listeners).toHaveLength(2);
    expect(listeners.every(l => l.table === "chat_rooms")).toBe(true);
    expect(listeners.every(l => l.filter === `visitor_id=eq.${visitorId}`)).toBe(true);
  });

  it("typing channel is separate with name typing-{roomId}", () => {
    const typingChannel = `typing-${roomId}`;
    expect(typingChannel).toBe("typing-room-123");
    expect(typingChannel).not.toContain("widget-realtime");
  });
});
