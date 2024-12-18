import { collection, doc, setDoc, getDoc, getDocs, writeBatch, Firestore } from 'firebase/firestore';
import { db } from './config';
import { CollectionName } from './collections';

// Type for objects with ID
export interface WithId {
  id: string;
}

// Error handling utilities
const handleFirebaseError = (error: unknown, context: string): null => {
  console.error(`Firebase Error (${context}):`, error);
  return null;
};

// Retry mechanism
const retry = async <T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return null;
};

// Core Firestore operations
export const firestore = {
  save: async <T extends WithId>(collectionName: CollectionName, data: T[]): Promise<T[] | null> => {
    try {
      if (!Array.isArray(data) || data.length === 0) return null;
      if (!db) return null;
      
      const batch = writeBatch(db);
      
      data.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
      });

      await retry(() => batch.commit());
      return data;
    } catch (error) {
      return handleFirebaseError(error, `save:${collectionName}`);
    }
  },

  loadAll: async <T extends WithId>(collectionName: CollectionName): Promise<T[]> => {
    try {
      if (!db) return [];

      const colRef = collection(db, collectionName);
      const snapshot = await retry(() => getDocs(colRef));
      if (!snapshot) return [];

      return snapshot.docs
        .filter(doc => doc.exists())
        .map(doc => ({
          ...doc.data(),
          id: doc.id
        } as T));
    } catch (error) {
      return handleFirebaseError(error, `loadAll:${collectionName}`) ?? [];
    }
  },

  loadOne: async <T extends WithId>(collectionName: CollectionName, id: string): Promise<T | null> => {
    try {
      if (!db) return null;

      const docRef = doc(db, collectionName, id);
      const snapshot = await retry(() => getDoc(docRef));
      if (!snapshot?.exists()) return null;
      return { ...snapshot.data(), id: snapshot.id } as T;
    } catch (error) {
      return handleFirebaseError(error, `loadOne:${collectionName}:${id}`);
    }
  }
};