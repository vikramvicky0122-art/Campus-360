import * as listingService from '../services/listingService.js';
import * as uploadService from '../services/uploadService.js';
import { createListingSchema, updateListingSchema, validate } from '../utils/validation.js';

/**
 * Controller to handle the GET /api/listings request.
 * Supports query params: q (search), category, page, limit.
 */
export const getListings = async (req, res, next) => {
  try {
    const { q, category, page, limit, sortBy, location } = req.query;

    const result = await listingService.getActiveListings({
      q: q || undefined,
      category: category || undefined,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      sortBy: sortBy || undefined,
      location: location || undefined
    });

    const { data, pagination } = result;

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      ...(pagination ? { pagination } : {})
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getListings controller');
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const listing = await listingService.getListingById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found or has been removed',
        requestId: req.requestId
      });
    }

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    req.log?.error({ err: error, listingId: req.params.id }, 'Error in getListing controller');
    next(error);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const listings = await listingService.getMyListings(userId);

    res.status(200).json({
      success: true,
      data: listings
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error fetching my listings');
    next(error);
  }
};

export const createListing = async (req, res, next) => {
  try {
    const validation = validate(createListingSchema, req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
        requestId: req.requestId
      });
    }

    const userId = req.user.id;
    const createdListing = await listingService.createListing(userId, validation.data);

    res.status(201).json({
      success: true,
      data: createdListing
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error creating listing');
    next(error);
  }
};

export const uploadListingImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided or file type is not supported. Accepted types: JPEG, PNG, WebP, AVIF, HEIC.',
        requestId: req.requestId
      });
    }

    const uploaded = await uploadService.uploadImageToCloudinary(req.file);

    res.status(201).json({
      success: true,
      data: uploaded
    });
  } catch (error) {
    // Multer errors (file too large, wrong type) are plain Errors — return 400
    if (error.message && (error.message.includes('Unsupported file type') || error.code === 'LIMIT_FILE_SIZE')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'File upload rejected.',
        requestId: req.requestId
      });
    }

    req.log?.error({ err: error }, 'Error uploading listing image');
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const validation = validate(updateListingSchema, req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
        requestId: req.requestId
      });
    }

    const userId = req.user.id;
    const { id } = req.params;

    const updatedListing = await listingService.updateListing(id, userId, validation.data);

    res.status(200).json({
      success: true,
      data: updatedListing
    });
  } catch (error) {
    req.log?.error({ err: error, listingId: req.params.id }, 'Error updating listing');
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await listingService.deleteListing(id, userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    req.log?.error({ err: error, listingId: req.params.id }, 'Error deleting listing');
    next(error);
  }
};
