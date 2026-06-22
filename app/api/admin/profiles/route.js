export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const payload = getAuthenticatedUser(request);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 403 }
      );
    }

    const suppliers = await prisma.user.findMany({
      where: {
        role: 'SUPPLIER',
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        phoneNumber: true,
        address: true,
        city: true,
        country: true,
        createdAt: true,
      },
      orderBy: {
        companyName: 'asc',
      },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Admin GET Profiles Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching supplier profiles.' },
      { status: 500 }
    );
  }
}
