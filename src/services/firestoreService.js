import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';

// ============================================================================
// HELPER: Validate Firestore Connection
// ============================================================================
const validateFirestore = () => {
  if (!db) {
    throw new Error('Firestore not initialized. Please check Firebase configuration in .env file.');
  }
};

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

export const createDocument = async (collectionName, data) => {
  validateFirestore();
  return await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

export const getDocument = async (collectionName, docId) => {
  validateFirestore();
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateDocument = async (collectionName, docId, data) => {
  validateFirestore();
  const docRef = doc(db, collectionName, docId);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

export const deleteDocument = async (collectionName, docId) => {
  validateFirestore();
  const docRef = doc(db, collectionName, docId);
  return await deleteDoc(docRef);
};

export const getCollectionData = async (collectionName, queryConstraints = []) => {
  validateFirestore();
  const q = query(collection(db, collectionName), ...queryConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

export const getUserProfile = async (userId) => {
  return await getDocument('users', userId);
};

export const createUserProfile = async (userId, profileData) => {
  validateFirestore();
  const docRef = doc(db, 'users', userId);
  const userData = {
    ...profileData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  // FIX: Use setDoc instead of updateDoc to create new document
  await setDoc(docRef, userData);
  return userData;
};

export const updateUserProfile = async (userId, profileData) => {
  return await updateDocument('users', userId, profileData);
};

/**
 * Update the user's current weight AND recalculate BMI in Firestore.
 * Fetches the user's height from their profile, computes BMI, and saves
 * both currentWeight + bmi to the users document.
 */
export const updateUserWeight = async (userId, newWeight) => {
  validateFirestore();
  const docRef = doc(db, 'users', userId);

  // Fetch existing profile to get height for BMI calculation
  const docSnap = await getDoc(docRef);
  const profileData = docSnap.exists() ? docSnap.data() : {};
  const heightCm = profileData?.healthProfile?.height;

  // Calculate BMI: weight (kg) / (height (m))^2
  let bmi = null;
  if (heightCm && heightCm > 0) {
    const heightM = heightCm / 100;
    bmi = parseFloat((newWeight / (heightM * heightM)).toFixed(1));
  }

  const updatePayload = {
    currentWeight: newWeight,
    'healthProfile.weight': newWeight,
    updatedAt: Timestamp.now()
  };

  if (bmi !== null) {
    updatePayload.bmi = bmi;
    updatePayload['healthProfile.BMI'] = bmi;
  }

  return await updateDoc(docRef, updatePayload);
};

/**
 * Subscribe to real-time updates on a user's profile document.
 * Returns an unsubscribe function.
 */
export const onUserProfileSnapshot = (userId, callback) => {
  validateFirestore();
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

// ============================================================================
// DIET PLANS OPERATIONS
// ============================================================================

export const createDietPlan = async (userId, planData) => {
  return await createDocument('dietPlans', {
    ...planData,
    userId,
    status: 'active'
  });
};

export const getUserDietPlans = async (userId, status = null) => {
  validateFirestore();
  const constraints = [where('userId', '==', userId)];
  if (status) {
    constraints.push(where('status', '==', status));
  }
  // Add orderBy after where clauses
  constraints.push(orderBy('createdAt', 'desc'));
  return await getCollectionData('dietPlans', constraints);
};

export const updateDietPlan = async (planId, updates) => {
  return await updateDocument('dietPlans', planId, updates);
};

export const deleteDietPlan = async (planId) => {
  return await deleteDocument('dietPlans', planId);
};

// ============================================================================
// RECIPES OPERATIONS
// ============================================================================

export const createRecipe = async (userId, recipeData) => {
  const docRef = await createDocument('recipes', {
    ...recipeData,
    userId
  });
  return docRef.id;
};

export const getUserRecipes = async (userId) => {
  return await getCollectionData('recipes', [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  ]);
};

export const getAllRecipes = async (limitCount = 50) => {
  return await getCollectionData('recipes', [
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ]);
};

export const updateRecipe = async (recipeId, updates) => {
  return await updateDocument('recipes', recipeId, updates);
};

export const deleteRecipe = async (recipeId) => {
  return await deleteDocument('recipes', recipeId);
};

export const clearAllRecipes = async (userId) => {
  validateFirestore();
  const recipes = await getUserRecipes(userId);
  await Promise.all(recipes.map(recipe => deleteDocument('recipes', recipe.id)));
  return recipes.length;
};

// ============================================================================
// LAB REPORTS OPERATIONS
// ============================================================================

export const createLabReport = async (userId, reportData) => {
  return await createDocument('labReports', {
    ...reportData,
    userId,
    status: 'pending'
  });
};

export const getUserLabReports = async (userId) => {
  validateFirestore();
  return await getCollectionData('labReports', [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  ]);
};

export const updateLabReport = async (reportId, updates) => {
  return await updateDocument('labReports', reportId, updates);
};

export const deleteLabReport = async (reportId) => {
  return await deleteDocument('labReports', reportId);
};

// ============================================================================
// PROGRESS TRACKING OPERATIONS
// ============================================================================

export const logProgress = async (userId, progressData) => {
  return await createDocument('progressLogs', {
    ...progressData,
    userId
  });
};

export const getUserProgress = async (userId, limitCount = 30) => {
  validateFirestore();
  return await getCollectionData('progressLogs', [
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  ]);
};

export const updateProgressLog = async (logId, updates) => {
  return await updateDocument('progressLogs', logId, updates);
};

export const deleteProgressLog = async (logId) => {
  return await deleteDocument('progressLogs', logId);
};

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

export const getUserStats = async (userId) => {
  validateFirestore();
  const [dietPlans, recipes, labReports, progressLogs] = await Promise.all([
    getUserDietPlans(userId, 'active'),
    getUserRecipes(userId),
    getUserLabReports(userId),
    getUserProgress(userId, 7) // Last 7 entries
  ]);

  return {
    activeDietPlans: dietPlans.length,
    totalRecipes: recipes.length,
    totalLabReports: labReports.length,
    recentProgress: progressLogs
  };
};

// ============================================================================
// AI CHAT HISTORY OPERATIONS
// ============================================================================

export const getChatHistory = async (userId, limitCount = 50) => {
  validateFirestore();
  return await getCollectionData('aiChatHistory', [
    where('userId', '==', userId),
    orderBy('timestamp', 'asc'),
    limit(limitCount)
  ]);
};

export const saveChatMessage = async (userId, messageData) => {
  validateFirestore();
  return await createDocument('aiChatHistory', {
    ...messageData,
    userId
  });
};

export const clearChatHistory = async (userId) => {
  validateFirestore();
  const messages = await getChatHistory(userId, 1000);
  await Promise.all(messages.map(msg => deleteDocument('aiChatHistory', msg.id)));
};

