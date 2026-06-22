import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const listingId = parseInt(params.id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json(
        { error: 'Invalid listing ID.' },
        { status: 400 }
      );
    }

    const payload = getAuthenticatedUser(request);
    const body = await request.json();
    const { quantity, isSold, cpu, ram, ssd, gpu, tempToken } = body;

    // Fetch listing
    const listing = await prisma.stockListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    // Verify ownership
    let hasPermission = false;
    if (payload && payload.role === 'SUPPLIER' && listing.supplierId === payload.id) {
      hasPermission = true;
    } else if (tempToken && listing.tempSessionToken === tempToken.trim()) {
      hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to edit this listing.' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {};
    
    if (quantity !== undefined) {
      const parsedQty = parseInt(quantity, 10);
      if (isNaN(parsedQty) || parsedQty < 0) {
        return NextResponse.json(
          { error: 'Quantity must be a non-negative number.' },
          { status: 400 }
        );
      }
      updateData.quantity = parsedQty;
    }

    if (isSold !== undefined) {
      updateData.isSold = !!isSold;
      if (isSold) {
        updateData.quantity = 0; // Set stock to 0 if sold
      }
    }

    if (cpu) updateData.cpu = cpu;
    if (ram) updateData.ram = ram;
    if (ssd) updateData.ssd = ssd;
    if (gpu) updateData.gpu = gpu;

    // If edited, we send it back to PENDING so admin re-reviews it (standard security precaution)
    updateData.status = 'PENDING';

    const updatedListing = await prisma.stockListing.update({
      where: { id: listingId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Stock listing updated successfully and sent for review.',
      listing: updatedListing,
    });
  } catch (error) {
    console.error('Update supplier listing PUT Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during update.' },
      { status: 500 }
    );
  }
}
