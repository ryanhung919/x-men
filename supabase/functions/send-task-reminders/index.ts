// @ts-nocheck: Deno environment doesn't have full TypeScript support for edge functions
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTaskReminders } from "./task-reminders-wrapper.ts";

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
export { sendTaskReminders };

Deno.serve(async (_req: Request) => {
  try {
    // Pass Deno env vars explicitly to the wrapper
    const result = await sendTaskReminders(
      getSupabaseClient(),
      sendEmail,
      {
        url: Deno.env.get("SUPABASE_URL") ?? "",
        serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      }
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
        emailsSent: [],
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});