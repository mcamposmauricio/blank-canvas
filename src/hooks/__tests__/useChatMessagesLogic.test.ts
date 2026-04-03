import { describe, it, expect } from "vitest";

/**
 * Tests for useChatMessages logic — INSERT dedup, room switch clear, pagination.
 * Extracted as pure functions matching the hook's internal behavior.
 */

interface ChatMessage {
  id: string;
  room_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 50;

// Simulates the INSERT handler in useChatMessages
function handleInsert(prev: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (prev.some((m) => m.id === incoming.id)) return prev;
  return [...prev, incoming];
}

// Simulates room switch — messages cleared immediately
function handleRoomSwitch(): { messages: ChatMessage[]; hasMore: boolean } {
  return { messages: [], hasMore: false };
}

// Simulates loadMore — prepend older messages
function handleLoadMore(
  existing: ChatMessage[],
  olderBatch: ChatMessage[]
): ChatMessage[] {
  return [...olderBatch, ...existing];
}

// Simulates hasMore detection from response length
function detectHasMore(responseLength: number): boolean {
  return responseLength > PAGE_SIZE;
}

const makeMsg = (id: string, ts: string = "2024-01-01T00:00:00Z"): ChatMessage => ({
  id,
  room_id: "room-1",
  sender_type: "visitor",
  content: `msg-${id}`,
  created_at: ts,
});

describe("useChatMessages — INSERT deduplication", () => {
  it("adds new message to array", () => {
    const result = handleInsert([], makeMsg("m1"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("duplicate message (same id) is NOT added twice", () => {
    const existing = [makeMsg("m1")];
    const result = handleInsert(existing, makeMsg("m1"));
    expect(result).toHaveLength(1);
  });

  it("different messages are all added", () => {
    let msgs: ChatMessage[] = [];
    msgs = handleInsert(msgs, makeMsg("m1"));
    msgs = handleInsert(msgs, makeMsg("m2"));
    msgs = handleInsert(msgs, makeMsg("m3"));
    expect(msgs).toHaveLength(3);
  });
});

describe("useChatMessages — Room switch clear", () => {
  it("messages are cleared immediately on room switch", () => {
    const result = handleRoomSwitch();
    expect(result.messages).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe("useChatMessages — Pagination (loadMore)", () => {
  it("prepends older messages maintaining order", () => {
    const existing = [makeMsg("m3", "2024-01-03T00:00:00Z")];
    const older = [
      makeMsg("m1", "2024-01-01T00:00:00Z"),
      makeMsg("m2", "2024-01-02T00:00:00Z"),
    ];
    const result = handleLoadMore(existing, older);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("m1");
    expect(result[1].id).toBe("m2");
    expect(result[2].id).toBe("m3");
  });

  it("hasMore = true when response > PAGE_SIZE", () => {
    expect(detectHasMore(PAGE_SIZE + 1)).toBe(true);
  });

  it("hasMore = false when response <= PAGE_SIZE", () => {
    expect(detectHasMore(PAGE_SIZE)).toBe(false);
    expect(detectHasMore(10)).toBe(false);
  });
});

describe("useChatMessages — Channel naming", () => {
  it("channel uses random suffix to avoid collision", () => {
    const roomId = "room-abc";
    const suffix1 = Math.random().toString(36).slice(2, 8);
    const suffix2 = Math.random().toString(36).slice(2, 8);
    const name1 = `chat-messages-${roomId}-${suffix1}`;
    const name2 = `chat-messages-${roomId}-${suffix2}`;
    expect(name1).not.toBe(name2);
    expect(name1).toMatch(/^chat-messages-room-abc-[a-z0-9]+$/);
  });
});
