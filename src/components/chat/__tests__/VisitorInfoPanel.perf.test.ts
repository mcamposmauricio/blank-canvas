import { describe, it, expect, vi } from "vitest";

// Track all channels created
const createdChannels: string[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
            range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
          }),
          then: undefined,
        }),
        in: vi.fn().mockReturnValue({
          then: undefined,
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    }),
    channel: vi.fn().mockImplementation((name: string) => {
      createdChannels.push(name);
      return {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({}),
      };
    }),
    removeChannel: vi.fn(),
  },
}));

describe("VisitorInfoPanel (Fix 2.1)", () => {
  it("does not create visitor-panel pg_changes channel", async () => {
    // Read the source file and check for pg_changes pattern
    // This is a static analysis test — the pg_changes listener was removed
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/components/chat/VisitorInfoPanel.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should NOT have any channel creation with visitor-panel prefix
    expect(content).not.toMatch(/channel\(.*visitor-panel/);

    // Should NOT have postgres_changes listener in this component
    expect(content).not.toMatch(/postgres_changes/);

    // Should have the comment about removal
    expect(content).toMatch(/pg_changes listener removed/i);
  });

  it("fetchData is called via useEffect on visitorId change (not realtime)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/components/chat/VisitorInfoPanel.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should have useEffect that depends on visitorId
    expect(content).toMatch(/useEffect\(\(\) => \{[\s\S]*?fetchData/);
    expect(content).toMatch(/\[visitorId/);
  });
});
