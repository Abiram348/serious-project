import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/login(.*)',
  '/auth/signup(.*)',
  '/auth/forgot-password(.*)',
  '/api/webhooks/(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/auth/login(.*)',
  '/auth/signup(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect authenticated users away from auth pages
  if (userId && isAuthRoute(req)) {
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Protect non-public routes
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL('/auth/login', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
