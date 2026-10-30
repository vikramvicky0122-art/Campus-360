import express from 'express';
import * as listingController from '../controllers/listingController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Map the GET request at the root ('/') of this router to the controller function
// Since this router will be mounted at '/api/listings', this resolves to GET /api/listings
router.get('/', listingController.getListings);

// GET /api/listings/my-listings
// Must be registered before /:id to prevent "my-listings" from being treated as an ID
router.get('/my-listings', requireAuth, listingController.getMyListings);

// POST /api/listings
router.post('/', requireAuth, listingController.createListing);
router.post('/upload-image', requireAuth, upload.single('image'), listingController.uploadListingImage);
router.patch('/:id', requireAuth, listingController.updateListing);
router.delete('/:id', requireAuth, listingController.deleteListing);

// Resolves to GET /api/listings/:id
router.get('/:id', listingController.getListing);

export default router;
