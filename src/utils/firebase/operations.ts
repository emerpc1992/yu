import { doc, setDoc, getDoc } from 'firebase/firestore';
import db from './config';
import { COLLECTIONS, CollectionName } from './collections';
import { firestore, WithId } from './core';

// Create operations for a collection
const createOperation = <T extends WithId>(collectionName: CollectionName) => ({
  save: async (data: T[]): Promise<boolean> => {
    try {
      if (!Array.isArray(data)) return false;
      const result = await firestore.save(collectionName, data);
      return result !== null;
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      return false;
    }
  },
  load: async (): Promise<T[]> => {
    try {
      const result = await firestore.loadAll<T>(collectionName);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(`Error loading ${collectionName}:`, error);
      return [];
    }
  }
});

// Database operations for each collection
export const db_operations = {
  products: createOperation(COLLECTIONS.PRODUCTS),
  clients: createOperation(COLLECTIONS.CLIENTS),
  staff: createOperation(COLLECTIONS.STAFF),
  sales: createOperation(COLLECTIONS.SALES),
  appointments: createOperation(COLLECTIONS.APPOINTMENTS),
  expenses: createOperation(COLLECTIONS.EXPENSES),
  credits: createOperation(COLLECTIONS.CREDITS),
  cashMovements: createOperation(COLLECTIONS.CASH_MOVEMENTS),
  cashRegister: {
    save: async <T extends WithId>(data: T): Promise<boolean> => {
      try {
        if (!db) return false;

        await setDoc(doc(db, COLLECTIONS.CASH_REGISTER, 'current'), {
          ...data,
          id: 'current'
        });
        return true;
      } catch (error) {
        console.error('Error saving cash register:', error);
        return false;
      }
    },
    load: async () => {
      try {
        if (!db) return null;

        const docRef = doc(db, COLLECTIONS.CASH_REGISTER, 'current');
        const snapshot = await getDoc(docRef);
        
        const defaultData = {
          id: 'current',
          amount: 0,
          lastModified: new Date().toISOString()
        };

        if (!snapshot.exists()) {
          await setDoc(docRef, defaultData);
          return defaultData;
        }

        return {
          ...defaultData,
          ...snapshot.data()
        };
      } catch (error) {
        console.error('Error loading cash register:', error);
        return {
          id: 'current',
          amount: 0,
          lastModified: new Date().toISOString()
        };
      }
    }
  }
};