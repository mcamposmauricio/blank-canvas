import { describe, it, expect } from "vitest";

/**
 * Tests for useChatRooms logic — sorting, unread, inline updates, message activity.
 * Pure functions extracted from useChatRealtime.ts behavior.
 */

interface ChatRoom {
  id: string;
  status: string;
  attendant_id: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_type?: string;
  unread_count?: number;
  visitor_name?: string;
  assigned_at?: string | null;
  closed_at?: string | null;
}

// SORT_ROOMS — exact replica from useChatRealtime.ts
const SORT_ROOMS = (a: ChatRoom, b: ChatRoom) => {
  const aU = a.unread_count ?? 0;
  const bU = b.unread_count ?? 0;
  if (aU > 0 && bU === 0) return -1;
  if (aU === 0 && bU > 0) return 1;
  const aTime = a.last_message_at || a.created_at;
  const bTime = b.last_message_at || b.created_at;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
};

// markRoomAsRead — sets unread_count to 0 locally
function markRoomAsRead(rooms: ChatRoom[], roomId: string): ChatRoom[] {
  return rooms.map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r));
}

interface RoomStatusPayload {
  room_id: string;
  status?: string;
  attendant_id?: string | null;
  priority?: string;
  assigned_at?: string | null;
  closed_at?: string | null;
  updated_at?: string;
}

// Inline patch for room status change
function handleRoomStatusChange(
  rooms: ChatRoom[],
  payload: RoomStatusPayload,
  excludeClosed: boolean
): { rooms: ChatRoom[]; needsFetch: boolean } {
  const roomId = payload.room_id;

  if (payload.status === "_deleted") {
    return { rooms: rooms.filter((r) => r.id !== roomId), needsFetch: false };
  }

  if (excludeClosed && payload.status === "closed") {
    return { rooms: rooms.filter((r) => r.id !== roomId), needsFetch: false };
  }

  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx === -1) {
    return { rooms, needsFetch: true };
  }

  const patched = [...rooms];
  patched[idx] = {
    ...patched[idx],
    status: payload.status ?? patched[idx].status,
    attendant_id: payload.attendant_id !== undefined ? payload.attendant_id : patched[idx].attendant_id,
    priority: (payload.priority ?? patched[idx].priority) as string,
    assigned_at: payload.assigned_at ?? patched[idx].assigned_at,
    closed_at: payload.closed_at ?? patched[idx].closed_at,
    updated_at: payload.updated_at ?? patched[idx].updated_at,
  };
  return { rooms: patched, needsFetch: false };
}

// Message activity handler — updates last_message + unread
function handleMessageActivity(
  rooms: ChatRoom[],
  roomId: string,
  senderType: string,
  content: string,
  createdAt: string,
  selectedRoomId: string | null
): ChatRoom[] {
  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx === -1) return rooms;

  const patched = [...rooms];
  const room = { ...patched[idx] };
  room.last_message = content;
  room.last_message_at = createdAt;
  room.last_message_sender_type = senderType;

  if (senderType === "visitor" && roomId !== selectedRoomId) {
    room.unread_count = (room.unread_count ?? 0) + 1;
  }

  patched[idx] = room;
  return [...patched].sort(SORT_ROOMS);
}

const makeRoom = (id: string, overrides: Partial<ChatRoom> = {}): ChatRoom => ({
  id,
  status: "active",
  attendant_id: null,
  priority: "medium",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  unread_count: 0,
  ...overrides,
});

// ========== Sorting ==========
describe("useChatRooms — Sorting", () => {
  it("rooms with unread_count > 0 appear first", () => {
    const rooms = [
      makeRoom("r1", { unread_count: 0, last_message_at: "2024-01-03T00:00:00Z" }),
      makeRoom("r2", { unread_count: 3, last_message_at: "2024-01-01T00:00:00Z" }),
    ];
    const sorted = [...rooms].sort(SORT_ROOMS);
    expect(sorted[0].id).toBe("r2");
  });

  it("among rooms with same unread status, sorts by last_message_at desc", () => {
    const rooms = [
      makeRoom("r1", { unread_count: 0, last_message_at: "2024-01-01T00:00:00Z" }),
      makeRoom("r2", { unread_count: 0, last_message_at: "2024-01-03T00:00:00Z" }),
    ];
    const sorted = [...rooms].sort(SORT_ROOMS);
    expect(sorted[0].id).toBe("r2");
  });

  it("falls back to created_at when last_message_at is missing", () => {
    const rooms = [
      makeRoom("r1", { unread_count: 0, created_at: "2024-01-01T00:00:00Z" }),
      makeRoom("r2", { unread_count: 0, created_at: "2024-01-05T00:00:00Z" }),
    ];
    const sorted = [...rooms].sort(SORT_ROOMS);
    expect(sorted[0].id).toBe("r2");
  });

  it("markRoomAsRead zeros unread_count locally", () => {
    const rooms = [makeRoom("r1", { unread_count: 5 }), makeRoom("r2", { unread_count: 2 })];
    const result = markRoomAsRead(rooms, "r1");
    expect(result.find((r) => r.id === "r1")!.unread_count).toBe(0);
    expect(result.find((r) => r.id === "r2")!.unread_count).toBe(2);
  });
});

// ========== Inline update via broadcast ==========
describe("useChatRooms — Inline update via broadcast", () => {
  it("status 'closed' removes room when excludeClosed=true", () => {
    const rooms = [makeRoom("r1"), makeRoom("r2")];
    const result = handleRoomStatusChange(rooms, { room_id: "r1", status: "closed" }, true);
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].id).toBe("r2");
  });

  it("status '_deleted' removes room", () => {
    const rooms = [makeRoom("r1"), makeRoom("r2")];
    const result = handleRoomStatusChange(rooms, { room_id: "r1", status: "_deleted" }, false);
    expect(result.rooms).toHaveLength(1);
  });

  it("unknown room_id triggers fetchSingleRoom (needsFetch=true)", () => {
    const rooms = [makeRoom("r1")];
    const result = handleRoomStatusChange(rooms, { room_id: "r-unknown", status: "active" }, false);
    expect(result.needsFetch).toBe(true);
    expect(result.rooms).toHaveLength(1);
  });

  it("attendant_id updates inline without refetch", () => {
    const rooms = [makeRoom("r1", { attendant_id: null })];
    const result = handleRoomStatusChange(rooms, { room_id: "r1", attendant_id: "att-1" }, false);
    expect(result.needsFetch).toBe(false);
    expect(result.rooms[0].attendant_id).toBe("att-1");
  });

  it("status updates inline", () => {
    const rooms = [makeRoom("r1", { status: "waiting" })];
    const result = handleRoomStatusChange(rooms, { room_id: "r1", status: "active" }, false);
    expect(result.rooms[0].status).toBe("active");
  });
});

// ========== Message activity ==========
describe("useChatRooms — Message activity", () => {
  it("increments unread for visitor message on non-selected room", () => {
    const rooms = [makeRoom("r1", { unread_count: 0 })];
    const result = handleMessageActivity(rooms, "r1", "visitor", "Oi", "2024-01-02T00:00:00Z", "r-other");
    expect(result[0].unread_count).toBe(1);
  });

  it("does NOT increment unread if room is selected", () => {
    const rooms = [makeRoom("r1", { unread_count: 0 })];
    const result = handleMessageActivity(rooms, "r1", "visitor", "Oi", "2024-01-02T00:00:00Z", "r1");
    expect(result[0].unread_count).toBe(0);
  });

  it("does NOT increment unread for attendant messages", () => {
    const rooms = [makeRoom("r1", { unread_count: 0 })];
    const result = handleMessageActivity(rooms, "r1", "attendant", "Oi", "2024-01-02T00:00:00Z", "r-other");
    expect(result[0].unread_count).toBe(0);
  });

  it("updates last_message and last_message_at", () => {
    const rooms = [makeRoom("r1")];
    const result = handleMessageActivity(rooms, "r1", "visitor", "Nova msg", "2024-06-15T12:00:00Z", null);
    expect(result[0].last_message).toBe("Nova msg");
    expect(result[0].last_message_at).toBe("2024-06-15T12:00:00Z");
  });

  it("re-sorts rooms after activity (active room moves to top)", () => {
    const rooms = [
      makeRoom("r1", { last_message_at: "2024-01-01T00:00:00Z" }),
      makeRoom("r2", { last_message_at: "2024-01-05T00:00:00Z" }),
    ];
    const result = handleMessageActivity(rooms, "r1", "visitor", "x", "2024-01-10T00:00:00Z", null);
    expect(result[0].id).toBe("r1");
  });
});
