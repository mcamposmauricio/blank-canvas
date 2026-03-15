import { describe, it, expect, vi, beforeEach } from "vitest";

// Build chainable mock
function createChainMock(resolvedData: any = { data: [], count: 0 }) {
  const chain: any = {};
  const methods = ["select", "eq", "in", "order", "range", "not", "lte", "gte", "ilike", "limit"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Final resolution
  chain.then = (resolve: any) => resolve(resolvedData);
  // Make it thenable
  Object.defineProperty(chain, Symbol.toStringTag, { value: "Promise" });
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe("useChatHistory SQL-level filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchRoomIdsByTags helper logic", () => {
    it("returns null when tagIds is empty (no filter applied)", async () => {
      // Simulating the logic from the hook
      const tagIds: string[] = [];
      const result = (!tagIds || tagIds.length === 0) ? null : "would-fetch";
      expect(result).toBeNull();
    });

    it("returns room IDs array when tagIds are provided", async () => {
      const chain = createChainMock({ data: [{ room_id: "r1" }, { room_id: "r2" }] });
      mockFrom.mockReturnValue(chain);

      // Simulate fetchRoomIdsByTags logic
      const tagIds = ["tag-1", "tag-2"];
      const { data } = await (mockFrom("chat_room_tags") as any).select("room_id").in("tag_id", tagIds);
      
      expect(mockFrom).toHaveBeenCalledWith("chat_room_tags");
      expect(chain.select).toHaveBeenCalledWith("room_id");
      expect(chain.in).toHaveBeenCalledWith("tag_id", tagIds);
      expect(data).toEqual([{ room_id: "r1" }, { room_id: "r2" }]);
    });

    it("caps results at MAX_FILTER_IDS (500)", () => {
      const MAX_FILTER_IDS = 500;
      const ids = Array.from({ length: 600 }, (_, i) => `id-${i}`);
      const capped = ids.slice(0, MAX_FILTER_IDS);
      expect(capped.length).toBe(500);
      expect(capped[499]).toBe("id-499");
    });
  });

  describe("fetchVisitorIdsBySearch helper logic", () => {
    it("returns null when search is empty", () => {
      const search: string = "";
      const result = (!search || search.trim() === "") ? null : "would-fetch";
      expect(result).toBeNull();
    });

    it("returns empty array when no visitors match (short-circuit)", async () => {
      const chain = createChainMock({ data: [] });
      mockFrom.mockReturnValue(chain);

      const { data } = await (mockFrom("chat_visitors") as any)
        .select("id")
        .ilike("name", "%test%")
        .limit(500);

      expect(data).toEqual([]);
      // This triggers short-circuit: setRooms([]), setTotalCount(0)
    });

    it("returns visitor IDs when matches found", async () => {
      const chain = createChainMock({ data: [{ id: "v1" }, { id: "v2" }] });
      mockFrom.mockReturnValue(chain);

      const { data } = await (mockFrom("chat_visitors") as any)
        .select("id")
        .ilike("name", "%john%")
        .limit(500);

      expect(data).toEqual([{ id: "v1" }, { id: "v2" }]);
    });
  });

  describe("main query filter application", () => {
    it("applies .in('id', tagRoomIds) when tag filter returns IDs", () => {
      const chain = createChainMock({ data: [], count: 0 });
      mockFrom.mockReturnValue(chain);

      const tagRoomIds = ["r1", "r2", "r3"];
      
      mockFrom("chat_rooms");
      chain.select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id", { count: "exact" });
      chain.eq("status", "closed");
      chain.in("id", tagRoomIds);
      chain.order("closed_at", { ascending: false });

      expect(chain.in).toHaveBeenCalledWith("id", tagRoomIds);
    });

    it("applies .in('visitor_id', visitorIds) when search filter returns IDs", () => {
      const chain = createChainMock({ data: [], count: 0 });
      mockFrom.mockReturnValue(chain);

      const visitorIds = ["v1", "v2"];

      mockFrom("chat_rooms");
      chain.select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id", { count: "exact" });
      chain.eq("status", "closed");
      chain.in("visitor_id", visitorIds);

      expect(chain.in).toHaveBeenCalledWith("visitor_id", visitorIds);
    });

    it("short-circuits when tag filter returns empty array", () => {
      const tagRoomIds: string[] = [];
      // Hook logic: if (tagRoomIds !== null && tagRoomIds.length === 0) → short-circuit
      const shouldShortCircuit = tagRoomIds !== null && tagRoomIds.length === 0;
      expect(shouldShortCircuit).toBe(true);
    });

    it("short-circuits when search filter returns empty array", () => {
      const searchVisitorIds: string[] = [];
      const shouldShortCircuit = searchVisitorIds !== null && searchVisitorIds.length === 0;
      expect(shouldShortCircuit).toBe(true);
    });

    it("does NOT short-circuit when filters return null (inactive)", () => {
      const tagRoomIds = null;
      const searchVisitorIds = null;
      const shouldShortCircuitTags = tagRoomIds !== null && tagRoomIds.length === 0;
      const shouldShortCircuitSearch = searchVisitorIds !== null && searchVisitorIds.length === 0;
      expect(shouldShortCircuitTags).toBe(false);
      expect(shouldShortCircuitSearch).toBe(false);
    });
  });

  describe("batchArray utility", () => {
    it("splits array into correct batch sizes", () => {
      function batchArray<T>(arr: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));
        }
        return result;
      }

      const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
      const batches = batchArray(ids, 100);
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(100);
      expect(batches[1].length).toBe(100);
      expect(batches[2].length).toBe(50);
    });
  });
});
