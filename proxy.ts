import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes (that needs access to supabase, or protected by supabase auth except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - google*.html (Google Search Console site verification)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * We can modify this pattern to exclude more paths that don't require passing through middleware to check authentication, jwt token etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|google[0-9a-f]+\.html|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
