import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { listingId, listingIds, eventType } = body;

    if (!eventType || (eventType !== 'VIEW' && eventType !== 'CLICK')) {
      return NextResponse.json(
        { error: 'Invalid eventType. Must be VIEW or CLICK.' },
        { status: 400 }
      );
    }

    // Handle bulk views
    if (listingIds && Array.isArray(listingIds) && listingIds.length > 0) {
      const data = listingIds.map((id) => ({
        stockListingId: parseInt(id, 10),
        eventType,
      })).filter((item) => !isNaN(item.stockListingId));

      if (data.length > 0) {
        await prisma.listingEventLog.createMany({
          data,
        });
      }
      return NextResponse.json({ success: true, count: data.length }, { status: 201 });
    }

    // Handle single view/click
    if (listingId) {
      const parsedId = parseInt(listingId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { error: 'Invalid listingId.' },
          { status: 400 }
        );
      }

      const log = await prisma.listingEventLog.create({
        data: {
          stockListingId: parsedId,
          eventType,
        },
      });

      return NextResponse.json({ success: true, logId: log.id }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Either listingId or listingIds must be provided.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Event Tracking API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while logging the event.' },
      { status: 500 }
    );
  }
}
