import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserRole } from '../models/user';

export interface TokenPayload {
  sub: string;     // user ID
  role: UserRole;
  iat: number;
  exp: number;
  jti?: string;    // token ID for refresh tokens
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate an access token (short-lived, 15 minutes).
 */
export function generateAccessToken(userId: string, role: UserRole): string {
  const payload = {
    sub: userId,
    role,
  };

  const options: jwt.SignOptions = {
    expiresIn: config.accessTokenExpiry as any,
    algorithm: 'HS256',
  };
  return jwt.sign(payload, config.jwtAccessSecret, options);
}

/**
 * Generate a refresh token (longer-lived, 7 days).
 * Each refresh token has a unique JTI for rotation tracking.
 */
export function generateRefreshToken(userId: string, role: UserRole): string {
  const payload = {
    sub: userId,
    role,
    jti: uuidv4(),
  };

  const options: jwt.SignOptions = {
    expiresIn: config.refreshTokenExpiry as any,
    algorithm: 'HS256',
  };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
}

/**
 * Generate a full token pair.
 */
export function generateTokenPair(userId: string, role: UserRole): TokenPair {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);

  // Parse access token expiry in seconds
  const decoded = jwt.decode(accessToken) as TokenPayload;
  const expiresIn = decoded.exp - decoded.iat;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode an access token.
 * Returns the decoded payload or throws.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtAccessSecret, {
    algorithms: ['HS256'],
  }) as TokenPayload;
}

/**
 * Verify and decode a refresh token.
 * Returns the decoded payload or throws.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret, {
    algorithms: ['HS256'],
  }) as TokenPayload;
}

/**
 * Refresh a token pair using a valid refresh token.
 * Old refresh token is consumed (rotation).
 */
export function rotateRefreshToken(
  oldRefreshToken: string
): TokenPair {
  const decoded = verifyRefreshToken(oldRefreshToken);
  return generateTokenPair(decoded.sub, decoded.role);
}
