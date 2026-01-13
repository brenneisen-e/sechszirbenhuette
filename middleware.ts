import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export const runtime = 'edge';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(de|en)/:path*']
};
