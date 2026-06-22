import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    // Build the query filter if present
    const whereClause = query.trim() !== ''
      ? {
          OR: [
            { name: { contains: query } },
            { brand: { contains: query } },
          ],
        }
      : {};

    const laptopModels = await prisma.laptopModel.findMany({
      where: whereClause,
      include: {
        listings: {
          where: {
            status: 'APPROVED',
            isSold: false, // Only show active, unsold stock
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 1. Group models by brand
    const groupedByBrand = laptopModels.reduce((groups, model) => {
      const brand = model.brand || 'Other';
      if (!groups[brand]) {
        groups[brand] = [];
      }
      groups[brand].push(model);
      return groups;
    }, {});

    // 2. Identify top searched models (seeded selections)
    const topSearchedNames = [
      'Dell XPS 15 9530',
      'MacBook Pro 16" (M3 Max)',
      'Lenovo ThinkPad X1 Carbon Gen 11',
    ];

    const topSearchedModels = await prisma.laptopModel.findMany({
      where: {
        name: { in: topSearchedNames },
      },
      include: {
        listings: {
          where: { status: 'APPROVED', isSold: false },
        },
      },
    });

    return NextResponse.json({
      laptopModels,
      groupedByBrand,
      topSearchedModels,
      brands: Object.keys(groupedByBrand).sort(),
    });
  } catch (error) {
    console.error('Catalog API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the catalog.' },
      { status: 500 }
    );
  }
}
