import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Check route types
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isPublicRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/seed'
  const isReportRoute = request.nextUrl.pathname.startsWith('/report')

  // Redirect to login if not authenticated (except for API, public routes)
  if (!user && !isApiRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Fetch and store user info in cookie for authenticated users
  if (user && !isApiRoute) {
    const userId = user.sub as string
    
    // Check if we already have user info in cookie
    const existingUserInfo = request.cookies.get('user-info')?.value
    
    if (!existingUserInfo) {
      // Fetch user info including department
      const { data: userInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('department_id')
        .eq('id', userId)
        .single()

      if (!userInfoError && userInfo) {
        // Store user department in cookie
        const userInfoData = {
          userId,
          departmentId: userInfo.department_id,
        }
        
        supabaseResponse.cookies.set('user-info', JSON.stringify(userInfoData), {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }
    }
  }

  // Check admin role for /report routes
  if (user && isReportRoute) {
    const userId = user.sub as string
    
    // Fetch user roles
    const { data: roleRows, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (error) {
      console.error('Error checking user roles:', error)
      const url = request.nextUrl.clone()
      url.pathname = '/tasks'
      return NextResponse.redirect(url)
    }

    const roles = roleRows?.map((r: { role: string }) => r.role) || []
    const isAdmin = roles.includes('admin')

    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}