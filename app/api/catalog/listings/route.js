import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelIdStr = searchParams.get('modelId');

    if (!modelIdStr) {
      return NextResponse.json(
        { error: 'modelId is required.' },
        { status: 400 }
      );
    }

    const modelId = parseInt(modelIdStr, 10);
    if (isNaN(modelId)) {
      return NextResponse.json(
        { error: 'modelId must be a valid integer.' },
        { status: 400 }
      );
    }

    const listings = await prisma.stockListing.findMany({
      where: {
        modelId: modelId,
        status: 'APPROVED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Model listings API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching listings.' },
      { status: 500 }
    );
  }
}
