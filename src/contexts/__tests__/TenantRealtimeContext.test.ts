import { describe, it, expect, vi } from "vitest";

describe("TenantRealtimeContext (Fix 1.3 + 2.2)", () => {
  it("attendant_profiles channel uses UPDATE event filter in source code", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/contexts/TenantRealtimeContext.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Find the attendant channel section
    const attendantSection = content.slice(
      content.indexOf("tenant-attendants-pg"),
      content.indexOf(".subscribe", content.indexOf("tenant-attendants-pg")) + 20
    );

    // Should have event: "UPDATE" (not "*")
    expect(attendantSection).toMatch(/event:\s*"UPDATE"/);
    expect(attendantSection).not.toMatch(/event:\s*"\*"/);
  });

  it("safety net maps visitor_last_read_at in RoomStatusPayload", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/contexts/TenantRealtimeContext.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // The UPDATE handler for chat_rooms should map visitor_last_read_at
    expect(content).toMatch(/visitor_last_read_at:\s*updated\.visitor_last_read_at/);
  });

  it("RoomStatusPayload interface includes visitor_last_read_at field", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/contexts/TenantRealtimeContext.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract the RoomStatusPayload interface
    const interfaceMatch = content.match(/export interface RoomStatusPayload \{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![0]).toMatch(/visitor_last_read_at\?:\s*string\s*\|\s*null/);
  });

  it("safety net has UPDATE, INSERT and DELETE listeners for chat_rooms", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("src/contexts/TenantRealtimeContext.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Count occurrences of each event type for chat_rooms
    const safetySection = content.slice(
      content.indexOf("tenant-safety-net"),
      content.indexOf("tenant-attendants-pg")
    );

    expect(safetySection).toMatch(/event:\s*"UPDATE"[\s\S]*?table:\s*"chat_rooms"/);
    expect(safetySection).toMatch(/event:\s*"INSERT"[\s\S]*?table:\s*"chat_rooms"/);
    expect(safetySection).toMatch(/event:\s*"DELETE"[\s\S]*?table:\s*"chat_rooms"/);
  });
});
