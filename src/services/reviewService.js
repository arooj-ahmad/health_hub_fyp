import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

const REVIEWS = 'reviews';
const NUTRITIONISTS = 'nutritionists';

/**
 * Check if a user has already reviewed a specific appointment.
 */
export const hasUserReviewedAppointment = async (userId, appointmentId) => {
  const q = query(
    collection(db, REVIEWS),
    where('userId', '==', userId),
    where('appointmentId', '==', appointmentId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

/**
 * Submit a review for a nutritionist after an appointment.
 * Also recalculates and updates the nutritionist's average rating.
 */
export const submitReview = async ({ userId, nutritionistId, appointmentId, rating, reviewText }) => {
  // Check for duplicate
  const alreadyReviewed = await hasUserReviewedAppointment(userId, appointmentId);
  if (alreadyReviewed) {
    throw new Error('You already rated this appointment.');
  }

  // Save review
  await addDoc(collection(db, REVIEWS), {
    userId,
    nutritionistId,
    appointmentId,
    rating: Number(rating),
    reviewText: reviewText || '',
    createdAt: Timestamp.now(),
  });

  // Recalculate nutritionist rating
  await recalculateNutritionistRating(nutritionistId);
};

/**
 * Recalculate and update a nutritionist's average rating and total reviews.
 */
const recalculateNutritionistRating = async (nutritionistId) => {
  const q = query(
    collection(db, REVIEWS),
    where('nutritionistId', '==', nutritionistId)
  );
  const snap = await getDocs(q);
  const reviews = snap.docs.map((d) => d.data());

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

  const docRef = doc(db, NUTRITIONISTS, nutritionistId);
  await updateDoc(docRef, {
    rating: averageRating,
    totalReviews,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Get all reviews for a specific nutritionist, ordered by most recent.
 */
export const getNutritionistReviews = async (nutritionistId) => {
  const q = query(
    collection(db, REVIEWS),
    where('nutritionistId', '==', nutritionistId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  });
  return docs;
};

/**
 * Real-time listener for reviews for a specific nutritionist.
 * Returns an unsubscribe function.
 */
export const onNutritionistReviews = (nutritionistId, callback) => {
  const q = query(
    collection(db, REVIEWS),
    where('nutritionistId', '==', nutritionistId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      callback(docs);
    },
    (error) => {
      console.error('onNutritionistReviews error:', error);
      callback([]);
    }
  );
};

/**
 * Get the review for a specific appointment (if exists).
 */
export const getReviewForAppointment = async (userId, appointmentId) => {
  const q = query(
    collection(db, REVIEWS),
    where('userId', '==', userId),
    where('appointmentId', '==', appointmentId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};
