import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query parameter is required.' },
        { status: 400 }
      );
    }

    const log = await prisma.searchLog.create({
      data: {
        query: query.trim(),
      },
    });

    return NextResponse.json({ success: true, logId: log.id }, { status: 201 });
  } catch (error) {
    console.error('Search Log API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while logging the search.' },
      { status: 500 }
    );
  }
}
