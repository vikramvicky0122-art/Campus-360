import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class AuthError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'AuthError';
  }
}

const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

const ensureJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  collegeEmail: user.collegeEmail,
  role: user.role,
  department: user.department,
  yearOfStudy: user.yearOfStudy,
  profileImage: user.profileImage,
});

const generateToken = (user) => {
  const secret = ensureJwtSecret();
  return jwt.sign(
    {
      sub: user.id,
      email: user.collegeEmail,
      role: user.role,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const signup = async ({ fullName, collegeEmail, password }) => {
  if (!fullName || !collegeEmail || !password) {
    throw new AuthError('fullName, collegeEmail and password are required.', 400);
  }

  const normalizedEmail = String(collegeEmail).trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { collegeEmail: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new AuthError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: String(fullName).trim(),
      collegeEmail: normalizedEmail,
      passwordHash,
      role: 'USER',
      preferredPickupZones: [],
      lenderRating: 0,
      ratingsCount: 0,
    },
    select: {
      id: true,
      fullName: true,
      collegeEmail: true,
      role: true,
      department: true,
      yearOfStudy: true,
      profileImage: true,
    }
  });

  return {
    token: generateToken(user),
    user: sanitizeUser(user)
  };
};

export const login = async ({ collegeEmail, password }) => {
  if (!collegeEmail || !password) {
    throw new AuthError('collegeEmail and password are required.', 400);
  }

  const normalizedEmail = String(collegeEmail).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { collegeEmail: normalizedEmail },
    select: {
      id: true,
      fullName: true,
      collegeEmail: true,
      passwordHash: true,
      role: true,
      department: true,
      yearOfStudy: true,
      profileImage: true,
    }
  });

  if (!user) {
    logger.warn({ email: normalizedEmail }, 'Failed login attempt: email not found');
    throw new AuthError('Invalid credentials.', 401);
  }

  const isValidPassword = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValidPassword) {
    logger.warn({ email: normalizedEmail }, 'Failed login attempt: incorrect password');
    throw new AuthError('Invalid credentials.', 401);
  }

  return {
    token: generateToken(user),
    user: sanitizeUser(user)
  };
};

export { AuthError };
