// @ts-nocheck: Deno environment doesn't have full TypeScript support for edge functions
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendDailyDigest } from "./daily-digest-wrapper.ts";

// Lazy initialization - only create when needed
let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }
  return supabase;
}

// Export for unit tests
export { sendDailyDigest };

Deno.serve(async (_req: Request) => {
  try {
    // Fetch all users from auth
    const url = `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users`;
    const authRes = await fetch(url, {
      headers: {
        apiKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    });

    if (!authRes.ok) {
      throw new Error(`Failed to fetch users: ${await authRes.text()}`);
    }

    const { users } = await authRes.json();

    // Pass users to the wrapper function
    const result = await sendDailyDigest(
      getSupabaseClient(),
      sendEmail,
      {
        url: Deno.env.get("SUPABASE_URL") ?? "",
        serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      },
      users
    );

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Error in Deno.serve:", err);
    return new Response(
      JSON.stringify({
        success: false,
        sent: 0,
        digestsSent: [],
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});