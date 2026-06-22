export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// Get listings for logged-in supplier or guest token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tempToken = searchParams.get('tempToken');
    const payload = getAuthenticatedUser(request);

    let whereClause = {};

    if (payload && payload.role === 'SUPPLIER') {
      whereClause = { supplierId: payload.id };
    } else if (tempToken) {
      whereClause = { tempSessionToken: tempToken };
    } else {
      return NextResponse.json(
        { error: 'Unauthorized. Supplier login or temporary token required.' },
        { status: 401 }
      );
    }

    const listings = await prisma.stockListing.findMany({
      where: whereClause,
      include: {
        laptopModel: {
          select: {
            name: true,
            brand: true,
          },
        },
        eventLogs: {
          select: {
            eventType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const listingsWithStats = listings.map((listing) => {
      const views = listing.eventLogs.filter((e) => e.eventType === 'VIEW').length;
      const clicks = listing.eventLogs.filter((e) => e.eventType === 'CLICK').length;
      
      const { eventLogs, ...rest } = listing;
      return {
        ...rest,
        views,
        clicks,
      };
    });

    return NextResponse.json({ listings: listingsWithStats });
  } catch (error) {
    console.error('Supplier listings GET Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Submit a new listing (supports guest and registered suppliers)
export async function POST(request) {
  try {
    const payload = getAuthenticatedUser(request);
    const body = await request.json();
    const {
      modelId,
      cpu,
      ram,
      ssd,
      gpu,
      quantity,
      phoneNumber,
      companyName,
      acceptTerms,
      category,
      tempSessionToken,
    } = body;

    // Standard field checks
    if (!modelId || !cpu || !ram || !ssd || !gpu || !quantity || !phoneNumber || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions.' },
        { status: 400 }
      );
    }

    const parsedModelId = parseInt(modelId, 10);
    const parsedQuantity = parseInt(quantity, 10);

    if (isNaN(parsedModelId) || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid model ID or quantity.' },
        { status: 400 }
      );
    }

    // Verify model exists
    const model = await prisma.laptopModel.findUnique({
      where: { id: parsedModelId },
    });
    if (!model) {
      return NextResponse.json(
        { error: 'Selected laptop model does not exist.' },
        { status: 404 }
      );
    }

    // Category check
    const listingCategory = category === 'USED_LIST' ? 'USED_LIST' : 'USED_LAPTOP';

    // Supplier attribution logic
    let supplierId = null;
    let dbTempToken = null;

    if (payload && payload.role === 'SUPPLIER') {
      supplierId = payload.id;
    } else if (tempSessionToken && tempSessionToken.trim() !== '') {
      dbTempToken = tempSessionToken.trim();
    } else {
      return NextResponse.json(
        { error: 'Supplier authentication or a temporary session token is required to submit stock.' },
        { status: 400 }
      );
    }

    // Create listing in PENDING status
    const listing = await prisma.stockListing.create({
      data: {
        modelId: parsedModelId,
        cpu,
        ram,
        ssd,
        gpu,
        quantity: parsedQuantity,
        phoneNumber: phoneNumber.trim(),
        companyName: companyName.trim(),
        status: 'PENDING',
        category: listingCategory,
        tempSessionToken: dbTempToken,
        supplierId: supplierId,
      },
    });

    return NextResponse.json(
      { message: 'Stock listing submitted successfully. Awaiting admin approval.', listing },
      { status: 201 }
    );
  } catch (error) {
    console.error('Supplier listings POST Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during submission.' },
      { status: 500 }
    );
  }
}
