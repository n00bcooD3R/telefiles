import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/',           // Public landing page
  '/sign-in(.*)', // Clerk sign-in routes
  '/sign-up(.*)', // Clerk sign-up routes
]);

// Export named 'proxy' function for Next.js 16 proxy convention
export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Force authentication for protected routes (e.g. /dashboard and api endpoints)
    await auth.protect();
  }
});

// Configure matchers
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
