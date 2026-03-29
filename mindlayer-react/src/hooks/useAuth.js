import { useContext } from "react";
import { FirebaseAuthContext } from "../context/FirebaseAuthContext";

/**
 * useAuth - Custom hook to access Firebase authentication
 * @returns {Object} { user, loading, error, register, login, logout, isAuthenticated }
 */
export const useAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error("useAuth must be used within FirebaseAuthProvider");
  }
  return context;
};
