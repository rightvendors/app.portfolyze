import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Types for Firestore documents
export interface FirestoreTrade {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  bucketId?: string;
  // Additional fields from existing Trade interface
  investmentType?: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'index_fund' | 'etf';
  name?: string;
  isin?: string;
  interestRate?: number;
  buyRate?: number;
  sellRate?: number;
  buyAmount?: number;
  sellAmount?: number;
  brokerBank?: string;
  bucketAllocation?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreHolding {
  symbol: string;
  totalQuantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  bucketId?: string;
  // Additional fields from existing Holding interface
  name?: string;
  investmentType?: string;
  netQuantity?: number;
  averageBuyPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  gainLossAmount?: number;
  gainLossPercent?: number;
  annualYield?: number;
  xirr?: number;
  bucketAllocation?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreBucket {
  name: string;
  targetAmount: number;
  purpose: string;
  color: string;
  // Additional fields
  currentValue?: number;
  progressPercent?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Error handling utility
const handleFirestoreError = (error: FirestoreError, operation: string): never => {
  console.error(`Firestore ${operation} error:`, error);
  throw new Error(`Failed to ${operation}: ${error.message}`);
};

// Authentication guard
const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated. Please sign in first.');
  }
  return user;
};

// Collection references
const getUserCollection = (uid: string, collectionName: string) => {
  return collection(db, 'users', uid, collectionName);
};

const getUserDoc = (uid: string, collectionName: string, docId: string) => {
  return doc(db, 'users', uid, collectionName, docId);
};

// Document converter utilities
const convertTimestamp = (timestamp: Timestamp | null | undefined): string => {
  return timestamp?.toDate().toISOString() || new Date().toISOString();
};

const convertFirestoreDoc = <T>(doc: QueryDocumentSnapshot<DocumentData>): T & { id: string } => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  } as T & { id: string };
};

// ==================== TRADES OPERATIONS ====================

export const tradesService = {
  /**
   * Add a new trade
   */
  async addTrade(trade: Omit<FirestoreTrade, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = getCurrentUser();
      const tradesRef = getUserCollection(user.uid, 'trades');
      
      const tradeData = {
        ...trade,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(tradesRef, tradeData);
      console.log('Trade added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add trade');
    }
  },

  /**
   * Fetch all trades for the current user
   */
  async getTrades(): Promise<(FirestoreTrade & { id: string })[]> {
    try {
      const user = getCurrentUser();
      const tradesRef = getUserCollection(user.uid, 'trades');
      const q = query(tradesRef, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const trades = querySnapshot.docs.map(doc => convertFirestoreDoc<FirestoreTrade>(doc));
      
      console.log(`Fetched ${trades.length} trades`);
      return trades;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'fetch trades');
    }
  },

  /**
   * Fetch trades by symbol
   */
  async getTradesBySymbol(symbol: string): Promise<(FirestoreTrade & { id: string })[]> {
    try {
      const user = getCurrentUser();
      const tradesRef = getUserCollection(user.uid, 'trades');
      const q = query(tradesRef, where('symbol', '==', symbol), orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const trades = querySnapshot.docs.map(doc => convertFirestoreDoc<FirestoreTrade>(doc));
      
      return trades;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'fetch trades by symbol');
    }
  },

  /**
   * Fetch trades by bucket
   */
  async getTradesByBucket(bucketId: string): Promise<(FirestoreTrade & { id: string })[]> {
    try {
      const user = getCurrentUser();
      const tradesRef = getUserCollection(user.uid, 'trades');
      const q = query(tradesRef, where('bucketId', '==', bucketId), orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const trades = querySnapshot.docs.map(doc => convertFirestoreDoc<FirestoreTrade>(doc));
      
      return trades;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'fetch trades by bucket');
    }
  },

  /**
   * Update a trade
   */
  async updateTrade(tradeId: string, updates: Partial<FirestoreTrade>): Promise<void> {
    try {
      const user = getCurrentUser();
      const tradeRef = getUserDoc(user.uid, 'trades', tradeId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(tradeRef, updateData);
      console.log('Trade updated successfully:', tradeId);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update trade');
    }
  },

  /**
   * Delete a trade
   */
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      const user = getCurrentUser();
      const tradeRef = getUserDoc(user.uid, 'trades', tradeId);
      
      await deleteDoc(tradeRef);
      console.log('Trade deleted successfully:', tradeId);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete trade');
    }
  },

  /**
   * Subscribe to real-time trades updates
   */
  subscribeToTrades(callback: (trades: (FirestoreTrade & { id: string })[]) => void): () => void {
    try {
      const user = getCurrentUser();
      const tradesRef = getUserCollection(user.uid, 'trades');
      const q = query(tradesRef, orderBy('date', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const trades = snapshot.docs.map(doc => convertFirestoreDoc<FirestoreTrade>(doc));
        callback(trades);
      }, (error) => {
        console.error('Trades subscription error:', error);
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'subscribe to trades');
    }
  }
};

// ==================== HOLDINGS OPERATIONS ====================

export const holdingsService = {
  /**
   * Add or update a holding
   */
  async upsertHolding(holding: Omit<FirestoreHolding, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = getCurrentUser();
      const holdingsRef = getUserCollection(user.uid, 'holdings');
      
      // Check if holding exists for this symbol
      const q = query(holdingsRef, where('symbol', '==', holding.symbol));
      const existingDocs = await getDocs(q);
      
      const holdingData = {
        ...holding,
        updatedAt: serverTimestamp()
      };

      if (existingDocs.empty) {
        // Create new holding
        const docRef = await addDoc(holdingsRef, {
          ...holdingData,
          createdAt: serverTimestamp()
        });
        console.log('Holding created:', docRef.id);
        return docRef.id;
      } else {
        // Update existing holding
        const existingDoc = existingDocs.docs[0];
        await updateDoc(existingDoc.ref, holdingData);
        console.log('Holding updated:', existingDoc.id);
        return existingDoc.id;
      }
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'upsert holding');
    }
  },

  /**
   * Fetch all holdings
   */
  async getHoldings(): Promise<(FirestoreHolding & { id: string })[]> {
    try {
      const user = getCurrentUser();
      const holdingsRef = getUserCollection(user.uid, 'holdings');
      const q = query(holdingsRef, orderBy('value', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const holdings = querySnapshot.docs.map(doc => convertFirestoreDoc<FirestoreHolding>(doc));
      
      console.log(`Fetched ${holdings.length} holdings`);
      return holdings;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'fetch holdings');
    }
  },

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string): Promise<void> {
    try {
      const user = getCurrentUser();
      const holdingRef = getUserDoc(user.uid, 'holdings', holdingId);
      
      await deleteDoc(holdingRef);
      console.log('Holding deleted successfully:', holdingId);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete holding');
    }
  },

  /**
   * Subscribe to real-time holdings updates
   */
  subscribeToHoldings(callback: (holdings: (FirestoreHolding & { id: string })[]) => void): () => void {
    try {
      const user = getCurrentUser();
      const holdingsRef = getUserCollection(user.uid, 'holdings');
      const q = query(holdingsRef, orderBy('value', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const holdings = snapshot.docs.map(doc => convertFirestoreDoc<FirestoreHolding>(doc));
        callback(holdings);
      }, (error) => {
        console.error('Holdings subscription error:', error);
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'subscribe to holdings');
    }
  }
};

// ==================== BUCKETS OPERATIONS ====================

export const bucketsService = {
  /**
   * Add a new bucket
   */
  async addBucket(bucket: Omit<FirestoreBucket, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const user = getCurrentUser();
      const bucketsRef = getUserCollection(user.uid, 'buckets');
      
      const bucketData = {
        ...bucket,
        currentValue: 0,
        progressPercent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(bucketsRef, bucketData);
      console.log('Bucket added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add bucket');
    }
  },

  /**
   * Fetch all buckets
   */
  async getBuckets(): Promise<(FirestoreBucket & { id: string })[]> {
    try {
      const user = getCurrentUser();
      const bucketsRef = getUserCollection(user.uid, 'buckets');
      const q = query(bucketsRef, orderBy('name'));
      
      const querySnapshot = await getDocs(q);
      const buckets = querySnapshot.docs.map(doc => convertFirestoreDoc<FirestoreBucket>(doc));
      
      console.log(`Fetched ${buckets.length} buckets`);
      return buckets;
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'fetch buckets');
    }
  },

  /**
   * Update a bucket
   */
  async updateBucket(bucketId: string, updates: Partial<FirestoreBucket>): Promise<void> {
    try {
      const user = getCurrentUser();
      const bucketRef = getUserDoc(user.uid, 'buckets', bucketId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(bucketRef, updateData);
      console.log('Bucket updated successfully:', bucketId);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update bucket');
    }
  },

  /**
   * Delete a bucket
   */
  async deleteBucket(bucketId: string): Promise<void> {
    try {
      const user = getCurrentUser();
      const bucketRef = getUserDoc(user.uid, 'buckets', bucketId);
      
      await deleteDoc(bucketRef);
      console.log('Bucket deleted successfully:', bucketId);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete bucket');
    }
  },

  /**
   * Subscribe to real-time buckets updates
   */
  subscribeToBuckets(callback: (buckets: (FirestoreBucket & { id: string })[]) => void): () => void {
    try {
      const user = getCurrentUser();
      const bucketsRef = getUserCollection(user.uid, 'buckets');
      const q = query(bucketsRef, orderBy('name'));
      
      return onSnapshot(q, (snapshot) => {
        const buckets = snapshot.docs.map(doc => convertFirestoreDoc<FirestoreBucket>(doc));
        callback(buckets);
      }, (error) => {
        console.error('Buckets subscription error:', error);
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'subscribe to buckets');
    }
  }
};

// ==================== PORTFOLIO ANALYTICS ====================

export const portfolioService = {
  /**
   * Recompute holdings from trades
   */
  async recomputeHoldings(): Promise<void> {
    try {
      const user = getCurrentUser();
      const trades = await tradesService.getTrades();
      
      // Group trades by symbol
      const holdingsMap = new Map<string, {
        symbol: string;
        totalQuantity: number;
        totalInvested: number;
        bucketId?: string;
        name?: string;
        investmentType?: string;
      }>();

      trades.forEach(trade => {
        const key = trade.symbol;
        const existing = holdingsMap.get(key) || {
          symbol: trade.symbol,
          totalQuantity: 0,
          totalInvested: 0,
          bucketId: trade.bucketId,
          name: trade.name,
          investmentType: trade.investmentType
        };

        if (trade.type === 'buy') {
          existing.totalQuantity += trade.quantity;
          existing.totalInvested += trade.quantity * trade.price;
        } else if (trade.type === 'sell') {
          existing.totalQuantity -= trade.quantity;
          existing.totalInvested -= trade.quantity * trade.price;
        }

        holdingsMap.set(key, existing);
      });

      // Update holdings in Firestore using batch write
      const batch = writeBatch(db);
      const holdingsRef = getUserCollection(user.uid, 'holdings');

      // Clear existing holdings
      const existingHoldings = await getDocs(holdingsRef);
      existingHoldings.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new computed holdings
      holdingsMap.forEach((holding) => {
        if (holding.totalQuantity > 0) { // Only keep holdings with positive quantity
          const newHoldingRef = doc(holdingsRef);
          const averagePrice = holding.totalInvested / holding.totalQuantity;
          
          batch.set(newHoldingRef, {
            symbol: holding.symbol,
            totalQuantity: holding.totalQuantity,
            averagePrice: averagePrice,
            currentPrice: averagePrice, // Will be updated by price service
            value: holding.totalInvested, // Will be updated by price service
            bucketId: holding.bucketId,
            name: holding.name,
            investmentType: holding.investmentType,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });

      await batch.commit();
      console.log('Holdings recomputed successfully');
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'recompute holdings');
    }
  },

  /**
   * Update bucket values based on holdings
   */
  async updateBucketValues(): Promise<void> {
    try {
      const user = getCurrentUser();
      const [holdings, buckets] = await Promise.all([
        holdingsService.getHoldings(),
        bucketsService.getBuckets()
      ]);

      // Calculate current value for each bucket
      const bucketValues = new Map<string, number>();
      
      holdings.forEach(holding => {
        if (holding.bucketId) {
          const currentValue = bucketValues.get(holding.bucketId) || 0;
          bucketValues.set(holding.bucketId, currentValue + (holding.value || 0));
        }
      });

      // Update buckets with current values and progress
      const batch = writeBatch(db);
      
      buckets.forEach(bucket => {
        const currentValue = bucketValues.get(bucket.id) || 0;
        const progressPercent = bucket.targetAmount > 0 ? (currentValue / bucket.targetAmount) * 100 : 0;
        
        const bucketRef = getUserDoc(user.uid, 'buckets', bucket.id);
        batch.update(bucketRef, {
          currentValue,
          progressPercent,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log('Bucket values updated successfully');
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update bucket values');
    }
  }
};

// ==================== BATCH OPERATIONS ====================

export const batchService = {
  /**
   * Batch add multiple trades
   */
  async addTrades(trades: Omit<FirestoreTrade, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    try {
      const user = getCurrentUser();
      const batch = writeBatch(db);
      const tradesRef = getUserCollection(user.uid, 'trades');

      trades.forEach(trade => {
        const newTradeRef = doc(tradesRef);
        batch.set(newTradeRef, {
          ...trade,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`Batch added ${trades.length} trades successfully`);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'batch add trades');
    }
  },

  /**
   * Batch delete trades
   */
  async deleteTrades(tradeIds: string[]): Promise<void> {
    try {
      const user = getCurrentUser();
      const batch = writeBatch(db);

      tradeIds.forEach(tradeId => {
        const tradeRef = getUserDoc(user.uid, 'trades', tradeId);
        batch.delete(tradeRef);
      });

      await batch.commit();
      console.log(`Batch deleted ${tradeIds.length} trades successfully`);
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'batch delete trades');
    }
  }
};

// Export the main service object
export const firestoreService = {
  trades: tradesService,
  holdings: holdingsService,
  buckets: bucketsService,
  portfolio: portfolioService,
  batch: batchService
};

export default firestoreService;