const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Admin
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@madeenat.com' },
    update: {},
    create: {
      email: 'admin@madeenat.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      companyName: 'Madeenat Admin',
      phoneNumber: '+971500000000',
    },
  });
  console.log('Admin seeded:', admin.email);

  // 2. Create Supplier
  const supplierPasswordHash = await bcrypt.hash('SupplierPassword123!', 10);
  const supplier = await prisma.user.upsert({
    where: { email: 'supplier@test.com' },
    update: {},
    create: {
      email: 'supplier@test.com',
      password: supplierPasswordHash,
      role: 'SUPPLIER',
      companyName: 'Apex Electronics LLC',
      phoneNumber: '+971501234567',
    },
  });
  console.log('Supplier seeded:', supplier.email);

  // 3. Create Laptop Models
  const laptopModels = [
    { name: 'Dell XPS 15 9530', brand: 'Dell' },
    { name: 'MacBook Pro 16" (M3 Max)', brand: 'Apple' },
    { name: 'Lenovo ThinkPad X1 Carbon Gen 11', brand: 'Lenovo' },
    { name: 'HP Spectre x360 16', brand: 'HP' },
    { name: 'ASUS ROG Zephyrus G14', brand: 'ASUS' },
    { name: 'Razer Blade 15', brand: 'Razer' },
    { name: 'Acer Predator Helios 300', brand: 'Acer' },
    { name: 'Apple MacBook Air 13" (M2)', brand: 'Apple' },
    { name: 'Dell Latitude 7440', brand: 'Dell' },
    { name: 'Lenovo Legion Pro 5', brand: 'Lenovo' },
  ];

  for (const model of laptopModels) {
    const seededModel = await prisma.laptopModel.upsert({
      where: { name: model.name },
      update: {},
      create: {
        name: model.name,
        brand: model.brand,
      },
    });
    console.log('Laptop model seeded:', seededModel.name);
  }

  // 4. Create some initial Approved and Pending listings
  // To link to the supplier
  const model1 = await prisma.laptopModel.findUnique({ where: { name: 'Dell XPS 15 9530' } });
  const model2 = await prisma.laptopModel.findUnique({ where: { name: 'MacBook Pro 16" (M3 Max)' } });

  if (model1 && model2) {
    // Clean old listings from seed to prevent duplicates if seed rerun
    // Must delete child records first (foreign key constraints)
    const existingListings = await prisma.stockListing.findMany({
      where: { supplierId: supplier.id },
      select: { id: true }
    });
    const listingIds = existingListings.map(l => l.id);
    if (listingIds.length > 0) {
      await prisma.listingEventLog.deleteMany({ where: { stockListingId: { in: listingIds } } });
      await prisma.inquiry.deleteMany({ where: { stockListingId: { in: listingIds } } });
      await prisma.stockListing.deleteMany({ where: { id: { in: listingIds } } });
    }

    await prisma.stockListing.create({
      data: {
        modelId: model1.id,
        cpu: 'Intel Core i7-13700H',
        ram: '32 GB',
        ssd: '1 TB',
        gpu: 'NVIDIA RTX 4060',
        quantity: 15,
        phoneNumber: '+971501234567',
        companyName: 'Apex Electronics LLC',
        status: 'APPROVED',
        supplierId: supplier.id,
      }
    });

    await prisma.stockListing.create({
      data: {
        modelId: model2.id,
        cpu: 'Apple M3 Max (16-Core)',
        ram: '48 GB',
        ssd: '2 TB',
        gpu: 'Apple 40-Core GPU',
        quantity: 8,
        phoneNumber: '+971501234567',
        companyName: 'Apex Electronics LLC',
        status: 'PENDING',
        supplierId: supplier.id,
      }
    });
    
    console.log('Initial sample listings seeded.');
  }

  console.log('Database seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
