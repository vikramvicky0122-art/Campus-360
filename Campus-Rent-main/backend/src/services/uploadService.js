import cloudinary from '../config/cloudinary.js';
import { BadRequestError } from '../utils/AppError.js';

export const uploadImageToCloudinary = async (file) => {
  if (!file) {
    throw new BadRequestError('Image file is required.');
  }

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'campusrent/listings',
    resource_type: 'image'
  });

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
};
