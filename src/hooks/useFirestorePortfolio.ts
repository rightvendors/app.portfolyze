import { useState, useEffect, useCallback } from 'react';
import { Trade, Holding, BucketSummary, FilterState } from '../types/portfolio';
import { firestoreService } from '../services/firestoreService';
import { useFirebaseAuth } from './useFirebaseAuth';
import { getMutualFundService } from '../services/mutualFundApi';
import { getBreezeService } from '../services/breezeApi';

interface UseFirestorePortfolioOptions {
  enableLazyLoading?: boolean;
  initialTab?: 'trades' | 'holdings' | 'buckets';
}

export const useFirestorePortfolio = (options: UseFirestorePortfolioOptions = {}) => {
  const { enableLazyLoading = true, initialTab = 'trades' } = options;
  const { user } = useFirebaseAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    trades: false,
    holdings: false,
    buckets: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [subscriptions, setSubscriptions] = useState<{
    trades?: () => void;
    holdings?: () => void;
    buckets?: () => void;
  }>({});
  
  // Calculated data states - only calculate when needed
  const [calculatedHoldings, setCalculatedHoldings] = useState<Holding[]>([]);
  const [calculatedBuckets, setCalculatedBuckets] = useState<BucketSummary[]>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
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

  // Fast initial load - show interface immediately
  const fastInitialLoad = useCallback(() => {
    setLoading(false); // Show interface immediately
    setHasLoadedInitialData(true);
  }, []);

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
      if (!price && type === 'mutual_fund') {
        const mutualFundService = getMutualFundService();
        price = await mutualFundService.getNavPrice(symbol);
      }
      
      // Cache the result
      if (price !== null) {
        setPriceCache(prev => ({
          ...prev,
          [cacheKey]: { price, timestamp: now }
        }));
        return price;
      }
      
      return priceCache[cacheKey]?.price || 100;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return priceCache[cacheKey]?.price || 100;
    }
  }, [priceCache]);

  // Lazy loading functions for each data type
  const loadTrades = useCallback((userId: string) => {
    if (subscriptions.trades) return; // Already subscribed
    
    setLoadingStates(prev => ({ ...prev, trades: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Trades loading timeout - clearing loading state');
      setLoadingStates(prev => ({ ...prev, trades: false }));
    }, 10000); // 10 seconds timeout
    
    try {
      // First try to get data immediately, then set up subscription
      firestoreService.getUserTrades(userId).then((initialTrades) => {
        setTrades(initialTrades);
        setLoadingStates(prev => ({ ...prev, trades: false }));
        clearTimeout(timeoutId);
        
        // Then set up real-time subscription
        const unsubscribe = firestoreService.subscribeToUserTrades(userId, (userTrades) => {
          setTrades(userTrades);
        });
        
        setSubscriptions(prev => ({ ...prev, trades: unsubscribe }));
      }).catch((error) => {
        clearTimeout(timeoutId);
        console.error('Error loading trades:', error);
        setError('Failed to load trades data');
        setLoadingStates(prev => ({ ...prev, trades: false }));
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error setting up trades loading:', error);
      setError('Failed to load trades data');
      setLoadingStates(prev => ({ ...prev, trades: false }));
    }
  }, [subscriptions.trades]);

  const loadHoldings = useCallback((userId: string) => {
    if (subscriptions.holdings) return; // Already subscribed
    
    setLoadingStates(prev => ({ ...prev, holdings: true }));
    
    // Use a background calculation to avoid blocking UI
    setTimeout(() => {
      const calculatedHoldingsData = calculateCurrentHoldings();
      setCalculatedHoldings(calculatedHoldingsData);
    }, 100);
    
    const unsubscribe = firestoreService.subscribeToUserHoldings(userId, (userHoldings) => {
      setHoldings(userHoldings);
      // Recalculate with fresh data in background
      setTimeout(() => {
        const updatedHoldings = calculateCurrentHoldings();
        setCalculatedHoldings(updatedHoldings);
      }, 100);
      setLoadingStates(prev => ({ ...prev, holdings: false }));
    });
    
    setSubscriptions(prev => ({ ...prev, holdings: unsubscribe }));
    setLoadingStates(prev => ({ ...prev, holdings: false }));
  }, [subscriptions.holdings, trades, priceCache]);

  const loadBuckets = useCallback((userId: string) => {
    if (subscriptions.buckets) return; // Already subscribed
    
    setLoadingStates(prev => ({ ...prev, buckets: true }));
    
    // Use a background calculation to avoid blocking UI
    setTimeout(() => {
      const calculatedBucketsData = calculateBucketSummary();
      setCalculatedBuckets(calculatedBucketsData);
    }, 100);
    
    const unsubscribe = firestoreService.subscribeToUserBuckets(userId, (userBuckets) => {
      setBuckets(userBuckets);
      // Recalculate with fresh data in background
      setTimeout(() => {
        const updatedBuckets = calculateBucketSummary();
        setCalculatedBuckets(updatedBuckets);
      }, 100);
      setLoadingStates(prev => ({ ...prev, buckets: false }));
    });
    
    setSubscriptions(prev => ({ ...prev, buckets: unsubscribe }));
    setLoadingStates(prev => ({ ...prev, buckets: false }));
  }, [subscriptions.buckets, trades, buckets, priceCache]);

  // Load user data when user changes
  useEffect(() => {
    if (!user) {
      // Cleanup subscriptions
      Object.values(subscriptions).forEach(unsubscribe => unsubscribe && unsubscribe());
      setSubscriptions({});
      
      setTrades([]);
      setHoldings([]);
      setBuckets([]);
      setCalculatedHoldings([]);
      setCalculatedBuckets([]);
      setLoading(false);
      setLoadingStates({ trades: false, holdings: false, buckets: false });
      setHasLoadedInitialData(false);
      return;
    }

    setError(null);

    if (enableLazyLoading) {
      // Show interface immediately, then load data progressively
      fastInitialLoad();
      
      // Load initial tab data after interface is shown
      setTimeout(() => {
        switch (initialTab) {
          case 'trades':
            loadTrades(user.uid);
            break;
          case 'holdings':
            loadTrades(user.uid); // Need trades for calculations
            setTimeout(() => loadHoldings(user.uid), 300);
            break;
          case 'buckets':
            loadTrades(user.uid); // Need trades for calculations
            setTimeout(() => loadBuckets(user.uid), 300);
            break;
        }
      }, 150); // Load data after UI is shown
    } else {
      // Original behavior - load all data
      setLoading(true);
      setTimeout(() => {
        loadTrades(user.uid);
        loadHoldings(user.uid);
        loadBuckets(user.uid);
        setLoading(false);
      }, 100);
    }

    return () => {
      Object.values(subscriptions).forEach(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [user, enableLazyLoading, initialTab, loadTrades, loadHoldings, loadBuckets, fastInitialLoad]);

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
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(trade => 
        trade.name.toLowerCase().includes(searchLower) ||
        trade.isin.toLowerCase().includes(searchLower) ||
        trade.brokerBank.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(trade => trade.date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(trade => trade.date <= filters.dateTo);
    }
    
    setFilteredTrades(filtered);
  }, [trades, filters]);

  // Function to manually load data for specific tabs (for lazy loading)
  const loadTabData = useCallback((tab: 'trades' | 'holdings' | 'buckets') => {
    if (!user) return;
    
    console.log(`Loading tab data for: ${tab}`);
    
    switch (tab) {
      case 'trades':
        loadTrades(user.uid);
        break;
      case 'holdings':
        loadHoldings(user.uid);
        break;
      case 'buckets':
        loadBuckets(user.uid);
        break;
    }
  }, [user, loadTrades, loadHoldings, loadBuckets]);

  // Force reload function for troubleshooting
  const forceReloadTrades = useCallback(() => {
    if (!user) return;
    
    console.log('Force reloading trades...');
    
    // Clear existing subscription
    if (subscriptions.trades) {
      subscriptions.trades();
      setSubscriptions(prev => ({ ...prev, trades: undefined }));
    }
    
    // Clear loading state and data
    setLoadingStates(prev => ({ ...prev, trades: false }));
    setTrades([]);
    
    // Reload after a brief delay
    setTimeout(() => {
      loadTrades(user.uid);
    }, 100);
  }, [user, subscriptions.trades, loadTrades]);

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
    holdings: calculatedHoldings,
    buckets: calculatedBuckets,
    
    // State
    loading,
    loadingStates, // Added loadingStates to the return object
    hasLoadedInitialData,
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
    loadTabData, // Added loadTabData to the return object
    forceReloadTrades, // Added for troubleshooting
    
    // Utils
    clearError: () => setError(null)
  };
};