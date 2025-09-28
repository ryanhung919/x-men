import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a new Supabase client with the given URL and anonymous key.
 * @returns {SupabaseClient} A new Supabase client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
