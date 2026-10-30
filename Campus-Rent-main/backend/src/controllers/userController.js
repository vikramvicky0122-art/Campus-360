import * as userService from '../services/userService.js';

export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await userService.getMyProfile(userId);

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getMyProfile controller');
    next(error);
  }
};

export const getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await userService.getPublicProfile(id);

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    req.log?.error({ err: error, userId: req.params.id }, 'Error in getPublicProfile controller');
    next(error);
  }
};
