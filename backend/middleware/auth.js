/**
 * Firebase Auth Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches decoded user info to req.user.
 *
 * If Firebase Admin is not initialized (no service account), the middleware
 * runs in "dev bypass" mode — it still expects a header but doesn't verify.
 */

import { auth, isFirebaseInitialized } from '../config/firebase.js';
import config from '../config/index.js';

export const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'No token provided.',
    });
  }

  // If Firebase Admin is not initialized, allow in dev mode with a warning
  if (!isFirebaseInitialized) {
    if (config.isDev) {
      console.warn('⚠️  [auth] Firebase not initialized — dev bypass active. Token NOT verified.');
      req.user = { uid: 'dev-user', email: 'dev@localhost', devBypass: true };
      return next();
    }
    return res.status(503).json({
      success: false,
      error: 'Authentication service unavailable.',
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || '',
    };
    return next();
  } catch (error) {
    console.warn('[auth] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
    });
  }
};
