import { useContext } from 'react';
import { FirebaseAuthContext } from '../context/FirebaseAuthContext';

export const useAuth = () => {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) throw new Error('useAuth must be used within FirebaseAuthProvider');
  return ctx;
};
