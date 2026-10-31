import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

export async function authenticate(req, _res, next) {
  try {
    const authorization = req.get('authorization');
    const [scheme, token, extra] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || extra) throw new ApiError(401, 'Sign in to continue.');

    const claims = verifyAccessToken(token);
    if (claims.type !== 'access' || typeof claims.sub !== 'string') {
      throw new ApiError(401, 'Your session is invalid. Sign in again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        customer: { select: { id: true, companyName: true } },
      },
    });
    if (!user || !user.isActive) throw new ApiError(401, 'Your account is unavailable. Sign in again.');
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Your session has expired. Sign in again.'));
  }
}
