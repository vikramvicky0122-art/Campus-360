import logger from '../utils/logger.js';

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    const email = req.user?.collegeEmail || 'unknown';
    const requestId = req?.requestId || 'unknown';

    logger.warn(
      { requestId, userEmail: email, userRole: req.user?.role, url: req.url, method: req.method },
      `[${requestId}] Unauthorized admin access attempt by ${email} (role: ${req.user?.role || 'none'})`
    );

    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
      requestId,
    });
  }

  next();
};

export default adminOnly;
