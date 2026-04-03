import { describe, it, expect } from "vitest";

/**
 * Tests for useAttendantQueues logic — inline attendant updates, unassigned room tracking.
 * Pure functions extracted from useChatRealtime.ts behavior.
 */

interface AttendantQueue {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  max_conversations: number;
  active_count: number;
  waiting_count: number;
}

interface UnassignedRoom {
  id: string;
  visitor_name: string;
  created_at: string;
  status: string;
}

interface AttendantUpdatePayload {
  attendant_id: string;
  status?: string;
  active_conversations?: number;
  display_name?: string;
}

interface RoomStatusPayload {
  room_id: string;
  status?: string;
  attendant_id?: string | null;
  updated_at?: string;
}

// Inline attendant update handler
function handleAttendantUpdate(
  attendants: AttendantQueue[],
  payload: AttendantUpdatePayload
): AttendantQueue[] {
  return attendants.map((a) =>
    a.id === payload.attendant_id
      ? {
          ...a,
          status: payload.status ?? a.status,
          active_count: payload.active_conversations ?? a.active_count,
          display_name: payload.display_name ?? a.display_name,
        }
      : a
  );
}

// Unassigned room handler for room status changes
function handleUnassignedRoomChange(
  unassigned: UnassignedRoom[],
  payload: RoomStatusPayload
): UnassignedRoom[] {
  const roomId = payload.room_id;

  if (payload.status === "_deleted" || payload.status === "closed") {
    return unassigned.filter((r) => r.id !== roomId);
  }

  if (payload.attendant_id) {
    return unassigned.filter((r) => r.id !== roomId);
  }

  if ((payload.status === "active" || payload.status === "waiting") && !payload.attendant_id) {
    if (unassigned.some((r) => r.id === roomId)) return unassigned;
    return [
      ...unassigned,
      {
        id: roomId,
        visitor_name: "Visitante",
        created_at: payload.updated_at ?? new Date().toISOString(),
        status: payload.status ?? "waiting",
      },
    ];
  }

  return unassigned;
}

const makeAtt = (id: string, overrides: Partial<AttendantQueue> = {}): AttendantQueue => ({
  id,
  user_id: `user-${id}`,
  display_name: `Agent ${id}`,
  status: "online",
  max_conversations: 5,
  active_count: 2,
  waiting_count: 0,
  ...overrides,
});

// ========== Attendant inline updates ==========
describe("useAttendantQueues — Inline attendant updates", () => {
  it("updates status by attendant id", () => {
    const atts = [makeAtt("a1", { status: "online" }), makeAtt("a2")];
    const result = handleAttendantUpdate(atts, { attendant_id: "a1", status: "away" });
    expect(result[0].status).toBe("away");
    expect(result[1].status).toBe("online");
  });

  it("updates active_conversations inline", () => {
    const atts = [makeAtt("a1", { active_count: 2 })];
    const result = handleAttendantUpdate(atts, { attendant_id: "a1", active_conversations: 5 });
    expect(result[0].active_count).toBe(5);
  });

  it("updates display_name inline", () => {
    const atts = [makeAtt("a1", { display_name: "Old Name" })];
    const result = handleAttendantUpdate(atts, { attendant_id: "a1", display_name: "New Name" });
    expect(result[0].display_name).toBe("New Name");
  });

  it("does not alter attendants with different id", () => {
    const atts = [makeAtt("a1"), makeAtt("a2")];
    const result = handleAttendantUpdate(atts, { attendant_id: "a1", status: "offline" });
    expect(result[1]).toEqual(atts[1]);
  });
});

// ========== Unassigned room tracking ==========
describe("useAttendantQueues — Unassigned room tracking", () => {
  it("closed status removes from unassigned", () => {
    const rooms: UnassignedRoom[] = [{ id: "r1", visitor_name: "V", created_at: "2024-01-01", status: "waiting" }];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r1", status: "closed" });
    expect(result).toHaveLength(0);
  });

  it("_deleted status removes from unassigned", () => {
    const rooms: UnassignedRoom[] = [{ id: "r1", visitor_name: "V", created_at: "2024-01-01", status: "waiting" }];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r1", status: "_deleted" });
    expect(result).toHaveLength(0);
  });

  it("room with attendant_id removes from unassigned", () => {
    const rooms: UnassignedRoom[] = [{ id: "r1", visitor_name: "V", created_at: "2024-01-01", status: "waiting" }];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r1", attendant_id: "att-1" });
    expect(result).toHaveLength(0);
  });

  it("active room without attendant adds to unassigned (dedup)", () => {
    const rooms: UnassignedRoom[] = [];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r-new", status: "active", updated_at: "2024-06-01" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r-new");
  });

  it("duplicate room is NOT added again", () => {
    const rooms: UnassignedRoom[] = [{ id: "r1", visitor_name: "V", created_at: "2024-01-01", status: "waiting" }];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r1", status: "waiting" });
    expect(result).toHaveLength(1);
  });

  it("waiting room without attendant adds to unassigned", () => {
    const rooms: UnassignedRoom[] = [];
    const result = handleUnassignedRoomChange(rooms, { room_id: "r2", status: "waiting" });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("waiting");
  });
});
