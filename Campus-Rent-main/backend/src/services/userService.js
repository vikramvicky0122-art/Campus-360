import prisma from '../utils/prismaClient.js';
import { AppError } from '../utils/AppError.js';

class UserError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'UserError';
  }
}

const PUBLIC_USER_SELECT = {
  id: true,
  fullName: true,
  collegeEmail: true,
  department: true,
  yearOfStudy: true,
  bio: true,
  profileImage: true,
  preferredPickupZones: true,
  lenderRating: true,
  ratingsCount: true,
  createdAt: true
};

/**
 * Get the authenticated user's full profile.
 */
export const getMyProfile = async (userId) => {
  const [user, borrowingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        ...PUBLIC_USER_SELECT,
        role: true,
        listings: {
          where: { status: { not: 'deleted' } },
          select: { id: true, title: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    prisma.booking.count({
      where: {
        borrowerId: String(userId),
        status: { in: ['completed', 'ongoing', 'return_pending', 'item_given'] }
      }
    })
  ]);

  if (!user) {
    throw new UserError('User not found.', 404);
  }

  return { ...user, borrowingCount };
};

/**
 * Get a public user profile by ID (limited fields, no email).
 */
export const getPublicProfile = async (userId) => {
  const [user, borrowingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        fullName: true,
        department: true,
        yearOfStudy: true,
        bio: true,
        profileImage: true,
        preferredPickupZones: true,
        lenderRating: true,
        ratingsCount: true,
        createdAt: true,
        listings: {
          where: { status: 'active' },
          select: { id: true, title: true, category: true, dailyRentalRate: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    }),
    prisma.booking.count({
      where: {
        borrowerId: String(userId),
        status: { in: ['completed', 'ongoing', 'return_pending', 'item_given'] }
      }
    })
  ]);

  if (!user) {
    throw new UserError('User not found.', 404);
  }

  return { ...user, borrowingCount };
};
