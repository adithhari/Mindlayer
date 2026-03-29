import { useState, useCallback } from "react";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

/**
 * useFirebaseStorage - Custom hook for Firestore CRUD operations
 * Handles user profile and app data persistence
 */
export const useFirebaseStorage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========== USER PROFILE OPERATIONS ==========

  /**
   * Save or update user profile
   * @param {Object} profileData - { name, avatar, preferences, etc. }
   */
  const saveUserProfile = useCallback(
    async (profileData) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            ...profileData,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        return { uid: user.uid, ...profileData };
      } catch (err) {
        const errorMsg = `Failed to save profile: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Get user profile from Firestore
   * @returns {Promise<Object>} User profile data
   */
  const getUserProfile = useCallback(async () => {
    if (!user) throw new Error("User must be authenticated");

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (err) {
      const errorMsg = `Failed to fetch profile: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ========== MOOD LOG & ENTRIES ==========

  /**
   * Save mood entry
   * @param {Object} moodData - { mood, level, timestamp, notes, etc. }
   */
  const saveMoodEntry = useCallback(
    async (moodData) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const moodRef = doc(collection(db, `users/${user.uid}/moods`));
        await setDoc(moodRef, {
          ...moodData,
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        return moodRef.id;
      } catch (err) {
        const errorMsg = `Failed to save mood: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Get all mood entries for user
   * @returns {Promise<Array>} Array of mood entries
   */
  const getMoodEntries = useCallback(async () => {
    if (!user) throw new Error("User must be authenticated");

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, `users/${user.uid}/moods`),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      const errorMsg = `Failed to fetch moods: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ========== JOURNAL ENTRIES ==========

  /**
   * Save journal entry
   * @param {Object} journalData - { title, content, mood, tags, etc. }
   */
  const saveJournalEntry = useCallback(
    async (journalData) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const journalRef = doc(collection(db, `users/${user.uid}/journals`));
        await setDoc(journalRef, {
          ...journalData,
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        return journalRef.id;
      } catch (err) {
        const errorMsg = `Failed to save journal: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Get all journal entries for user
   * @returns {Promise<Array>} Array of journal entries
   */
  const getJournalEntries = useCallback(async () => {
    if (!user) throw new Error("User must be authenticated");

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, `users/${user.uid}/journals`),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      const errorMsg = `Failed to fetch journals: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ========== CONVERSATION HISTORY ==========

  /**
   * Save conversation message
   * @param {Object} messageData - { role, content, timestamp, etc. }
   */
  const saveConversationMessage = useCallback(
    async (messageData) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const msgRef = doc(collection(db, `users/${user.uid}/conversations`));
        await setDoc(msgRef, {
          ...messageData,
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        return msgRef.id;
      } catch (err) {
        const errorMsg = `Failed to save message: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Get conversation history
   * @returns {Promise<Array>} Array of messages
   */
  const getConversationHistory = useCallback(async () => {
    if (!user) throw new Error("User must be authenticated");

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, `users/${user.uid}/conversations`),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      const errorMsg = `Failed to fetch conversations: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ========== HABITS & TRACKING ==========

  /**
   * Save habit or tracking data
   * @param {Object} habitData - { name, frequency, streak, lastCompleted, etc. }
   */
  const saveHabitEntry = useCallback(
    async (habitData) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const habitRef = doc(collection(db, `users/${user.uid}/habits`));
        await setDoc(habitRef, {
          ...habitData,
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        return habitRef.id;
      } catch (err) {
        const errorMsg = `Failed to save habit: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Get all habits for user
   * @returns {Promise<Array>} Array of habits
   */
  const getHabits = useCallback(async () => {
    if (!user) throw new Error("User must be authenticated");

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, `users/${user.uid}/habits`),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      const errorMsg = `Failed to fetch habits: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update existing document by ID
   * @param {string} collection - Collection name (e.g., 'moods', 'journals')
   * @param {string} docId - Document ID
   * @param {Object} data - Data to update
   */
  const updateDocument = useCallback(
    async (collection, docId, data) => {
      if (!user) throw new Error("User must be authenticated");

      setLoading(true);
      setError(null);

      try {
        const docRef = doc(db, `users/${user.uid}/${collection}`, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        const errorMsg = `Failed to update document: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  return {
    loading,
    error,
    // User profile
    saveUserProfile,
    getUserProfile,
    // Mood tracking
    saveMoodEntry,
    getMoodEntries,
    // Journaling
    saveJournalEntry,
    getJournalEntries,
    // Conversations
    saveConversationMessage,
    getConversationHistory,
    // Habits
    saveHabitEntry,
    getHabits,
    // Generic update
    updateDocument,
  };
};
