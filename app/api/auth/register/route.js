import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, role, companyName, phoneNumber, tempSessionToken } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required.' },
        { status: 400 }
      );
    }

    if (role !== 'SUPPLIER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Invalid role specified.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists.' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: passwordHash,
        role,
        companyName: role === 'SUPPLIER' ? companyName || '' : null,
        phoneNumber: role === 'SUPPLIER' ? phoneNumber || '' : null,
      },
    });

    // Link guest listings if temp token is provided
    if (tempSessionToken && role === 'SUPPLIER') {
      await prisma.stockListing.updateMany({
        where: { tempSessionToken: tempSessionToken },
        data: {
          supplierId: user.id,
          tempSessionToken: null, // Clear temp token after mapping
        },
      });
    }

    // Generate login token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: 'Registration successful and logged in.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
      },
    }, { status: 201 });

    // Set cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
