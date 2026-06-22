import { NextResponse } from 'next/server';
import xlsx from 'xlsx';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse using SheetJS
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    }

    // Fetch all laptop models to match against
    const dbModels = await prisma.laptopModel.findMany();

    // Map of specs options to find best match
    const cpus = [
      'Intel Core i5-1340P',
      'Intel Core i7-13700H',
      'Intel Core i9-13900H',
      'AMD Ryzen 7 7840HS',
      'AMD Ryzen 9 7940HS',
      'Apple M2 Chip',
      'Apple M3 Pro',
      'Apple M3 Max'
    ];

    const rams = ['8 GB', '16 GB', '24 GB', '32 GB', '48 GB', '64 GB', '96 GB', '128 GB'];
    const ssds = ['256 GB', '512 GB', '1 TB', '2 TB', '4 TB', '8 TB'];
    const gpus = [
      'Intel Iris Xe Graphics',
      'AMD Radeon 780M',
      'NVIDIA GeForce RTX 4050',
      'NVIDIA GeForce RTX 4060',
      'NVIDIA GeForce RTX 4070',
      'NVIDIA GeForce RTX 4080',
      'NVIDIA GeForce RTX 4090',
      'Apple 10-Core GPU',
      'Apple 18-Core GPU',
      'Apple 40-Core GPU'
    ];

    // Simple heuristic parser scanning rows
    let matchedSpecs = {
      modelId: '',
      cpu: '',
      ram: '',
      ssd: '',
      gpu: '',
      quantity: '1',
    };

    // Concatenate all text in the first row to search specs, or look at individual cells
    // Usually, spreadsheets have rows like: Model | CPU | RAM | SSD | GPU | Qty
    // Let's scan the first 3 rows to find the best complete configuration
    for (const row of rows.slice(0, 5)) {
      const rowString = Object.values(row).join(' ').toLowerCase();

      // 1. Match Laptop Model
      if (!matchedSpecs.modelId) {
        for (const model of dbModels) {
          const modelKeywords = model.name.toLowerCase().split(' ');
          // Check if at least 2 keywords match or the name is contained
          const matchCount = modelKeywords.filter(kw => kw.length > 2 && rowString.includes(kw)).length;
          if (matchCount >= 2 || rowString.includes(model.name.toLowerCase())) {
            matchedSpecs.modelId = model.id.toString();
            break;
          }
        }
      }

      // 2. Match CPU
      if (!matchedSpecs.cpu) {
        for (const cpu of cpus) {
          // Check if core parts of CPU match (e.g. i7-13700H, Ryzen 7, M3 Max)
          const cleanCpu = cpu.toLowerCase().replace('intel core ', '').replace('amd ', '');
          if (rowString.includes(cleanCpu) || rowString.includes(cpu.toLowerCase())) {
            matchedSpecs.cpu = cpu;
            break;
          }
        }
        // Fallback checks
        if (!matchedSpecs.cpu) {
          if (rowString.includes('i9')) matchedSpecs.cpu = 'Intel Core i9-13900H';
          else if (rowString.includes('i7')) matchedSpecs.cpu = 'Intel Core i7-13700H';
          else if (rowString.includes('i5')) matchedSpecs.cpu = 'Intel Core i5-1340P';
          else if (rowString.includes('ryzen 9')) matchedSpecs.cpu = 'AMD Ryzen 9 7940HS';
          else if (rowString.includes('ryzen 7')) matchedSpecs.cpu = 'AMD Ryzen 7 7840HS';
          else if (rowString.includes('m3 max')) matchedSpecs.cpu = 'Apple M3 Max';
          else if (rowString.includes('m3 pro')) matchedSpecs.cpu = 'Apple M3 Pro';
          else if (rowString.includes('m2')) matchedSpecs.cpu = 'Apple M2 Chip';
        }
      }

      // 3. Match RAM
      if (!matchedSpecs.ram) {
        for (const ram of rams) {
          const numOnly = ram.split(' ')[0]; // '16', '32'
          const regex = new RegExp(`\\b${numOnly}\\s*(gb|g)\\b`, 'i');
          if (regex.test(rowString)) {
            matchedSpecs.ram = ram;
            break;
          }
        }
      }

      // 4. Match SSD
      if (!matchedSpecs.ssd) {
        // Look for 256GB, 512GB, 1TB, 2TB
        for (const ssd of ssds) {
          if (rowString.includes(ssd.toLowerCase()) || rowString.includes(ssd.toLowerCase().replace(' ', ''))) {
            matchedSpecs.ssd = ssd;
            break;
          }
        }
        // General fallback scans
        if (!matchedSpecs.ssd) {
          if (rowString.includes('256') || rowString.includes('256g')) matchedSpecs.ssd = '256 GB';
          else if (rowString.includes('512') || rowString.includes('512g')) matchedSpecs.ssd = '512 GB';
          else if (rowString.includes('1tb') || rowString.includes('1 tb') || rowString.includes('1000g')) matchedSpecs.ssd = '1 TB';
          else if (rowString.includes('2tb') || rowString.includes('2 tb')) matchedSpecs.ssd = '2 TB';
        }
      }

      // 5. Match GPU
      if (!matchedSpecs.gpu) {
        for (const gpu of gpus) {
          const cleanGpu = gpu.toLowerCase().replace('graphics', '').replace('geforce', '').trim();
          if (rowString.includes(cleanGpu) || rowString.includes(gpu.toLowerCase())) {
            matchedSpecs.gpu = gpu;
            break;
          }
        }
        if (!matchedSpecs.gpu) {
          if (rowString.includes('4090')) matchedSpecs.gpu = 'NVIDIA GeForce RTX 4090';
          else if (rowString.includes('4080')) matchedSpecs.gpu = 'NVIDIA GeForce RTX 4080';
          else if (rowString.includes('4070')) matchedSpecs.gpu = 'NVIDIA GeForce RTX 4070';
          else if (rowString.includes('4060')) matchedSpecs.gpu = 'NVIDIA GeForce RTX 4060';
          else if (rowString.includes('4050')) matchedSpecs.gpu = 'NVIDIA GeForce RTX 4050';
          else if (rowString.includes('iris')) matchedSpecs.gpu = 'Intel Iris Xe Graphics';
          else if (rowString.includes('radeon')) matchedSpecs.gpu = 'AMD Radeon 780M';
          else if (rowString.includes('40-core')) matchedSpecs.gpu = 'Apple 40-Core GPU';
          else if (rowString.includes('18-core')) matchedSpecs.gpu = 'Apple 18-Core GPU';
          else if (rowString.includes('10-core')) matchedSpecs.gpu = 'Apple 10-Core GPU';
        }
      }

      // 6. Match Quantity
      // Search for any column keys containing quantity, stock, qty
      for (const [key, val] of Object.entries(row)) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('qty') || keyLower.includes('quantity') || keyLower.includes('stock') || keyLower.includes('count')) {
          const parsedQty = parseInt(val, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            matchedSpecs.quantity = parsedQty.toString();
            break;
          }
        }
      }
    }

    // Default fallbacks if anything remains empty
    if (!matchedSpecs.modelId && dbModels.length > 0) matchedSpecs.modelId = dbModels[0].id.toString();
    if (!matchedSpecs.cpu) matchedSpecs.cpu = cpus[1]; // i7
    if (!matchedSpecs.ram) matchedSpecs.ram = rams[1]; // 16GB
    if (!matchedSpecs.ssd) matchedSpecs.ssd = ssds[2]; // 1TB
    if (!matchedSpecs.gpu) matchedSpecs.gpu = gpus[0]; // Iris Xe

    return NextResponse.json({
      message: 'Excel parsed and mapping complete.',
      specs: matchedSpecs,
      rowCount: rows.length,
    });
  } catch (error) {
    console.error('Excel Parse API Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse Excel file. Ensure it is a valid Excel or CSV sheet.' },
      { status: 500 }
    );
  }
}
