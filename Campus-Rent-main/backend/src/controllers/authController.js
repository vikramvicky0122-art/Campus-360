import * as authService from '../services/authService.js';
import { signupSchema, loginSchema, validate } from '../utils/validation.js';

export const signup = async (req, res, next) => {
  try {
    const validation = validate(signupSchema, req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
        requestId: req.requestId
      });
    }

    const data = await authService.signup(validation.data);
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in signup controller');
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validation = validate(loginSchema, req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
        requestId: req.requestId
      });
    }

    const data = await authService.login(validation.data);
    req.log?.info({ userId: data.user.id }, 'User logged in successfully');
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    req.log?.warn({ err: error }, 'Login failed');
    next(error);
  }
};
