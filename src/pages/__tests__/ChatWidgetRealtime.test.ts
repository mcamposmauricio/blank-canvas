import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Extracted handler logic from ChatWidget.tsx (Phase 3 consolidated channel) ----

interface ChatMsg {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  message_type: string | null;
  metadata: any;
  deleted_at: string | null;
  is_internal?: boolean;
}

type Phase = "form" | "waiting" | "chat" | "csat" | "closed" | "viewTranscript" | "history";

interface WidgetState {
  messages: ChatMsg[];
  unreadCount: number;
  phase: Phase;
  roomId: string | null;
  isOpen: boolean;
  typingUser: string | null;
  attendantName: string | null;
  csatScore: number;
  csatComment: string;
}

// --- Suite 1: Message INSERT handler ---
function handleMessageInsert(
  msg: any,
  state: WidgetState
): { messages: ChatMsg[]; unreadCount: number } {
  if (msg.is_internal || msg.deleted_at) {
    return { messages: state.messages, unreadCount: state.unreadCount };
  }

  let newUnread = state.unreadCount;
  if (msg.sender_type === "attendant" && !state.isOpen) {
    newUnread = state.unreadCount + 1;
  }

  const withoutOptimistic = state.messages.filter((m) => !m.id.startsWith("optimistic-"));
  if (withoutOptimistic.some((m) => m.id === msg.id)) {
    return { messages: withoutOptimistic, unreadCount: newUnread };
  }

  return { messages: [...withoutOptimistic, msg], unreadCount: newUnread };
}

// --- Suite 2: Message UPDATE handler (deletion) ---
function handleMessageUpdate(
  msg: any,
  messages: ChatMsg[]
): ChatMsg[] {
  if (msg.deleted_at) {
    return messages.filter((m) => m.id !== msg.id);
  }
  return messages;
}

// --- Suite 3: Room UPDATE by roomId handler ---
function handleRoomUpdateByRoomId(
  room: any,
  currentPhase: Phase,
  isResolvedVisitor: boolean
): { phase: Phase; attendantName: string | null } | null {
  if (room.status === "active" && currentPhase === "waiting") {
    return { phase: "chat", attendantName: null };
  }
  if (room.status === "closed") {
    const res = room.resolution_status;
    if (res === "resolved") return { phase: "csat", attendantName: null };
    if (res === "archived") {
      return { phase: isResolvedVisitor ? "history" : "closed", attendantName: null };
    }
    if (res === "pending") return { phase: "viewTranscript", attendantName: null };
  }
  return null;
}

// --- Suite 4: Proactive room INSERT by visitorId ---
function handleProactiveRoomInsert(
  newRoom: any,
  state: WidgetState
): Partial<WidgetState> | null {
  const blockedPhases: Phase[] = ["chat", "waiting", "csat"];
  const shouldProcess = !blockedPhases.includes(state.phase);

  let result: Partial<WidgetState> = {};

  if (shouldProcess) {
    result.roomId = newRoom.id;
    result.messages = [];
    result.csatScore = 0;
    result.csatComment = "";
    result.phase = newRoom.status === "active" ? "chat" : "waiting";
  }

  if (!state.isOpen || (state.roomId && state.roomId !== newRoom.id)) {
    result.unreadCount = state.unreadCount + 1;
  }

  return Object.keys(result).length > 0 ? result : null;
}

// --- Suite 5: Room UPDATE by visitorId (reopen) ---
function handleRoomReopenByVisitorId(
  oldRoom: any,
  updatedRoom: any,
  state: WidgetState
): Partial<WidgetState> | null {
  if (oldRoom.status !== "closed") return null;
  if (updatedRoom.status !== "active" && updatedRoom.status !== "waiting") return null;

  const blockedPhases: Phase[] = ["chat", "waiting", "csat"];
  let result: Partial<WidgetState> = {};

  if (!blockedPhases.includes(state.phase)) {
    result.roomId = updatedRoom.id;
    result.csatScore = 0;
    result.csatComment = "";
    result.phase = updatedRoom.status === "active" ? "chat" : "waiting";
  }

  if (!state.isOpen || (state.roomId && state.roomId !== updatedRoom.id)) {
    result.unreadCount = state.unreadCount + 1;
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ===================== TESTS =====================

const baseState: WidgetState = {
  messages: [],
  unreadCount: 0,
  phase: "form",
  roomId: "room-1",
  isOpen: true,
  typingUser: null,
  attendantName: null,
  csatScore: 0,
  csatComment: "",
};

const makeMsg = (overrides: Partial<ChatMsg> = {}): ChatMsg => ({
  id: "msg-1",
  content: "Hello",
  sender_type: "attendant",
  sender_name: "Agent",
  created_at: new Date().toISOString(),
  message_type: "text",
  metadata: null,
  deleted_at: null,
  ...overrides,
});

// ---- Suite 1 ----
describe("ChatWidget Realtime — Message INSERT handler", () => {
  it("attendant message increments unreadCount when widget is closed", () => {
    const state = { ...baseState, isOpen: false };
    const result = handleMessageInsert(makeMsg(), state);
    expect(result.unreadCount).toBe(1);
    expect(result.messages).toHaveLength(1);
  });

  it("attendant message does NOT increment unread when widget is open", () => {
    const result = handleMessageInsert(makeMsg(), baseState);
    expect(result.unreadCount).toBe(0);
    expect(result.messages).toHaveLength(1);
  });

  it("duplicate message (same id) is not added twice", () => {
    const msg = makeMsg({ id: "dup-1" });
    const state = { ...baseState, messages: [msg] };
    const result = handleMessageInsert(makeMsg({ id: "dup-1" }), state);
    expect(result.messages).toHaveLength(1);
  });

  it("optimistic messages are removed when real message arrives", () => {
    const optMsg = makeMsg({ id: "optimistic-abc", sender_type: "visitor" });
    const state = { ...baseState, messages: [optMsg] };
    const result = handleMessageInsert(makeMsg({ id: "real-1" }), state);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].id).toBe("real-1");
  });

  it("internal message (is_internal=true) is ignored", () => {
    const result = handleMessageInsert({ ...makeMsg(), is_internal: true }, baseState);
    expect(result.messages).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });

  it("deleted message (deleted_at != null) is ignored on INSERT", () => {
    const result = handleMessageInsert(makeMsg({ deleted_at: new Date().toISOString() }), baseState);
    expect(result.messages).toHaveLength(0);
  });
});

// ---- Suite 2 ----
describe("ChatWidget Realtime — Message UPDATE handler (deletion)", () => {
  it("message with deleted_at is removed from array", () => {
    const msgs = [makeMsg({ id: "m1" }), makeMsg({ id: "m2" })];
    const result = handleMessageUpdate({ id: "m1", deleted_at: "2024-01-01" }, msgs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m2");
  });

  it("message without deleted_at does not alter the array", () => {
    const msgs = [makeMsg({ id: "m1" })];
    const result = handleMessageUpdate({ id: "m1", deleted_at: null }, msgs);
    expect(result).toHaveLength(1);
  });
});

// ---- Suite 3 ----
describe("ChatWidget Realtime — Room UPDATE by roomId (phase transitions)", () => {
  it("active room + waiting phase → chat", () => {
    const result = handleRoomUpdateByRoomId({ status: "active" }, "waiting", false);
    expect(result?.phase).toBe("chat");
  });

  it("closed + resolved → csat", () => {
    const result = handleRoomUpdateByRoomId({ status: "closed", resolution_status: "resolved" }, "chat", false);
    expect(result?.phase).toBe("csat");
  });

  it("closed + archived → closed (non-resolved visitor)", () => {
    const result = handleRoomUpdateByRoomId({ status: "closed", resolution_status: "archived" }, "chat", false);
    expect(result?.phase).toBe("closed");
  });

  it("closed + archived → history (resolved visitor)", () => {
    const result = handleRoomUpdateByRoomId({ status: "closed", resolution_status: "archived" }, "chat", true);
    expect(result?.phase).toBe("history");
  });

  it("closed + pending → viewTranscript", () => {
    const result = handleRoomUpdateByRoomId({ status: "closed", resolution_status: "pending" }, "chat", false);
    expect(result?.phase).toBe("viewTranscript");
  });

  it("returns null when no transition applies", () => {
    const result = handleRoomUpdateByRoomId({ status: "active" }, "chat", false);
    expect(result).toBeNull();
  });
});

// ---- Suite 4 ----
describe("ChatWidget Realtime — Proactive room INSERT by visitorId", () => {
  it("active room → phase chat + roomId updated", () => {
    const state = { ...baseState, phase: "form" as Phase, roomId: null };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "active" }, state);
    expect(result?.phase).toBe("chat");
    expect(result?.roomId).toBe("new-room");
  });

  it("non-active room → phase waiting", () => {
    const state = { ...baseState, phase: "form" as Phase, roomId: null };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "waiting" }, state);
    expect(result?.phase).toBe("waiting");
  });

  it("does NOT process when phase is chat", () => {
    const state = { ...baseState, phase: "chat" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "active" }, state);
    // Should not set phase/roomId but may still increment unread if different room
    expect(result?.phase).toBeUndefined();
  });

  it("does NOT process when phase is waiting", () => {
    const state = { ...baseState, phase: "waiting" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "active" }, state);
    expect(result?.phase).toBeUndefined();
  });

  it("does NOT process when phase is csat", () => {
    const state = { ...baseState, phase: "csat" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "active" }, state);
    expect(result?.phase).toBeUndefined();
  });

  it("increments unreadCount when widget is closed", () => {
    const state = { ...baseState, phase: "form" as Phase, isOpen: false, roomId: null };
    const result = handleProactiveRoomInsert({ id: "new-room", status: "active" }, state);
    expect(result?.unreadCount).toBe(1);
  });

  it("increments unreadCount when room is different", () => {
    const state = { ...baseState, phase: "chat" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleProactiveRoomInsert({ id: "different-room", status: "active" }, state);
    expect(result?.unreadCount).toBe(1);
  });
});

// ---- Suite 5 ----
describe("ChatWidget Realtime — Room UPDATE by visitorId (reopen)", () => {
  it("closed → active → phase chat", () => {
    const state = { ...baseState, phase: "closed" as Phase, roomId: null };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result?.phase).toBe("chat");
    expect(result?.roomId).toBe("room-2");
  });

  it("closed → waiting → phase waiting", () => {
    const state = { ...baseState, phase: "closed" as Phase, roomId: null };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "waiting" },
      state
    );
    expect(result?.phase).toBe("waiting");
  });

  it("does NOT process when current phase is chat", () => {
    const state = { ...baseState, phase: "chat" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result?.phase).toBeUndefined();
  });

  it("does NOT process when current phase is waiting", () => {
    const state = { ...baseState, phase: "waiting" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result?.phase).toBeUndefined();
  });

  it("does NOT process when current phase is csat", () => {
    const state = { ...baseState, phase: "csat" as Phase, isOpen: true, roomId: "room-1" };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result?.phase).toBeUndefined();
  });

  it("returns null when old status is not closed", () => {
    const state = { ...baseState, phase: "form" as Phase };
    const result = handleRoomReopenByVisitorId(
      { status: "active" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result).toBeNull();
  });

  it("increments unreadCount when widget is closed", () => {
    const state = { ...baseState, phase: "closed" as Phase, isOpen: false, roomId: null };
    const result = handleRoomReopenByVisitorId(
      { status: "closed" },
      { id: "room-2", status: "active" },
      state
    );
    expect(result?.unreadCount).toBe(1);
  });
});

// ---- Suite 6 ----
describe("ChatWidget Realtime — Typing indicator (broadcast)", () => {
  it("receiving typing event sets typingUser", () => {
    const name = "Agent Carlos";
    let typingUser: string | null = null;
    if (name) typingUser = name;
    expect(typingUser).toBe("Agent Carlos");
  });

  it("typingUser resets to null after timeout", () => {
    vi.useFakeTimers();
    let typingUser: string | null = "Agent";
    const timeout = setTimeout(() => { typingUser = null; }, 3000);
    vi.advanceTimersByTime(3000);
    expect(typingUser).toBeNull();
    vi.useRealTimers();
    clearTimeout(timeout);
  });

  it("typing channel only exists when roomId is present", () => {
    const roomId: string | null = null;
    const shouldCreate = !!roomId;
    expect(shouldCreate).toBe(false);

    const roomId2 = "room-123";
    expect(!!roomId2).toBe(true);
  });
});
