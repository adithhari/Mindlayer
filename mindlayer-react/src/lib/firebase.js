import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ============================================
// FIREBASE CONFIGURATION
// ============================================
// TODO: Replace with your Firebase project credentials
// Get these from: https://console.firebase.google.com/
// Project Settings → Service Accounts → Firebase SDK snippet

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Validate Firebase config
if (!firebaseConfig.apiKey) {
  console.error("❌ Firebase config not fully loaded!");
  console.error("Missing environment variables:");
  console.error(
    "  - VITE_FIREBASE_API_KEY:",
    firebaseConfig.apiKey ? "✓" : "✗",
  );
  console.error(
    "  - VITE_FIREBASE_AUTH_DOMAIN:",
    firebaseConfig.authDomain ? "✓" : "✗",
  );
  console.error(
    "  - VITE_FIREBASE_PROJECT_ID:",
    firebaseConfig.projectId ? "✓" : "✗",
  );
  console.error(
    "  - VITE_FIREBASE_STORAGE_BUCKET:",
    firebaseConfig.storageBucket ? "✓" : "✗",
  );
  console.error(
    "  - VITE_FIREBASE_MESSAGING_SENDER_ID:",
    firebaseConfig.messagingSenderId ? "✓" : "✗",
  );
  console.error("  - VITE_FIREBASE_APP_ID:", firebaseConfig.appId ? "✓" : "✗");
  console.warn("Add .env.local file with VITE_FIREBASE_* variables");
} else {
  console.log("✓ Firebase config loaded successfully");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
