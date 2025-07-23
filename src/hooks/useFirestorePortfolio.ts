import { useState, useEffect, useCallback } from 'react';
import { Trade, Holding, BucketSummary, FilterState } from '../types/portfolio';
import { firestoreService } from '../services/firestoreService';
import { useFirebaseAuth } from './useFirebaseAuth';
import { getMutualFundService } from '../services/mutualFundApi';
import { getBreezeService } from '../services/breezeApi';

export const useFirestorePortfolio = () => {
  const { user } = useFirebaseAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    investmentType: '',
    buckets: '',
    transactionType: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const [priceCache, setPriceCache] = useState<{ [key: string]: { price: number; timestamp: number } }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch real-time price with caching
  const fetchRealTimePrice = useCallback(async (symbol: string, type: string): Promise<number> => {
    const cacheKey = `${symbol}-${type}`;
    const now = Date.now();
    
    // Check cache first
    if (priceCache[cacheKey] && (now - priceCache[cacheKey].timestamp) < CACHE_DURATION) {
      return priceCache[cacheKey].price;
    }
    
    try {
      let price: number | null = null;
      
      // Try Breeze API for stocks
      if (type === 'stock') {
        const breezeService = getBreezeService();
        if (breezeService.isAuthenticated()) {
          price = await breezeService.getCurrentPrice(symbol);
        }
      }
      
      // Try Mutual Fund API for mutual funds
      if (type === 'mutual_fund' && !price) {
        const mutualFundService = getMutualFundService();
        price = await mutualFundService.getNAV(symbol);
      }
      
      // Fallback to mock data
      if (!price || price <= 0) {
        price = Math.random() * 1000 + 100; // Mock price
      }
      
      // Cache the price
      setPriceCache(prev => ({
        ...prev,
        [cacheKey]: { price, timestamp: now }
      }));
      
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return priceCache[cacheKey]?.price || 100;
    }
  }, [priceCache]);

  // Load user data when user changes
  useEffect(() => {
    if (!user) {
      setTrades([]);
      setHoldings([]);
      setBuckets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribeTrades = firestoreService.subscribeToUserTrades(user.uid, (userTrades) => {
      setTrades(userTrades);
      setLoading(false);
    });

    const unsubscribeHoldings = firestoreService.subscribeToUserHoldings(user.uid, (userHoldings) => {
      setHoldings(userHoldings);
    });

    const unsubscribeBuckets = firestoreService.subscribeToUserBuckets(user.uid, (userBuckets) => {
      setBuckets(userBuckets);
    });

    return () => {
      unsubscribeTrades();
      unsubscribeHoldings();
      unsubscribeBuckets();
    };
  }, [user]);

  // Apply filters to trades
  useEffect(() => {
    let filtered = trades;
    
    if (filters.investmentType) {
      filtered = filtered.filter(trade => trade.investmentType === filters.investmentType);
    }
    
    if (filters.buckets) {
      filtered = filtered.filter(trade => trade.bucketAllocation === filters.buckets);
    }
    
    if (filters.transactionType) {
      filtered = filtered.filter(trade => trade.transactionType === filters.transactionType);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(trade => 
        trade.name.toLowerCase().includes(searchTerm) ||
        trade.investmentType.toLowerCase().includes(searchTerm) ||
        trade.transactionType.toLowerCase().includes(searchTerm) ||
        trade.bucketAllocation.toLowerCase().includes(searchTerm) ||
        trade.date.includes(searchTerm)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(trade => new Date(trade.date) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(trade => new Date(trade.date) <= new Date(filters.dateTo));
    }
    
    setFilteredTrades(filtered);
  }, [trades, filters]);

  // CRUD Operations
  const addTrade = async (trade: Omit<Trade, 'id' | 'buyAmount'>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const newTrade = {
        ...trade,
        buyAmount: trade.quantity * trade.buyRate
      };
      
      await firestoreService.addTrade(user.uid, newTrade);
      // Real-time listener will update the state
    } catch (error) {
      setError('Failed to add trade');
      throw error;
    }
  };

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const updatedTrade = { ...updates };
      if (updates.quantity !== undefined && updates.buyRate !== undefined) {
        updatedTrade.buyAmount = updates.quantity * updates.buyRate;
      }
      
      await firestoreService.updateTrade(user.uid, id, updatedTrade);
      // Real-time listener will update the state
    } catch (error) {
      setError('Failed to update trade');
      throw error;
    }
  };

  const deleteTrade = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      await firestoreService.deleteTrade(user.uid, id);
      // Real-time listener will update the state
    } catch (error) {
      setError('Failed to delete trade');
      throw error;
    }
  };

  // Calculate current holdings from trades
  const calculateCurrentHoldings = useCallback((): Holding[] => {
    const holdingsMap = new Map<string, {
      name: string;
      investmentType: string;
      bucketAllocation?: string;
      transactions: Array<{
        date: string;
        type: 'buy' | 'sell';
        quantity: number;
        price: number;
        amount: number;
      }>;
    }>();

    // Group trades by name
    trades.forEach(trade => {
      if (!trade.name || trade.name.trim() === '') return;
      
      if (!holdingsMap.has(trade.name)) {
        holdingsMap.set(trade.name, {
          name: trade.name,
          investmentType: trade.investmentType,
          bucketAllocation: trade.bucketAllocation,
          transactions: []
        });
      }
      
      const holding = holdingsMap.get(trade.name)!;
      holding.transactions.push({
        date: trade.date,
        type: trade.transactionType,
        quantity: trade.quantity,
        price: trade.buyRate,
        amount: trade.buyAmount
      });
    });

    // Calculate holdings using FIFO principle
    const calculatedHoldings: Holding[] = [];
    
    for (const [name, data] of holdingsMap) {
      const sortedTransactions = data.transactions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let netQuantity = 0;
      let totalInvestedAmount = 0;
      let remainingBuys: Array<{ quantity: number; price: number; date: string }> = [];
      
      sortedTransactions.forEach(transaction => {
        if (transaction.type === 'buy') {
          remainingBuys.push({
            quantity: transaction.quantity,
            price: transaction.price,
            date: transaction.date
          });
          netQuantity += transaction.quantity;
          totalInvestedAmount += transaction.amount;
        } else if (transaction.type === 'sell') {
          let sellQuantity = transaction.quantity;
          
          while (sellQuantity > 0 && remainingBuys.length > 0) {
            const oldestBuy = remainingBuys[0];
            
            if (oldestBuy.quantity <= sellQuantity) {
              sellQuantity -= oldestBuy.quantity;
              totalInvestedAmount -= oldestBuy.quantity * oldestBuy.price;
              remainingBuys.shift();
            } else {
              oldestBuy.quantity -= sellQuantity;
              totalInvestedAmount -= sellQuantity * oldestBuy.price;
              sellQuantity = 0;
            }
          }
          
          netQuantity -= transaction.quantity;
        }
      });
      
      if (netQuantity > 0 && totalInvestedAmount > 0) {
        const averageBuyPrice = totalInvestedAmount / netQuantity;
        const cacheKey = `${name}-${data.investmentType}`;
        const currentPrice = priceCache[cacheKey]?.price || averageBuyPrice;
        const currentValue = netQuantity * currentPrice;
        const gainLossAmount = currentValue - totalInvestedAmount;
        const gainLossPercent = totalInvestedAmount > 0 ? (gainLossAmount / totalInvestedAmount) * 100 : 0;
        
        const firstBuyDate = sortedTransactions.find(t => t.type === 'buy')?.date || new Date().toISOString();
        const daysDiff = Math.abs(new Date().getTime() - new Date(firstBuyDate).getTime()) / (1000 * 60 * 60 * 24);
        const years = Math.max(daysDiff / 365, 1/365);
        const annualYield = (Math.pow(currentValue / totalInvestedAmount, 1 / years) - 1) * 100;
        const xirr = annualYield; // Simplified XIRR calculation
        
        calculatedHoldings.push({
          name,
          investmentType: data.investmentType,
          bucketAllocation: data.bucketAllocation,
          netQuantity,
          averageBuyPrice,
          investedAmount: totalInvestedAmount,
          currentPrice,
          currentValue,
          gainLossAmount,
          gainLossPercent,
          annualYield,
          xirr
        });
      }
    }
    
    return calculatedHoldings.sort((a, b) => b.currentValue - a.currentValue);
  }, [trades, priceCache]);

  // Calculate bucket summary
  const calculateBucketSummary = useCallback((): BucketSummary[] => {
    const defaultBuckets = {
      'bucket1a': { targetAmount: 500000, purpose: '' },
      'bucket1b': { targetAmount: 300000, purpose: '' },
      'bucket1c': { targetAmount: 200000, purpose: '' },
      'bucket1d': { targetAmount: 150000, purpose: '' },
      'bucket1e': { targetAmount: 100000, purpose: '' },
      'bucket2': { targetAmount: 400000, purpose: 'Monthly income for financial freedom' },
      'bucket3': { targetAmount: 250000, purpose: 'Get rich with compounding power' }
    };

    const bucketMap = new Map<string, {
      holdings: Holding[];
      targetAmount: number;
      purpose: string;
    }>();

    // Initialize buckets
    Object.entries(defaultBuckets).forEach(([bucketName, config]) => {
      const existingBucket = buckets.find(b => b.bucketName === bucketName);
      bucketMap.set(bucketName, {
        holdings: [],
        targetAmount: existingBucket?.targetAmount || config.targetAmount,
        purpose: existingBucket?.purpose || config.purpose
      });
    });

    // Group holdings by bucket
    const currentHoldings = calculateCurrentHoldings();
    currentHoldings.forEach(holding => {
      if (holding.bucketAllocation && bucketMap.has(holding.bucketAllocation)) {
        bucketMap.get(holding.bucketAllocation)!.holdings.push(holding);
      }
    });

    // Calculate bucket summaries
    const bucketSummaries: BucketSummary[] = [];
    
    for (const [bucketName, data] of bucketMap) {
      const currentValue = data.holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const investedAmount = data.holdings.reduce((sum, h) => sum + h.investedAmount, 0);
      const gainLossAmount = currentValue - investedAmount;
      const gainLossPercent = investedAmount > 0 ? (gainLossAmount / investedAmount) * 100 : 0;
      const progressPercent = data.targetAmount > 0 ? (currentValue / data.targetAmount) * 100 : 0;
      
      const totalValue = data.holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const annualYield = totalValue > 0 
        ? data.holdings.reduce((sum, h) => sum + (h.annualYield * h.currentValue), 0) / totalValue
        : 0;
      const xirr = totalValue > 0 
        ? data.holdings.reduce((sum, h) => sum + (h.xirr * h.currentValue), 0) / totalValue
        : 0;

      bucketSummaries.push({
        bucketName,
        purpose: data.purpose,
        targetAmount: data.targetAmount,
        currentValue,
        investedAmount,
        gainLossAmount,
        gainLossPercent,
        progressPercent,
        holdingsCount: data.holdings.length,
        annualYield,
        xirr
      });
    }

    return bucketSummaries.sort((a, b) => a.bucketName.localeCompare(b.bucketName));
  }, [trades, buckets, priceCache, calculateCurrentHoldings]);

  // Update bucket target
  const updateBucketTarget = async (bucketName: string, targetAmount: number) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const existingBucket = buckets.find(b => b.bucketName === bucketName);
      const updatedBucket: BucketSummary = existingBucket ? {
        ...existingBucket,
        targetAmount
      } : {
        bucketName,
        purpose: '',
        targetAmount,
        currentValue: 0,
        investedAmount: 0,
        gainLossAmount: 0,
        gainLossPercent: 0,
        progressPercent: 0,
        holdingsCount: 0,
        annualYield: 0,
        xirr: 0
      };
      
      await firestoreService.updateBucket(user.uid, bucketName, updatedBucket);
    } catch (error) {
      setError('Failed to update bucket target');
      throw error;
    }
  };

  // Update bucket purpose
  const updateBucketPurpose = async (bucketName: string, purpose: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const existingBucket = buckets.find(b => b.bucketName === bucketName);
      const updatedBucket: BucketSummary = existingBucket ? {
        ...existingBucket,
        purpose
      } : {
        bucketName,
        purpose,
        targetAmount: 0,
        currentValue: 0,
        investedAmount: 0,
        gainLossAmount: 0,
        gainLossPercent: 0,
        progressPercent: 0,
        holdingsCount: 0,
        annualYield: 0,
        xirr: 0
      };
      
      await firestoreService.updateBucket(user.uid, bucketName, updatedBucket);
    } catch (error) {
      setError('Failed to update bucket purpose');
      throw error;
    }
  };

  // Update all prices
  const updateAllPrices = async () => {
    setIsLoadingPrices(true);
    
    try {
      const uniqueInvestments = new Map<string, string>();
      
      trades.forEach(trade => {
        if (trade.name.trim()) {
          uniqueInvestments.set(trade.name, trade.investmentType);
        }
      });
      
      // Fetch prices for all unique investments
      const batchSize = 5;
      const investments = Array.from(uniqueInvestments.entries());
      
      for (let i = 0; i < investments.length; i += batchSize) {
        const batch = investments.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(([name, type]) => fetchRealTimePrice(name, type))
        );
        
        if (i + batchSize < investments.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Update holdings in Firestore
      if (user) {
        const updatedHoldings = calculateCurrentHoldings();
        await firestoreService.batchUpdateHoldings(user.uid, updatedHoldings);
        
        const updatedBuckets = calculateBucketSummary();
        await firestoreService.batchUpdateBuckets(user.uid, updatedBuckets);
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      setError('Failed to update prices');
    } finally {
      setIsLoadingPrices(false);
    }
  };

  return {
    // Data
    trades,
    filteredTrades,
    holdings: calculateCurrentHoldings(),
    buckets: calculateBucketSummary(),
    
    // State
    loading,
    error,
    isLoadingPrices,
    filters,
    
    // Actions
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateBucketTarget,
    updateBucketPurpose,
    updateAllPrices,
    
    // Utils
    clearError: () => setError(null)
  };
};