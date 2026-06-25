import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/users/:path*',
    '/api/papers/:path*',
    '/api/users/:path*',
  ],
};
