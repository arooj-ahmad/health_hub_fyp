/**
 * Firebase Admin SDK Initialization
 * ─────────────────────────────────────────────────────────────────────────────
 * Initializes Firebase Admin with a service account for:
 *   - Verifying client Firebase ID tokens (auth middleware)
 *   - Reading/writing Firestore from the backend
 *
 * If the service account file is missing, the app still starts but Firebase
 * features are disabled (graceful degradation for local dev).
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import config from './index.js';

let firebaseApp = null;
let db = null;
let auth = null;
let isFirebaseInitialized = false;

try {
  if (existsSync(config.firebase.serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      readFileSync(config.firebase.serviceAccountPath, 'utf8')
    );

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    auth = admin.auth();
    isFirebaseInitialized = true;

    console.log('✓ Firebase Admin SDK initialized');
  } else {
    console.warn(
      `⚠️  Firebase service account not found at: ${config.firebase.serviceAccountPath}`
    );
    console.warn('   Firebase Auth verification and Firestore will be disabled.');
    console.warn('   Download it from: Firebase Console → Project Settings → Service Accounts');
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
}

export { firebaseApp, db, auth, isFirebaseInitialized };
export default admin;
