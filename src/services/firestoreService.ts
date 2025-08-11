import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Trade, Holding, BucketSummary } from '../types/portfolio';

export interface FirestoreTrade extends Omit<Trade, 'id'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreHolding extends Omit<Holding, 'name'> {
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreBucket extends Omit<BucketSummary, 'bucketName'> {
  bucketName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirestoreService {
  private getUserCollection(userId: string, collectionName: string) {
    return collection(db, 'users', userId, collectionName);
  }

  private getUserDoc(userId: string, collectionName: string, docId: string) {
    return doc(db, 'users', userId, collectionName, docId);
  }

  // TRADES OPERATIONS
  async getUserTrades(userId: string): Promise<Trade[]> {
    try {
      const tradesRef = this.getUserCollection(userId, 'trades');
      const q = query(tradesRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to string
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Trade[];
    } catch (error) {
      console.error('Error fetching user trades:', error);
      throw error;
    }
  }

  async addTrade(userId: string, trade: Omit<Trade, 'id'>): Promise<string> {
    try {
      const tradesRef = this.getUserCollection(userId, 'trades');
      const tradeData: FirestoreTrade = {
        ...trade,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      const docRef = await addDoc(tradesRef, tradeData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }

  async updateTrade(userId: string, tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      const tradeRef = this.getUserDoc(userId, 'trades', tradeId);
      // Sanitize updates: remove undefined/null, ensure no NaN
      const sanitizedEntries = Object.entries(updates || {}).filter(([_, v]) => {
        if (v === undefined || v === null) return false;
        if (typeof v === 'number' && Number.isNaN(v)) return false;
        return true;
      }).map(([k, v]) => {
        if (typeof v === 'string') return [k, v];
        if (typeof v === 'number') return [k, Number(v)];
        return [k, v];
      });
      const sanitized: Partial<Trade> = Object.fromEntries(sanitizedEntries) as Partial<Trade>;
      const updateData = {
        ...sanitized,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(tradeRef, updateData);
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  }

  async deleteTrade(userId: string, tradeId: string): Promise<void> {
    try {
      const tradeRef = this.getUserDoc(userId, 'trades', tradeId);
      await deleteDoc(tradeRef);
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  }

  async deleteAllTrades(userId: string): Promise<void> {
    try {
      const tradesRef = this.getUserCollection(userId, 'trades');
      const snapshot = await getDocs(tradesRef);
      
      if (snapshot.empty) {
        console.log('No trades to delete');
        return;
      }
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshot.docs.length} trades`);
    } catch (error) {
      console.error('Error deleting all trades:', error);
      throw error;
    }
  }

  // HOLDINGS OPERATIONS
  async getUserHoldings(userId: string): Promise<Holding[]> {
    try {
      const holdingsRef = this.getUserCollection(userId, 'holdings');
      const q = query(holdingsRef, orderBy('currentValue', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Holding[];
    } catch (error) {
      console.error('Error fetching user holdings:', error);
      throw error;
    }
  }

  async updateHolding(userId: string, holdingName: string, holding: Holding): Promise<void> {
    try {
      const holdingRef = this.getUserDoc(userId, 'holdings', holdingName);
      const holdingData: FirestoreHolding = {
        ...holding,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      await updateDoc(holdingRef, holdingData);
    } catch (error) {
      console.error('Error updating holding:', error);
      throw error;
    }
  }

  async batchUpdateHoldings(userId: string, holdings: Holding[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      holdings.forEach(holding => {
        const holdingRef = this.getUserDoc(userId, 'holdings', holding.name);
        const holdingData: FirestoreHolding = {
          ...holding,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp
        };
        batch.set(holdingRef, holdingData);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch updating holdings:', error);
      throw error;
    }
  }

  // BUCKETS OPERATIONS
  async getUserBuckets(userId: string): Promise<BucketSummary[]> {
    try {
      const bucketsRef = this.getUserCollection(userId, 'buckets');
      const q = query(bucketsRef, orderBy('bucketName'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as BucketSummary[];
    } catch (error) {
      console.error('Error fetching user buckets:', error);
      throw error;
    }
  }

  async updateBucket(userId: string, bucketName: string, bucket: BucketSummary): Promise<void> {
    try {
      const bucketRef = this.getUserDoc(userId, 'buckets', bucketName);
      const bucketData: FirestoreBucket = {
        ...bucket,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      await updateDoc(bucketRef, bucketData);
    } catch (error) {
      console.error('Error updating bucket:', error);
      throw error;
    }
  }

  async batchUpdateBuckets(userId: string, buckets: BucketSummary[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      buckets.forEach(bucket => {
        const bucketRef = this.getUserDoc(userId, 'buckets', bucket.bucketName);
        const bucketData: FirestoreBucket = {
          ...bucket,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp
        };
        batch.set(bucketRef, bucketData);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch updating buckets:', error);
      throw error;
    }
  }

  // REAL-TIME LISTENERS
  subscribeToUserTrades(userId: string, callback: (trades: Trade[]) => void) {
    const tradesRef = this.getUserCollection(userId, 'trades');
    const q = query(tradesRef, orderBy('date', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Trade[];
      
      callback(trades);
    }, (error) => {
      console.error('Error in trades subscription:', error);
    });
  }

  subscribeToUserHoldings(userId: string, callback: (holdings: Holding[]) => void) {
    const holdingsRef = this.getUserCollection(userId, 'holdings');
    const q = query(holdingsRef, orderBy('currentValue', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const holdings = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Holding[];
      
      callback(holdings);
    }, (error) => {
      console.error('Error in holdings subscription:', error);
    });
  }

  subscribeToUserBuckets(userId: string, callback: (buckets: BucketSummary[]) => void) {
    const bucketsRef = this.getUserCollection(userId, 'buckets');
    const q = query(bucketsRef, orderBy('bucketName'));
    
    return onSnapshot(q, (snapshot) => {
      const buckets = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as BucketSummary[];
      
      callback(buckets);
    }, (error) => {
      console.error('Error in buckets subscription:', error);
    });
  }

  // CACHE DATA METHODS
  async saveCachedData(type: string, data: any[], metadata: any): Promise<void> {
    try {
      const cacheRef = doc(db, 'cache', type);
      await setDoc(cacheRef, {
        data: data,
        metadata: metadata,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error saving ${type} cache:`, error);
      throw error;
    }
  }

  async getCachedData(): Promise<{
    stocks: any[];
    mutualFunds: any[];
    commodities: any[];
    metadata: any;
  }> {
    try {
      const stocksRef = doc(db, 'cache', 'stocks');
      const mutualFundsRef = doc(db, 'cache', 'mutual_funds');
      const commoditiesRef = doc(db, 'cache', 'commodities');

      const [stocksDoc, mutualFundsDoc, commoditiesDoc] = await Promise.all([
        getDoc(stocksRef),
        getDoc(mutualFundsRef),
        getDoc(commoditiesRef)
      ]);

      return {
        stocks: stocksDoc.exists() ? stocksDoc.data()?.data || [] : [],
        mutualFunds: mutualFundsDoc.exists() ? mutualFundsDoc.data()?.data || [] : [],
        commodities: commoditiesDoc.exists() ? commoditiesDoc.data()?.data || [] : [],
        metadata: {
          stocks: stocksDoc.exists() ? stocksDoc.data()?.metadata : null,
          mutualFunds: mutualFundsDoc.exists() ? mutualFundsDoc.data()?.metadata : null,
          commodities: commoditiesDoc.exists() ? commoditiesDoc.data()?.metadata : null
        }
      };
    } catch (error) {
      console.error('Error getting cached data:', error);
      return {
        stocks: [],
        mutualFunds: [],
        commodities: [],
        metadata: {}
      };
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();