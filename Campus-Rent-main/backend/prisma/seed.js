import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing data to ensure idempotency...');
  // Delete in reverse order of dependencies to avoid foreign key constraint errors
  await prisma.booking.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database cleaned.');

  console.log('Seeding Users...');
  const seedPasswordHash = await bcrypt.hash('Password@123', 10);
  const alex = await prisma.user.create({
    data: {
      fullName: 'Alex Rivera',
      collegeEmail: 'alex.rivera@northcampus.edu',
      passwordHash: seedPasswordHash,
      department: 'Design Engineering',
      yearOfStudy: 'Senior',
      bio: 'Currently a Senior at North Campus specializing in Sustainable Design. I started using CampusRent to help peers get access to professional tools. I take great care of my gear and expect the same!',
      lenderRating: 4.9,
      ratingsCount: 32,
      preferredPickupZones: ['Library Cafe', 'North Campus Dorms', 'The Quad'],
    },
  });

  const samira = await prisma.user.create({
    data: {
      fullName: 'Samira Patel',
      collegeEmail: 'samira.p@artsdistrict.edu',
      passwordHash: seedPasswordHash,
      department: 'Photography & Media',
      yearOfStudy: 'Junior',
      bio: 'Photography major! Always looking to rent out my lenses when I\'m not using them. Reach out if you need advice on gear.',
      lenderRating: 5.0,
      ratingsCount: 14,
      preferredPickupZones: ['Arts Studio 4', 'Central Garden'],
    },
  });

  const ravi = await prisma.user.create({
    data: {
      fullName: 'Ravi Malhotra',
      collegeEmail: 'ravi.m@science.edu',
      passwordHash: seedPasswordHash,
      department: 'Chemistry',
      yearOfStudy: 'Sophomore',
      lenderRating: 4.5,
      ratingsCount: 8,
      preferredPickupZones: ['Central Library'],
    },
  });

  const anika = await prisma.user.create({
    data: {
      fullName: 'Anika Shah',
      collegeEmail: 'anika.s@northcampus.edu',
      passwordHash: seedPasswordHash,
      department: 'Computer Science',
      yearOfStudy: 'Freshman',
      preferredPickupZones: ['North Campus Dorms'],
    },
  });

  console.log('Seeding Listings & ListingImages...');
  
  const macbook = await prisma.listing.create({
    data: {
      title: 'MacBook Pro M2 - 2023',
      description: 'Like-new MacBook Pro M2, perfect for video editing or heavy programming tasks. Comes with charger and protective sleeve.',
      category: 'Tech',
      condition: 'Excellent',
      dailyRentalRate: 1500,
      securityDeposit: 25000,
      retailPrice: 120000,
      minimumRentalDays: 2,
      preferredPickupZone: 'Arts District',
      status: 'active',
      ownerId: alex.id,
      images: {
        create: [
          { imageUrl: 'blue', displayOrder: 1 },
          { imageUrl: 'purple', displayOrder: 2 },
          { imageUrl: 'teal', displayOrder: 3 },
        ],
      },
    },
  });

  const camera = await prisma.listing.create({
    data: {
      title: 'Sony Alpha A7 III + 35mm',
      description: 'Excellent full-frame mirrorless camera. Includes a sharp 35mm f/1.8 lens, perfect for portraits and street photography on campus.',
      category: 'Tech',
      condition: 'Good',
      dailyRentalRate: 2500,
      securityDeposit: 15000,
      retailPrice: 180000,
      minimumRentalDays: 1,
      preferredPickupZone: 'Arts District',
      status: 'active',
      ownerId: samira.id,
      images: {
        create: [
          { imageUrl: 'teal', displayOrder: 1 },
          { imageUrl: 'coral', displayOrder: 2 },
          { imageUrl: 'blue', displayOrder: 3 },
        ],
      },
    },
  });

  const chemistryBook = await prisma.listing.create({
    data: {
      title: 'Organic Chemistry 8th Ed',
      description: 'Required textbook for CHEM 201/202. Hardcover, some highlighting in early chapters but entirely readable.',
      category: 'Books',
      condition: 'Acceptable',
      dailyRentalRate: 500,
      securityDeposit: 1000,
      retailPrice: 6000,
      minimumRentalDays: 7,
      preferredPickupZone: 'Central Library',
      status: 'active',
      ownerId: ravi.id,
      images: {
        create: [
          { imageUrl: 'coral', displayOrder: 1 },
        ],
      },
    },
  });

  console.log('Seeding Bookings...');

  // 1. Pending Booking
  await prisma.booking.create({
    data: {
      listingId: camera.id,
      borrowerId: anika.id,
      ownerId: samira.id, // Snapshot
      startDate: new Date('2026-04-22T00:00:00Z'),
      endDate: new Date('2026-04-24T00:00:00Z'),
      status: 'requested',
      totalPriceSnapshot: 5000, // 2 days * 2500
      securityDepositSnapshot: 15000,
      pickupZone: 'Arts District',
    },
  });

  // 2. Upcoming Booking (Approved)
  await prisma.booking.create({
    data: {
      listingId: camera.id,
      borrowerId: ravi.id,
      ownerId: samira.id, // Snapshot
      startDate: new Date('2026-04-26T00:00:00Z'),
      endDate: new Date('2026-04-28T00:00:00Z'),
      status: 'approved',
      totalPriceSnapshot: 5000,
      securityDepositSnapshot: 15000,
      pickupZone: 'Arts District',
      pickupTime: new Date('2026-04-26T10:00:00Z'),
      approvedAt: new Date('2026-04-15T00:00:00Z'),
    },
  });

  // 3. Ongoing Booking
  await prisma.booking.create({
    data: {
      listingId: macbook.id,
      borrowerId: ravi.id,
      ownerId: alex.id, // Snapshot
      startDate: new Date('2026-04-12T00:00:00Z'),
      endDate: new Date('2026-04-16T00:00:00Z'),
      status: 'ongoing',
      totalPriceSnapshot: 6000,
      securityDepositSnapshot: 25000,
      pickupZone: 'Arts District',
      pickupTime: new Date('2026-04-12T09:00:00Z'),
      approvedAt: new Date('2026-04-10T00:00:00Z'),
    },
  });

  // 4. Completed Booking
  await prisma.booking.create({
    data: {
      listingId: chemistryBook.id,
      borrowerId: alex.id,
      ownerId: ravi.id, // Snapshot
      startDate: new Date('2026-03-20T00:00:00Z'),
      endDate: new Date('2026-03-27T00:00:00Z'),
      status: 'completed',
      totalPriceSnapshot: 3500,
      securityDepositSnapshot: 1000,
      pickupZone: 'Central Library',
      pickupTime: new Date('2026-03-20T11:00:00Z'),
      approvedAt: new Date('2026-03-18T00:00:00Z'),
      returnedAt: new Date('2026-03-28T00:00:00Z'),
    },
  });

  // 5. Cancelled Booking
  await prisma.booking.create({
    data: {
      listingId: macbook.id,
      borrowerId: anika.id,
      ownerId: alex.id, // Snapshot
      startDate: new Date('2026-05-01T00:00:00Z'),
      endDate: new Date('2026-05-05T00:00:00Z'),
      status: 'cancelled',
      totalPriceSnapshot: 6000,
      securityDepositSnapshot: 25000,
      pickupZone: 'North Campus Dorms',
      cancelledAt: new Date('2026-04-10T00:00:00Z'),
      cancellationReason: 'Borrower found an alternative.',
      cancelledById: anika.id, // Anika cancelled it
    },
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

