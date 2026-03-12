import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { login as authLogin, register as authRegister, logout as authLogout } from '../services/authService';
import { getUserProfile, createUserProfile, getDocument } from '../services/firestoreService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, don't set up auth listener
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Check if user profile exists
          const userProfile = await getUserProfile(currentUser.uid);
          
          // If no profile exists, create one
          if (!userProfile) {
            console.log('Creating user profile for:', currentUser.uid);
            await createUserProfile(currentUser.uid, {
              userId: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              photoURL: currentUser.photoURL || null,
              healthProfile: {},
              preferences: {}
            });
            setUserRole('user');
          } else {
            setUserRole(userProfile.role || 'user');
          }
        } catch (error) {
          console.error('Error checking/creating user profile:', error);
        }
      } else {
        setUserRole(null);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Wrapper functions that handle when Firebase is not configured
  const login = async (email, password) => {
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured - simulating login');
      setUser({ email, displayName: email.split('@')[0] });
      return { user: { email } };
    }
    return authLogin(email, password);
  };

  const register = async (email, password, displayName, role = 'user') => {
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured - simulating registration');
      setUser({ email, displayName });
      setUserRole(role);
      return { user: { email, displayName } };
    }
    const result = await authRegister(email, password, displayName);
    // Save role in Firestore users collection
    if (result.user) {
      await createUserProfile(result.user.uid, {
        userId: result.user.uid,
        email: result.user.email,
        displayName,
        role,
        photoURL: null,
        healthProfile: {},
        preferences: {}
      });
      setUserRole(role);
    }
    return result;
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured - simulating logout');
      setUser(null);
      return;
    }
    return authLogout();
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    register,
    logout,
    isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
