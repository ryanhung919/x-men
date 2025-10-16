import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a new Supabase client with the given URL and anonymous key.
 * In development mode with BYPASS_AUTH=true, returns a mock client.
 * @returns {SupabaseClient} A new Supabase client.
 */
export function createClient() {
  // Return mock client in development mode


  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}