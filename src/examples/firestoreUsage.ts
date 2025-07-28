// Example usage of the Firestore service
import firestoreService, { FirestoreTrade, FirestoreHolding, FirestoreBucket } from '../services/firestore';

// ==================== TRADES EXAMPLES ====================

export const tradesExamples = {
  // Add a new trade
  async addTrade() {
    const newTrade: Omit<FirestoreTrade, 'createdAt' | 'updatedAt'> = {
      symbol: 'RELIANCE',
      type: 'buy',
      quantity: 10,
      price: 2500,
      date: '2024-01-15',
      bucketId: 'bucket1',
      name: 'Reliance Industries',
      investmentType: 'stock',
      brokerBank: 'Zerodha'
    };

    try {
      const tradeId = await firestoreService.trades.addTrade(newTrade);
      console.log('Trade added with ID:', tradeId);
      return tradeId;
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  },

  // Fetch all trades
  async getAllTrades() {
    try {
      const trades = await firestoreService.trades.getTrades();
      console.log('All trades:', trades);
      return trades;
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  },

  // Get trades by symbol
  async getTradesBySymbol() {
    try {
      const trades = await firestoreService.trades.getTradesBySymbol('RELIANCE');
      console.log('RELIANCE trades:', trades);
      return trades;
    } catch (error) {
      console.error('Error fetching trades by symbol:', error);
    }
  },

  // Update a trade
  async updateTrade(tradeId: string) {
    try {
      await firestoreService.trades.updateTrade(tradeId, {
        quantity: 15,
        price: 2600
      });
      console.log('Trade updated successfully');
    } catch (error) {
      console.error('Error updating trade:', error);
    }
  },

  // Delete a trade
  async deleteTrade(tradeId: string) {
    try {
      await firestoreService.trades.deleteTrade(tradeId);
      console.log('Trade deleted successfully');
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  },

  // Subscribe to real-time trades
  subscribeToTrades() {
    const unsubscribe = firestoreService.trades.subscribeToTrades((trades) => {
      console.log('Real-time trades update:', trades);
      // Update your UI here
    });

    // Call unsubscribe() when component unmounts
    return unsubscribe;
  }
};

// ==================== HOLDINGS EXAMPLES ====================

export const holdingsExamples = {
  // Add or update a holding
  async upsertHolding() {
    const holding: Omit<FirestoreHolding, 'createdAt' | 'updatedAt'> = {
      symbol: 'RELIANCE',
      totalQuantity: 25,
      averagePrice: 2550,
      currentPrice: 2600,
      value: 65000,
      bucketId: 'bucket1',
      name: 'Reliance Industries',
      investmentType: 'stock'
    };

    try {
      const holdingId = await firestoreService.holdings.upsertHolding(holding);
      console.log('Holding upserted with ID:', holdingId);
      return holdingId;
    } catch (error) {
      console.error('Error upserting holding:', error);
    }
  },

  // Get all holdings
  async getAllHoldings() {
    try {
      const holdings = await firestoreService.holdings.getHoldings();
      console.log('All holdings:', holdings);
      return holdings;
    } catch (error) {
      console.error('Error fetching holdings:', error);
    }
  },

  // Subscribe to real-time holdings
  subscribeToHoldings() {
    const unsubscribe = firestoreService.holdings.subscribeToHoldings((holdings) => {
      console.log('Real-time holdings update:', holdings);
      // Update your UI here
    });

    return unsubscribe;
  }
};

// ==================== BUCKETS EXAMPLES ====================

export const bucketsExamples = {
  // Add a new bucket
  async addBucket() {
    const newBucket: Omit<FirestoreBucket, 'createdAt' | 'updatedAt'> = {
      name: 'Emergency Fund',
      targetAmount: 500000,
      purpose: 'Emergency expenses and financial security',
      color: '#FF6B6B'
    };

    try {
      const bucketId = await firestoreService.buckets.addBucket(newBucket);
      console.log('Bucket added with ID:', bucketId);
      return bucketId;
    } catch (error) {
      console.error('Error adding bucket:', error);
    }
  },

  // Get all buckets
  async getAllBuckets() {
    try {
      const buckets = await firestoreService.buckets.getBuckets();
      console.log('All buckets:', buckets);
      return buckets;
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  },

  // Update a bucket
  async updateBucket(bucketId: string) {
    try {
      await firestoreService.buckets.updateBucket(bucketId, {
        targetAmount: 600000,
        purpose: 'Updated emergency fund target'
      });
      console.log('Bucket updated successfully');
    } catch (error) {
      console.error('Error updating bucket:', error);
    }
  },

  // Subscribe to real-time buckets
  subscribeToBuckets() {
    const unsubscribe = firestoreService.buckets.subscribeToBuckets((buckets) => {
      console.log('Real-time buckets update:', buckets);
      // Update your UI here
    });

    return unsubscribe;
  }
};

// ==================== PORTFOLIO ANALYTICS EXAMPLES ====================

export const portfolioExamples = {
  // Recompute holdings from trades
  async recomputeHoldings() {
    try {
      await firestoreService.portfolio.recomputeHoldings();
      console.log('Holdings recomputed successfully');
    } catch (error) {
      console.error('Error recomputing holdings:', error);
    }
  },

  // Update bucket values
  async updateBucketValues() {
    try {
      await firestoreService.portfolio.updateBucketValues();
      console.log('Bucket values updated successfully');
    } catch (error) {
      console.error('Error updating bucket values:', error);
    }
  }
};

// ==================== BATCH OPERATIONS EXAMPLES ====================

export const batchExamples = {
  // Batch add multiple trades
  async addMultipleTrades() {
    const trades: Omit<FirestoreTrade, 'createdAt' | 'updatedAt'>[] = [
      {
        symbol: 'TCS',
        type: 'buy',
        quantity: 5,
        price: 3500,
        date: '2024-01-16',
        name: 'Tata Consultancy Services',
        investmentType: 'stock'
      },
      {
        symbol: 'INFY',
        type: 'buy',
        quantity: 8,
        price: 1800,
        date: '2024-01-17',
        name: 'Infosys',
        investmentType: 'stock'
      }
    ];

    try {
      await firestoreService.batch.addTrades(trades);
      console.log('Multiple trades added successfully');
    } catch (error) {
      console.error('Error batch adding trades:', error);
    }
  },

  // Batch delete trades
  async deleteMultipleTrades(tradeIds: string[]) {
    try {
      await firestoreService.batch.deleteTrades(tradeIds);
      console.log('Multiple trades deleted successfully');
    } catch (error) {
      console.error('Error batch deleting trades:', error);
    }
  }
};

// ==================== COMPLETE WORKFLOW EXAMPLE ====================

export const workflowExample = {
  async completePortfolioWorkflow() {
    try {
      console.log('Starting complete portfolio workflow...');

      // 1. Create buckets
      const emergencyBucketId = await firestoreService.buckets.addBucket({
        name: 'Emergency Fund',
        targetAmount: 500000,
        purpose: 'Emergency expenses',
        color: '#FF6B6B'
      });

      const growthBucketId = await firestoreService.buckets.addBucket({
        name: 'Growth Investments',
        targetAmount: 1000000,
        purpose: 'Long-term wealth creation',
        color: '#4ECDC4'
      });

      // 2. Add trades
      await firestoreService.trades.addTrade({
        symbol: 'RELIANCE',
        type: 'buy',
        quantity: 10,
        price: 2500,
        date: '2024-01-15',
        bucketId: growthBucketId,
        name: 'Reliance Industries',
        investmentType: 'stock'
      });

      await firestoreService.trades.addTrade({
        symbol: 'LIQUID_FUND',
        type: 'buy',
        quantity: 1000,
        price: 100,
        date: '2024-01-16',
        bucketId: emergencyBucketId,
        name: 'Liquid Fund',
        investmentType: 'mutual_fund'
      });

      // 3. Recompute holdings from trades
      await firestoreService.portfolio.recomputeHoldings();

      // 4. Update bucket values
      await firestoreService.portfolio.updateBucketValues();

      // 5. Fetch updated data
      const trades = await firestoreService.trades.getTrades();
      const holdings = await firestoreService.holdings.getHoldings();
      const buckets = await firestoreService.buckets.getBuckets();

      console.log('Workflow completed successfully!');
      console.log('Final state:', { trades, holdings, buckets });

    } catch (error) {
      console.error('Workflow error:', error);
    }
  }
};

// ==================== REACT HOOK EXAMPLE ====================

export const usePortfolioData = () => {
  // This is how you might use the service in a React component
  /*
  import { useState, useEffect } from 'react';
  import firestoreService from '../services/firestore';

  const [trades, setTrades] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeTrades = firestoreService.trades.subscribeToTrades(setTrades);
    const unsubscribeHoldings = firestoreService.holdings.subscribeToHoldings(setHoldings);
    const unsubscribeBuckets = firestoreService.buckets.subscribeToBuckets(setBuckets);

    setLoading(false);

    return () => {
      unsubscribeTrades();
      unsubscribeHoldings();
      unsubscribeBuckets();
    };
  }, []);

  return { trades, holdings, buckets, loading };
  */
};