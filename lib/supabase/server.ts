import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createDevAuthClient, isDevMode } from "@/lib/dev-user"

/**
 * Creates a Supabase client with the given URL and anon key.
 * Also sets up a cookie store to manage cookies.
 * In development mode with BYPASS_AUTH=true, returns a mock client.
 * @returns {Promise<SupabaseClient>} A promise that resolves to a Supabase client.
 */
export async function createClient() {
  // Return mock client in development mode
  if (isDevMode()) {
    console.log('🚧 Using development auth server client')
    return createDevAuthClient() as any
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
