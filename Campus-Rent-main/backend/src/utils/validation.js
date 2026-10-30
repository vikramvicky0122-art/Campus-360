import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/\d/, 'Password must contain at least one number.')
  .regex(/[@$!%*#?&]/, 'Password must contain at least one special character (@$!%*#?&).');

const collegeEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .email('Please provide a valid email address.')
  .refine((email) => {
    const allowedRegex = process.env.ALLOWED_COLLEGE_EMAIL_REGEX
      ? new RegExp(process.env.ALLOWED_COLLEGE_EMAIL_REGEX, 'i')
      : /(@[a-zA-Z0-9.-]+\.(edu|ac\.in|edu\.in)|@nitrr\.ac\.in)$/i;
    return allowedRegex.test(email);
  }, {
    message: 'Please use your verified campus/college email address (e.g. @college.edu, @nitrr.ac.in).'
  });

const dateStringSchema = z
  .string()
  .min(1, 'Date is required.')
  .refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: 'Invalid date format.'
  });

const positiveNumberSchema = (fieldName) =>
  z
    .number({ invalid_type_error: `${fieldName} must be a number.` })
    .positive(`${fieldName} must be greater than zero.`);

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required.')
    .max(100, 'Full name must be 100 characters or less.'),
  collegeEmail: collegeEmailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  collegeEmail: collegeEmailSchema,
  password: z.string().min(1, 'Password is required.')
});

export const createListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Title must be 120 characters or less.'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(2000, 'Description must be 2000 characters or less.'),
  category: z.string().trim().min(1, 'Category is required.'),
  condition: z.string().trim().min(1, 'Condition is required.'),
  dailyRentalRate: positiveNumberSchema('Daily rental rate'),
  securityDeposit: positiveNumberSchema('Security deposit'),
  retailPrice: positiveNumberSchema('Retail price'),
  minimumRentalDays: z
    .number({ invalid_type_error: 'Minimum rental days must be a number.' })
    .int('Minimum rental days must be a whole number.')
    .min(1, 'Minimum rental days must be at least 1.'),
  preferredPickupZone: z.string().trim().min(1, 'Pickup zone is required.'),
  customPickupNote: z.string().trim().max(500).optional().nullable(),
  images: z
    .array(
      z.object({
        imageUrl: z.string().min(1, 'Image URL is required.'),
        displayOrder: z.number().int().min(0)
      })
    )
    .optional()
    .default([])
}).refine(
  (data) => data.securityDeposit < data.retailPrice,
  {
    message: 'Security deposit must be strictly less than the retail price (MRP).',
    path: ['securityDeposit']
  }
);

export const updateListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Title must be 120 characters or less.')
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(2000, 'Description must be 2000 characters or less.')
    .optional(),
  category: z.string().trim().min(1, 'Category is required.').optional(),
  condition: z.string().trim().min(1, 'Condition is required.').optional(),
  dailyRentalRate: positiveNumberSchema('Daily rental rate').optional(),
  securityDeposit: positiveNumberSchema('Security deposit').optional(),
  retailPrice: positiveNumberSchema('Retail price').optional(),
  minimumRentalDays: z
    .number({ invalid_type_error: 'Minimum rental days must be a number.' })
    .int('Minimum rental days must be a whole number.')
    .min(1, 'Minimum rental days must be at least 1.')
    .optional(),
  preferredPickupZone: z.string().trim().min(1, 'Pickup zone is required.').optional(),
  customPickupNote: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['active', 'hidden', 'paused']).optional(),
  images: z
    .array(
      z.object({
        imageUrl: z.string().min(1, 'Image URL is required.'),
        displayOrder: z.number().int().min(0)
      })
    )
    .optional()
}).refine(
  (data) => {
    if (data.securityDeposit !== undefined && data.retailPrice !== undefined) {
      return data.securityDeposit < data.retailPrice;
    }
    return true;
  },
  {
    message: 'Security deposit must be strictly less than the retail price (MRP).',
    path: ['securityDeposit']
  }
);

export const createBookingSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required.'),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  pickupZone: z.string().trim().optional().default('Default Zone'),
  pickupTime: z.string().optional().nullable()
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date cannot be before start date.',
    path: ['endDate']
  }
);

/**
 * Validates input data against a Zod schema.
 * Returns an object with `success`, and either `data` or formatted `errors`.
 */
export const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};
