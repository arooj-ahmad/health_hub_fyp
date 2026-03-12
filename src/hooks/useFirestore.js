import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs 
} from 'firebase/firestore';

/**
 * Custom hook for real-time Firestore data
 * @param {string} collectionName - The Firestore collection name
 * @param {string} userId - The user ID to filter by
 * @param {Array} queryConstraints - Additional query constraints
 * @returns {Object} { data, loading, error }
 */
export const useFirestoreCollection = (collectionName, userId = null, queryConstraints = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError(new Error('Firestore not initialized'));
      return;
    }

    let q;
    try {
      const collectionRef = collection(db, collectionName);
      
      // Build query with user filter if provided
      const constraints = userId 
        ? [where('userId', '==', userId), ...queryConstraints]
        : queryConstraints;
      
      q = query(collectionRef, ...constraints);
    } catch (err) {
      console.error('Error building query:', err);
      setError(err);
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching collection:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, userId, JSON.stringify(queryConstraints)]);

  return { data, loading, error };
};

/**
 * Hook for fetching a collection once (no real-time updates)
 */
export const useFirestoreQuery = (collectionName, userId = null, queryConstraints = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError(new Error('Firestore not initialized'));
      return;
    }

    const fetchData = async () => {
      try {
        const collectionRef = collection(db, collectionName);
        const constraints = userId 
          ? [where('userId', '==', userId), ...queryConstraints]
          : queryConstraints;
        
        const q = query(collectionRef, ...constraints);
        const snapshot = await getDocs(q);
        
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setData(documents);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, userId, JSON.stringify(queryConstraints)]);

  return { data, loading, error };
};
