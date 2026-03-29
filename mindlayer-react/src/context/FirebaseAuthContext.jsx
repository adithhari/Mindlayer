import React, { createContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const FirebaseAuthContext = createContext(null);

export const FirebaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Register new user with email and password
  const register = async (email, password) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Initialize user document in Firestore with schema
      await initializeUserDocument(result.user);
      
      return result.user;
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Initialize user document with schema structure
  const initializeUserDocument = async (firebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // User profile fields (to be filled during onboarding)
        name: '',
        avatar: '',
        preferences: {
          theme: 'light',
          notifications: true,
        },
      });
      console.log('✓ User document initialized in Firestore');
    } catch (err) {
      console.error('Error initializing user document:', err);
      throw err;
    }
  };

  // Login user with email and password
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Helper: Convert Firebase error codes to user-friendly messages
  const getFirebaseErrorMessage = (code) => {
    const errors = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'Account has been disabled',
      'auth/user-not-found': 'Email not found. Please sign up first.',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already registered. Try logging in.',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/operation-not-allowed': 'Email/password authentication is not enabled',
      'auth/too-many-requests': 'Too many failed login attempts. Try again later.',
    };
    return errors[code] || 'An authentication error occurred. Please try again.';
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
