import { WithId } from '../firebase/core';

// Type guard for arrays
export const isArray = <T>(value: T | T[]): value is T[] => {
  return Array.isArray(value);
};

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

export const ensureArray = <T extends WithId>(data: T | T[] | null | undefined): T[] => {
  if (!data) return [];
  return isArray(data) ? data : [data];
};

// Sleep utility for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry mechanism for Firebase operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  context: string,
  attempts: number = RETRY_ATTEMPTS
): Promise<T | null> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${context}:`, error);
      if (i === attempts - 1) return null;
      await sleep(RETRY_DELAY * Math.pow(2, i)); // Exponential backoff
    }
  }
  return null;
};