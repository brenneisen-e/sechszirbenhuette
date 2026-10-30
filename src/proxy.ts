import { NextRequest, NextResponse } from 'next/server';

import { isAdminAuthenticated } from '@/lib/server/adminAuth';

// Zentrale Schranke für alle Admin-APIs: Jede Route unter /api/admin braucht
// eine gültige Admin-Session (src/lib/server/adminAuth.ts). Neue Routen sind
// damit automatisch geschützt.
//
// Ausnahmen:
// - /api/admin/auth — der Login selbst
// - /api/admin/media/file/… — liefert Bilder aus R2 für die öffentliche Website

function isPublic(pathname: string): boolean {
  return pathname === '/api/admin/auth' || pathname.startsWith('/api/admin/media/file/');
}

export async function proxy(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
