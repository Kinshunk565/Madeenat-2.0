import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const payload = getAuthenticatedUser(request);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin login required.' },
        { status: 403 }
      );
    }

    const listingId = parseInt(params.id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json(
        { error: 'Invalid listing ID.' },
        { status: 400 }
      );
    }

    const { status, rejectionReason } = await request.json();

    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED.' },
        { status: 400 }
      );
    }

    if (status === 'REJECTED' && (!rejectionReason || rejectionReason.trim() === '')) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a listing.' },
        { status: 400 }
      );
    }

    // Verify listing exists
    const listing = await prisma.stockListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    // Update listing status
    const updatedListing = await prisma.stockListing.update({
      where: { id: listingId },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : null,
      },
    });

    return NextResponse.json({
      message: `Listing status updated to ${status}.`,
      listing: updatedListing,
    });
  } catch (error) {
    console.error('Admin listing decision PUT Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during status update.' },
      { status: 500 }
    );
  }
}
