import { NextRequest, NextResponse } from 'next/server';

// Stub endpoint for emails - returns empty data
// Email functionality is not fully implemented yet

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const guestId = searchParams.get('guest_id');
  const unassigned = searchParams.get('unassigned');

  // Return empty emails array
  return NextResponse.json({
    emails: [],
    total: 0,
  });
}

export async function POST() {
  // Stub for creating/updating emails
  return NextResponse.json({
    success: true,
    message: 'Email functionality not implemented',
  });
}

export async function DELETE() {
  // Stub for deleting emails
  return NextResponse.json({
    success: true,
    message: 'Email functionality not implemented',
  });
}
