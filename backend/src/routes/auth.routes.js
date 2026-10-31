import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  reset,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimit, sessionRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  resetTokenParamsSchema,
} from '../validators/auth.validators.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, validate(registerSchema), register);
authRouter.post('/login', authRateLimit, validate(loginSchema), login);
authRouter.post('/logout', sessionRateLimit, logout);
authRouter.post('/refresh', sessionRateLimit, refresh);
authRouter.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password/:token', authRateLimit, validate(resetTokenParamsSchema, 'params'), validate(resetPasswordSchema), reset);
authRouter.get('/me', sessionRateLimit, authenticate, me);
