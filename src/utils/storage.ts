import { db_operations } from './firebase/operations';
import { Product } from '../types/product';
import { Client } from '../types/client';
import { Staff } from '../types/staff';
import { Sale } from '../types/sale';
import { Appointment } from '../types/appointment';
import { Expense } from '../types/expense';
import { Credit } from '../types/credit';
import { CashMovement, CashRegister } from '../types/cash';
import { WithId } from './firebase/core';
import { db as firebaseDb } from './firebase/config';
import { isValidConfig, loadFirebaseConfig } from './firebaseConfig';

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return isValidConfig(loadFirebaseConfig()) && firebaseDb !== null;
};

// Create storage operations with proper error handling
const createStorage = <T extends WithId>(collectionName: keyof typeof db_operations) => ({
  save: async (data: T[]): Promise<boolean> => {
    try {
      if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured. Data will not be saved.');
        return false;
      }
      const result = await db_operations[collectionName].save(data);
      return result !== null;
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      return false;
    }
  },
  load: async (): Promise<T[]> => {
    try {
      if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured. Using empty data.');
        return [];
      }
      const result = await db_operations[collectionName].load();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(`Error loading ${collectionName}:`, error);
      return [];
    }
  }
});

export const storage = {
  products: createStorage<Product>('products'),
  clients: createStorage<Client>('clients'), 
  staff: createStorage<Staff>('staff'),
  sales: createStorage<Sale>('sales'),
  appointments: createStorage<Appointment>('appointments'),
  expenses: createStorage<Expense>('expenses'),
  credits: createStorage<Credit>('credits'),
  cashMovements: createStorage<CashMovement>('cashMovements'),
  cashRegister: {
    save: async (data: CashRegister): Promise<boolean> => {
      try {
        const result = await db_operations.cashRegister.save(data);
        return result !== null;
      } catch (error) {
        console.error('Error saving cash register:', error);
        return false;
      }
    },
    load: async (): Promise<CashRegister> => {
      try {
        const data = await db_operations.cashRegister.load();
        return data || {
          id: 'current',
          amount: 0,
          lastModified: new Date().toISOString()
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