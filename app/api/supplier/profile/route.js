import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PUT(request) {
  try {
    const payload = getAuthenticatedUser(request);
    if (!payload || payload.role !== 'SUPPLIER') {
      return NextResponse.json(
        { error: 'Unauthorized. Supplier session required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyName, phoneNumber, address, city, country } = body;

    const updateData = {};
    if (companyName !== undefined) updateData.companyName = companyName.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (country !== undefined) updateData.country = country.trim();

    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        companyName: true,
        phoneNumber: true,
        address: true,
        city: true,
        country: true,
      },
    });

    return NextResponse.json({
      message: 'Company profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Supplier profile PUT Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}
