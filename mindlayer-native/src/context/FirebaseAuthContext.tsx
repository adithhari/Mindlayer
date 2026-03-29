import React, { createContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const FirebaseAuthContext = createContext<AuthContextValue | null>(null);

const getFirebaseErrorMessage = (code: string): string => {
  const errors: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'Account has been disabled',
    'auth/user-not-found': 'Email not found. Please sign up first.',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered. Try logging in.',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/operation-not-allowed': 'Email/password authentication is not enabled',
    'auth/too-many-requests': 'Too many failed login attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return errors[code] || 'An authentication error occurred. Please try again.';
};

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = async (email: string, password: string): Promise<User> => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        name: '',
        preferences: { theme: 'light', notifications: true },
      });
      return result.user;
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <FirebaseAuthContext.Provider value={{ user, loading, error, register, login, logout, isAuthenticated: !!user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
