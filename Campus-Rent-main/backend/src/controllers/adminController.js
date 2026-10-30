import * as adminService from '../services/adminService.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in admin getStats controller');
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    const result = await adminService.getUsers({ q, page, limit });
    res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in admin getUsers controller');
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const { status, userId, page, limit } = req.query;
    const result = await adminService.getBookings({ status, userId, page, limit });
    res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in admin getBookings controller');
    next(error);
  }
};

export const hideListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await adminService.hideListing(id, req.user.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    req.log?.error({ err: error, listingId: req.params.id }, 'Error in admin hideListing controller');
    next(error);
  }
};

export const restoreListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await adminService.restoreListing(id, req.user.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    req.log?.error({ err: error, listingId: req.params.id }, 'Error in admin restoreListing controller');
    next(error);
  }
};
