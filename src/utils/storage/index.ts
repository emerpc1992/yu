import { db_operations } from '../firebase/operations';
import { Product } from '../../types/product';
import { Client } from '../../types/client';
import { Staff } from '../../types/staff';
import { Sale } from '../../types/sale';
import { Appointment } from '../../types/appointment';
import { Expense } from '../../types/expense';
import { Credit } from '../../types/credit';
import { CashMovement, CashRegister } from '../../types/cash';
import { WithId } from '../firebase/core';

// Default cash register data
const defaultCashRegister: CashRegister = {
  id: 'current',
  amount: 0,
  lastModified: new Date().toISOString()
};

// Create storage operations with proper error handling
const createStorage = <T extends WithId>(collectionName: keyof typeof db_operations) => ({
  save: async (data: T[]): Promise<boolean> => {
    try {
      if (!Array.isArray(data)) {
        console.error(`Invalid data format for ${collectionName}:save - expected array`);
        return false;
      }
      return await db_operations[collectionName].save(data);
    } catch (error) {
      console.error(`Error saving ${collectionName}:`, error);
      return false;
    }
  },
  load: async (): Promise<T[]> => {
    try {
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
        return await db_operations.cashRegister.save(data);
      } catch (error) {
        console.error('Error saving cash register:', error);
        return false;
      }
    },
    load: async (): Promise<CashRegister> => {
      try {
        const data = await db_operations.cashRegister.load();
        return data && 'amount' in data ? data : defaultCashRegister;
      } catch (error) {
        console.error('Error loading cash register:', error);
        return defaultCashRegister;
      }
    }
  }
};