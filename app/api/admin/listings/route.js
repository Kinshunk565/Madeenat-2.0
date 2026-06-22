export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const payload = getAuthenticatedUser(request);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin login required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // e.g. PENDING, APPROVED, REJECTED

    const whereClause = status ? { status } : {};

    const listings = await prisma.stockListing.findMany({
      where: whereClause,
      include: {
        laptopModel: {
          select: {
            name: true,
            brand: true,
          },
        },
        supplier: {
          select: {
            email: true,
            companyName: true,
            phoneNumber: true,
            address: true,
            city: true,
            country: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Admin listings GET Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
