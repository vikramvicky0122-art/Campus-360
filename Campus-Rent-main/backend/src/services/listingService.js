import prisma from '../utils/prismaClient.js';
import { AppError } from '../utils/AppError.js';

class ListingError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'ListingError';
  }
}

const LISTING_INCLUDE = {
  images: {
    orderBy: { displayOrder: 'asc' },
    select: { imageUrl: true, displayOrder: true }
  },
  owner: {
    select: {
      id: true,
      fullName: true,
      profileImage: true,
      department: true,
      lenderRating: true
    }
  }
};

/**
 * Retrieves active listings with optional search, category filter, and pagination.
 * Uses case-insensitive matching across title, description, and category.
 */
export const getActiveListings = async (filters = {}) => {
  const { q, category, page, limit, sortBy, location } = filters;

  const where = { status: 'active' };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } }
    ];
  }

  if (category) {
    where.category = { equals: category, mode: 'insensitive' };
  }

  if (location) {
    where.preferredPickupZone = { contains: location, mode: 'insensitive' };
  }

  // Build dynamic orderBy from sortBy param
  let orderBy = { createdAt: 'desc' }; // default
  if (sortBy === 'price_asc') {
    orderBy = { dailyRentalRate: 'asc' };
  } else if (sortBy === 'price_desc') {
    orderBy = { dailyRentalRate: 'desc' };
  } else if (sortBy === 'rating') {
    orderBy = { owner: { lenderRating: 'desc' } };
  }

  const hasPagination = page !== undefined && page !== null &&
                        limit !== undefined && limit !== null;

  if (hasPagination) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.listing.count({ where })
    ]);

    return {
      data: listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  const listings = await prisma.listing.findMany({
    where,
    include: LISTING_INCLUDE,
    orderBy
  });

  return { data: listings };
};

/**
 * Retrieves a single listing by ID.
 * Excludes 'deleted' items.
 * Includes owner metadata, ordered images, and active bookings.
 */
export const getListingById = async (id) => {
  const listing = await prisma.listing.findFirst({
    where: {
      id: id,
      status: { not: 'deleted' }
    },
    include: {
      images: {
        orderBy: {
          displayOrder: 'asc',
        },
        select: {
          imageUrl: true,
          displayOrder: true,
        },
      },
      owner: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          department: true,
          lenderRating: true,
        },
      },
      bookings: {
        where: {
          status: {
            in: ['approved', 'item_given', 'ongoing', 'return_pending']
          }
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
        }
      }
    },
  });

  return listing;
};

/**
 * Fetch all listings owned by a specific user.
 * This explicitly includes hidden listings.
 */
export const getMyListings = async (userId) => {
  const listings = await prisma.listing.findMany({
    where: { 
      ownerId: userId,
      status: { not: 'deleted' }
    },
    include: {
      images: {
        orderBy: {
          displayOrder: 'asc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return listings;
};

/**
 * Create a listing with related images for a specific owner.
 */
export const createListing = async (ownerId, payload) => {
  const listing = await prisma.listing.create({
    data: {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      condition: payload.condition,
      dailyRentalRate: payload.dailyRentalRate,
      securityDeposit: payload.securityDeposit,
      retailPrice: payload.retailPrice,
      minimumRentalDays: payload.minimumRentalDays,
      preferredPickupZone: payload.preferredPickupZone,
      customPickupNote: payload.customPickupNote || null,
      status: 'active',
      ownerId,
      images: {
        create: (payload.images || []).map((image, index) => ({
          imageUrl: image.imageUrl,
          displayOrder: typeof image.displayOrder === 'number' ? image.displayOrder : index
        }))
      }
    },
    include: {
      images: {
        orderBy: {
          displayOrder: 'asc'
        },
        select: {
          imageUrl: true,
          displayOrder: true
        }
      },
      owner: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          department: true,
          lenderRating: true
        }
      }
    }
  });

  return listing;
};

/**
 * Update a listing. Only the owner can update.
 * Accepts partial updates — only provided fields are changed.
 * If images are provided, existing images are replaced.
 */
export const updateListing = async (listingId, ownerId, payload) => {
  const listing = await prisma.listing.findUnique({
    where: { id: String(listingId) },
    select: { id: true, ownerId: true, status: true }
  });

  if (!listing || listing.status === 'deleted') {
    throw new ListingError('Listing not found.', 404);
  }

  if (listing.ownerId !== String(ownerId)) {
    throw new ListingError('You are not allowed to edit this listing.', 403);
  }

  const updateData = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.condition !== undefined) updateData.condition = payload.condition;
  if (payload.dailyRentalRate !== undefined) updateData.dailyRentalRate = payload.dailyRentalRate;
  if (payload.securityDeposit !== undefined) updateData.securityDeposit = payload.securityDeposit;
  if (payload.retailPrice !== undefined) updateData.retailPrice = payload.retailPrice;
  if (payload.minimumRentalDays !== undefined) updateData.minimumRentalDays = payload.minimumRentalDays;
  if (payload.preferredPickupZone !== undefined) updateData.preferredPickupZone = payload.preferredPickupZone;
  if (payload.customPickupNote !== undefined) updateData.customPickupNote = payload.customPickupNote;
  if (payload.status !== undefined) updateData.status = payload.status;

  const imagesPayload = payload.images;

  // Wrap image replacement in a transaction to prevent data loss if update fails
  const updatedListing = await prisma.$transaction(async (tx) => {
    if (imagesPayload !== undefined) {
      await tx.listingImage.deleteMany({ where: { listingId: listing.id } });
    }

    return tx.listing.update({
      where: { id: listing.id },
      data: {
        ...updateData,
        ...(imagesPayload !== undefined
          ? {
              images: {
                create: imagesPayload.map((img, index) => ({
                  imageUrl: img.imageUrl,
                  displayOrder: typeof img.displayOrder === 'number' ? img.displayOrder : index
                }))
              }
            }
          : {})
      },
      include: LISTING_INCLUDE
    });
  });

  return updatedListing;
};

export const deleteListing = async (listingId, ownerId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: String(listingId) },
    select: { id: true, ownerId: true, status: true }
  });

  if (!listing || listing.status === 'deleted') {
    throw new ListingError('Listing not found.', 404);
  }

  if (listing.ownerId !== String(ownerId)) {
    throw new ListingError('You are not allowed to delete this listing.', 403);
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'deleted' }
  });

  return { id: listing.id };
};
