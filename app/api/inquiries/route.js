import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(request) {
  try {
    const { stockListingId, buyerName, buyerPhone } = await request.json();

    if (!stockListingId) {
      return NextResponse.json(
        { error: 'stockListingId is required.' },
        { status: 400 }
      );
    }

    const parsedListingId = parseInt(stockListingId, 10);
    if (isNaN(parsedListingId)) {
      return NextResponse.json(
        { error: 'Invalid stock listing ID.' },
        { status: 400 }
      );
    }

    // Fetch listing details along with model details
    const listing = await prisma.stockListing.findUnique({
      where: { id: parsedListingId },
      include: {
        laptopModel: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Stock listing not found.' },
        { status: 404 }
      );
    }

    const messageText = `Hi What is the best price of ${listing.laptopModel.name}? (Enquiry coming from Madeenat.com)`;

    // 1. Save inquiry to database for tracking
    const inquiry = await prisma.inquiry.create({
      data: {
        stockListingId: parsedListingId,
        buyerName: buyerName || 'Anonymous Buyer',
        buyerPhone: buyerPhone || null,
        message: messageText,
      },
    });

    // 2. Trigger the WhatsApp Notification (using Twilio / mockup service)
    const whatsappResult = await sendWhatsAppNotification(
      listing.phoneNumber,
      listing.laptopModel.name,
      listing.companyName
    );

    return NextResponse.json({
      message: 'Inquiry registered and notification triggered.',
      inquiryId: inquiry.id,
      whatsappResult,
    }, { status: 201 });
  } catch (error) {
    console.error('Inquiries API POST Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while logging the inquiry.' },
      { status: 500 }
    );
  }
}
