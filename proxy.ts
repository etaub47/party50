import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // 1. Force-cast the method to 'any' to allow simple string arguments
                        (request.cookies.set as any)(name, value);

                        // 2. Do the same for the response object
                        (response.cookies.set as any)({ name, value, ...options });
                    });

                    // 3. Re-initialize the response to sync headers back to the request
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                }
            },
        }
    );

    // CRITICAL: This line must stay AFTER createServerClient
    // and is what triggers setAll if a session refresh is needed.
    await supabase.auth.getUser();

    return response;
}

export const config = {
    matcher: [
        // Apply proxy to all routes except static assets and internal Next.js files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
