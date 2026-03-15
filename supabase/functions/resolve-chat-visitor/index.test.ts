import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/resolve-chat-visitor`;
const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
};

Deno.test("retorna 400 sem api_key", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "api_key is required");
});

Deno.test("retorna 401 com api_key invalida", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ api_key: "invalid_key_12345_abcdef" }),
  });
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "invalid_api_key");
});

Deno.test("retorna 401 com api_key de prefixo valido mas hash errado", async () => {
  // A key with a valid-looking prefix but wrong full hash
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ api_key: "npsk_test1234_this_is_a_fake_key_with_wrong_hash" }),
  });
  // Should return 401 because either prefix not found or hash mismatch
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "invalid_api_key");
});

Deno.test("retorna formato correto no erro de api_key invalida", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ api_key: "short" }),
  });
  // Short key should still be handled (prefix will be "short" substring)
  assertEquals(res.status, 401);
  const body = await res.json();
  assertExists(body.error);
  assertEquals(body.visitor_token, null);
});

Deno.test("OPTIONS retorna CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: HEADERS,
  });
  assertEquals(res.status, 200);
  const corsHeader = res.headers.get("access-control-allow-origin");
  assertEquals(corsHeader, "*");
  await res.text(); // consume body
});
