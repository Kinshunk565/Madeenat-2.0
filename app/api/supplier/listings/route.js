export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

import { read, utils } from 'xlsx';

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

// Helper to extract specs from a row
function extractSpecsFromRow(row) {
  const entries = Object.entries(row).map(([key, val]) => ({
    key: key.toLowerCase().trim(),
    val: String(val).trim(),
  }));

  const rowString = entries.map(e => `${e.key}: ${e.val}`).join(' ').toLowerCase();

  // Find model name column
  let modelName = '';
  const modelKeys = ['model', 'modelname', 'laptop', 'item', 'description', 'desc', 'name', 'product', 'details', 'specifications'];
  for (const k of modelKeys) {
    const found = entries.find(e => e.key.includes(k));
    if (found && found.val && found.val.length > 2) {
      modelName = found.val;
      break;
    }
  }

  if (!modelName) {
    // Fallback: first non-numeric string column
    for (const e of entries) {
      if (e.val && isNaN(Number(e.val)) && e.val.length > 3) {
        modelName = e.val;
        break;
      }
    }
  }

  if (!modelName) return null;

  // Detect brand
  let brand = 'Other';
  const brands = ['Acer', 'Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'Panasonic', 'Samsung', 'Toshiba'];
  for (const b of brands) {
    if (modelName.toLowerCase().includes(b.toLowerCase()) || rowString.includes(b.toLowerCase())) {
      brand = b;
      break;
    }
  }

  // Sanitize model name - prepend brand if missing
  let sanitizedModel = modelName.trim();
  if (brand !== 'Other' && !sanitizedModel.toLowerCase().includes(brand.toLowerCase())) {
    sanitizedModel = `${brand} ${sanitizedModel}`;
  }

  // Parse CPU
  let cpu = 'Intel Core i5 8th';
  const cpuClean = rowString.replace(/\s+/g, ' ');
  for (const type of ['i3', 'i5', 'i7', 'i9']) {
    if (cpuClean.includes(type)) {
      const genMatch = cpuClean.match(new RegExp(`${type}[^0-9]*(\\d{1,2})`));
      if (genMatch) {
        const genNum = parseInt(genMatch[1], 10);
        let genSuffix = 'th';
        if (genNum === 2) genSuffix = 'nd';
        else if (genNum === 3) genSuffix = 'rd';

        if (genNum >= 2 && genNum <= 14) {
          cpu = `Intel Core ${type} ${genNum}${genSuffix}`;
          break;
        }
      }
    }
  }
  if (cpu === 'Intel Core i5 8th') {
    if (cpuClean.includes('i9')) cpu = 'Intel Core i9 13th';
    else if (cpuClean.includes('i7')) cpu = 'Intel Core i7 8th';
    else if (cpuClean.includes('i5')) cpu = 'Intel Core i5 8th';
    else if (cpuClean.includes('i3')) cpu = 'Intel Core i3 8th';
    else if (cpuClean.includes('ultra 5')) cpu = 'Intel Core Ultra 5';
    else if (cpuClean.includes('ultra 7')) cpu = 'Intel Core Ultra 7';
    else if (cpuClean.includes('ultra 9')) cpu = 'Intel Core Ultra 9';
    else if (cpuClean.includes('m1')) cpu = 'Apple M1';
    else if (cpuClean.includes('m2')) cpu = 'Apple M2';
    else if (cpuClean.includes('m3')) cpu = 'Apple M3';
    else if (cpuClean.includes('m4')) cpu = 'Apple M4';
    else if (cpuClean.includes('ryzen 3')) cpu = 'AMD Ryzen 3';
    else if (cpuClean.includes('ryzen 5')) cpu = 'AMD Ryzen 5';
    else if (cpuClean.includes('ryzen 7')) cpu = 'AMD Ryzen 7';
    else if (cpuClean.includes('ryzen 9')) cpu = 'AMD Ryzen 9';
  }

  // Parse RAM
  let ram = '16 GB';
  const ramMatch = rowString.match(/(\b8\b|\b16\b|\b24\b|\b32\b|\b48\b|\b64\b|\b96\b|\b128\b)\s*(gb|g|ddr)/i);
  if (ramMatch) {
    ram = `${ramMatch[1]} GB`;
  }

  // Parse SSD
  let ssd = '512 GB';
  const ssdMatch = rowString.match(/(\b128\b|\b256\b|\b512\b|\b1tb\b|\b2tb\b|\b4tb\b|\b1\s*tb\b|\b2\s*tb\b)\s*(gb|g|ssd|tb|hdd)?/i);
  if (ssdMatch) {
    const val = ssdMatch[1].toLowerCase();
    if (val.includes('tb') || val === '1' || val === '2' || val === '4') {
      ssd = val.includes('4') ? '4 TB' : val.includes('2') ? '2 TB' : '1 TB';
    } else {
      ssd = `${ssdMatch[1]} GB`;
    }
  }

  // Parse GPU
  let gpu = 'Integrated Graphics';
  if (rowString.includes('rtx')) {
    const match = rowString.match(/rtx\s*(\d{4})/i);
    gpu = match ? `NVIDIA GeForce RTX ${match[1]}` : 'NVIDIA GeForce RTX';
  } else if (rowString.includes('iris')) {
    gpu = 'Intel Iris Xe Graphics';
  } else if (rowString.includes('radeon')) {
    gpu = 'AMD Radeon';
  }

  // Parse Quantity
  let quantity = 1;
  const qtyField = entries.find(e => e.key.includes('qty') || e.key.includes('quantity') || e.key.includes('stock') || e.key.includes('count') || e.key.includes('pcs') || e.key.includes('units'));
  if (qtyField) {
    const parsed = parseInt(qtyField.val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      quantity = parsed;
    }
  }

  return { brand, modelName: sanitizedModel, cpu, ram, ssd, gpu, quantity };
}

// Submit listings
export async function POST(request) {
  try {
    const payload = getAuthenticatedUser(request);
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let category, phoneNumber, companyName, acceptTerms, tempSessionToken;
    let file = null;
    let brand, modelName, cpu, ram, ssd, gpu, quantity, modelId;

    if (isMultipart) {
      const formData = await request.formData();
      file = formData.get('file');
      category = formData.get('category') || 'USED_LIST';
      phoneNumber = formData.get('phoneNumber');
      companyName = formData.get('companyName');
      acceptTerms = formData.get('acceptTerms') === 'true';
      tempSessionToken = formData.get('tempSessionToken');
    } else {
      const body = await request.json();
      category = body.category || 'USED_LAPTOP';
      brand = body.brand;
      modelName = body.modelName;
      cpu = body.cpu;
      ram = body.ram;
      ssd = body.ssd;
      gpu = body.gpu;
      quantity = body.quantity;
      phoneNumber = body.phoneNumber;
      companyName = body.companyName;
      acceptTerms = body.acceptTerms;
      tempSessionToken = body.tempSessionToken;
    }

    if (!phoneNumber || !companyName) {
      return NextResponse.json(
        { error: 'Phone number and Company name are required.' },
        { status: 400 }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions.' },
        { status: 400 }
      );
    }

    // Determine supplier attribution
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

    // IF EXCEL FILE UPLOAD
    if (category === 'USED_LIST') {
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        return NextResponse.json({ error: 'The uploaded Excel file is empty.' }, { status: 400 });
      }

      let createdCount = 0;

      for (const row of rows) {
        const parsed = extractSpecsFromRow(row);
        if (parsed && parsed.modelName) {
          // Find or create LaptopModel in database
          let laptopModel = await prisma.laptopModel.findFirst({
            where: { name: { equals: parsed.modelName } },
          });

          if (!laptopModel) {
            laptopModel = await prisma.laptopModel.create({
              data: {
                name: parsed.modelName,
                brand: parsed.brand,
              },
            });
          }

          // Create pending StockListing for this model
          await prisma.stockListing.create({
            data: {
              modelId: laptopModel.id,
              cpu: parsed.cpu,
              ram: parsed.ram,
              ssd: parsed.ssd,
              gpu: parsed.gpu,
              quantity: parsed.quantity,
              phoneNumber: phoneNumber.trim(),
              companyName: companyName.trim(),
              status: 'PENDING',
              category: 'USED_LIST',
              tempSessionToken: dbTempToken,
              supplierId: supplierId,
            },
          });
          createdCount++;
        }
      }

      return NextResponse.json(
        { message: `Excel parsing complete. Submitted ${createdCount} items for approval.`, rowCount: rows.length },
        { status: 201 }
      );
    }

    // ELSE SINGLE LAPTOP JSON SUBMISSION
    if (!brand || !modelName || !cpu || !ram || !ssd || !gpu || !quantity) {
      return NextResponse.json(
        { error: 'All product specification fields (Brand, Model, CPU, RAM, SSD, GPU, Quantity) are required.' },
        { status: 400 }
      );
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number.' },
        { status: 400 }
      );
    }

    // Find or create LaptopModel
    let laptopModel = await prisma.laptopModel.findFirst({
      where: { name: { equals: modelName.trim() } },
    });

    if (!laptopModel) {
      laptopModel = await prisma.laptopModel.create({
        data: {
          name: modelName.trim(),
          brand: brand.trim(),
        },
      });
    }

    // Create listing in PENDING status
    const listing = await prisma.stockListing.create({
      data: {
        modelId: laptopModel.id,
        cpu,
        ram,
        ssd,
        gpu,
        quantity: parsedQuantity,
        phoneNumber: phoneNumber.trim(),
        companyName: companyName.trim(),
        status: 'PENDING',
        category: 'USED_LAPTOP',
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
