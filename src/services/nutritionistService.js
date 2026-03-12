import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// ============================================================================
// NUTRITIONIST PROFILE OPERATIONS
// ============================================================================

const NUTRITIONISTS = 'nutritionists';

export const saveNutritionistProfile = async (uid, profileData) => {
  const docRef = doc(db, NUTRITIONISTS, uid);
  const data = {
    ...profileData,
    uid,
    rating: 0,
    totalReviews: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(docRef, data);
  return data;
};

export const getNutritionistProfile = async (uid) => {
  const docRef = doc(db, NUTRITIONISTS, uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllNutritionists = async () => {
  const q = query(collection(db, NUTRITIONISTS), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateNutritionistProfile = async (uid, updates) => {
  const docRef = doc(db, NUTRITIONISTS, uid);
  return await updateDoc(docRef, { ...updates, updatedAt: Timestamp.now() });
};

// ============================================================================
// CONSULTATION (CHAT) OPERATIONS
// ============================================================================

const CONSULTATIONS = 'consultations';

/**
 * Find or create a consultation between a user and a nutritionist.
 * Returns the consultation ID.
 */
export const getOrCreateConsultation = async (userId, nutritionistId) => {
  // Check if a consultation already exists
  const q = query(
    collection(db, CONSULTATIONS),
    where('userId', '==', userId),
    where('nutritionistId', '==', nutritionistId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }
  // Create new consultation
  const docRef = await addDoc(collection(db, CONSULTATIONS), {
    userId,
    nutritionistId,
    createdAt: Timestamp.now(),
  });
  return { id: docRef.id, userId, nutritionistId };
};

/**
 * Send a message inside a consultation.
 * Also updates the parent consultation doc with a lastMessage preview.
 */
export const sendMessage = async (consultationId, senderId, senderRole, message) => {
  const messagesRef = collection(db, CONSULTATIONS, consultationId, 'messages');
  const result = await addDoc(messagesRef, {
    consultationId,
    senderId,
    senderRole,
    message,
    timestamp: Timestamp.now(),
  });

  // Update consultation with last message preview
  const consultationRef = doc(db, CONSULTATIONS, consultationId);
  await updateDoc(consultationRef, {
    lastMessage: message.length > 80 ? message.slice(0, 80) + '…' : message,
    lastMessageAt: Timestamp.now(),
    lastSenderRole: senderRole,
  });

  return result;
};

/**
 * Subscribe to real-time messages for a consultation.
 * Returns an unsubscribe function.
 */
export const onMessagesSnapshot = (consultationId, callback) => {
  const q = query(
    collection(db, CONSULTATIONS, consultationId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('onMessagesSnapshot error:', error);
      callback([]);
    }
  );
};

/**
 * Get all consultations for a nutritionist (with latest message preview).
 */
export const getNutritionistConsultations = async (nutritionistId) => {
  const q = query(
    collection(db, CONSULTATIONS),
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
 * Real-time listener for a nutritionist's consultations.
 * Returns an unsubscribe function.
 */
export const onNutritionistConsultations = (nutritionistId, callback) => {
  const q = query(
    collection(db, CONSULTATIONS),
    where('nutritionistId', '==', nutritionistId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort client-side: most recent first
      docs.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      callback(docs);
    },
    (error) => {
      console.error('onNutritionistConsultations error:', error);
      callback([]);
    }
  );
};

/**
 * Real-time listener for a user's consultations.
 * Returns an unsubscribe function.
 */
export const onUserConsultations = (userId, callback) => {
  const q = query(
    collection(db, CONSULTATIONS),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      callback(docs);
    },
    (error) => {
      console.error('onUserConsultations error:', error);
      callback([]);
    }
  );
};

/**
 * Get all consultations for a user.
 */
export const getUserConsultations = async (userId) => {
  const q = query(
    collection(db, CONSULTATIONS),
    where('userId', '==', userId)
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

// ============================================================================
// APPOINTMENT OPERATIONS
// ============================================================================

const APPOINTMENTS = 'appointments';

/**
 * Book an appointment.
 */
export const createAppointment = async (userId, nutritionistId, date, time) => {
  return await addDoc(collection(db, APPOINTMENTS), {
    userId,
    nutritionistId,
    date,
    time,
    status: 'pending',
    createdAt: Timestamp.now(),
  });
};

/**
 * Get appointments for a nutritionist.
 */
export const getNutritionistAppointments = async (nutritionistId) => {
  const q = query(
    collection(db, APPOINTMENTS),
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
 * Real-time listener for a nutritionist's appointments.
 * Returns an unsubscribe function.
 */
export const onNutritionistAppointments = (nutritionistId, callback) => {
  const q = query(
    collection(db, APPOINTMENTS),
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
      console.error('onNutritionistAppointments error:', error);
      callback([]);
    }
  );
};

/**
 * Get appointments for a user.
 */
export const getUserAppointments = async (userId) => {
  const q = query(
    collection(db, APPOINTMENTS),
    where('userId', '==', userId)
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
 * Real-time listener for a user's appointments.
 * Returns an unsubscribe function.
 */
export const onUserAppointments = (userId, callback) => {
  const q = query(
    collection(db, APPOINTMENTS),
    where('userId', '==', userId)
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
      console.error('onUserAppointments error:', error);
      callback([]);
    }
  );
};

/**
 * Update appointment status (approve / reject).
 */
export const updateAppointmentStatus = async (appointmentId, status) => {
  const docRef = doc(db, APPOINTMENTS, appointmentId);
  return await updateDoc(docRef, { status, updatedAt: Timestamp.now() });
};
