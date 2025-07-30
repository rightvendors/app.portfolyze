import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trade, Holding, BucketSummary, FilterState } from '../types/portfolio';
import { firestoreService } from '../services/firestoreService';
import { useFirebaseAuth } from './useFirebaseAuth';
import { getMutualFundService } from '../services/mutualFundApi';
import { getBreezeService } from '../services/breezeApi';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { navService } from '../services/navService';
import { calculateFixedDepositValue } from '../utils/fixedDepositCalculations';

interface UseFirestorePortfolioOptions {
  enableLazyLoading?: boolean;
  initialTab?: 'trades' | 'holdings' | 'buckets';
}

// Enhanced filter interface with asset type filtering
interface EnhancedFilterState extends FilterState {
  assetType?: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'index_fund' | 'etf' | '';
  minValue?: number;
  maxValue?: number;
}

// XIRR calculation utility using Newton-Raphson method
const calculateXIRR = (cashFlows: { date: Date; amount: number }[]): number => {
  if (cashFlows.length < 2) return 0;
  
  // Sort cash flows by date
  const sortedFlows = cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Convert dates to years from the first cash flow
  const firstDate = sortedFlows[0].date;
  const flows = sortedFlows.map(flow => ({
    amount: flow.amount,
    years: (flow.date.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  }));
  
  // Newton-Raphson method to find XIRR
  let rate = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;
    
    for (const flow of flows) {
      const factor = Math.pow(1 + rate, -flow.years);
      npv += flow.amount * factor;
      derivative -= flow.amount * flow.years * factor / (1 + rate);
    }
    
    if (Math.abs(npv) < tolerance) {
      break;
    }
    
    const newRate = rate - npv / derivative;
    
    // Prevent extreme values
    if (newRate < -0.99 || newRate > 10) {
      break;
    }
    
    rate = newRate;
  }
  
  // Convert to percentage and handle edge cases
  const xirr = rate * 100;
  
  // Return reasonable bounds
  if (isNaN(xirr) || !isFinite(xirr)) return 0;
  if (xirr < -99) return -99;
  if (xirr > 1000) return 1000;
  
  return xirr;
};

// Helper function to validate cash flows for debugging
const validateCashFlows = (cashFlows: { date: Date; amount: number }[], holdingName: string) => {
  const totalOutflows = cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const totalInflows = cashFlows.filter(cf => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0);
  
  console.log(`XIRR Debug for ${holdingName}:`, {
    totalCashFlows: cashFlows.length,
    totalOutflows: totalOutflows.toFixed(2),
    totalInflows: totalInflows.toFixed(2),
    netCashFlow: (totalInflows - totalOutflows).toFixed(2),
    cashFlows: cashFlows.map(cf => ({
      date: cf.date.toISOString().split('T')[0],
      amount: cf.amount.toFixed(2)
    }))
  });
};

// Memoized price cache with better structure
interface PriceCacheEntry {
  price: number;
  timestamp: number;
  retryCount: number;
  lastError?: string;
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
    buckets: false,
    prices: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [subscriptions, setSubscriptions] = useState<{
    trades?: () => void;
    holdings?: () => void;
    buckets?: () => void;
  }>({});
  
  // Save notification state
  const [saveNotification, setSaveNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'loading';
  }>({ show: false, message: '', type: 'success' });
  
  // Enhanced calculated data states
  const [calculatedHoldings, setCalculatedHoldings] = useState<Holding[]>([]);
  const [calculatedBuckets, setCalculatedBuckets] = useState<BucketSummary[]>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  // Enhanced filters with asset type support
  const [filters, setFilters] = useState<EnhancedFilterState>({
    investmentType: '',
    buckets: '',
    transactionType: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    assetType: '',
    minValue: undefined,
    maxValue: undefined
  });

  // Enhanced price cache with retry logic and error tracking
  const [priceCache, setPriceCache] = useState<{ [key: string]: PriceCacheEntry }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const MAX_RETRY_COUNT = 3;

  // Performance optimization: Memoized unique investments
  const uniqueInvestments = useMemo(() => {
    const investmentMap = new Map<string, { type: string; lastTradeDate: string; isin?: string }>();
    trades.forEach(trade => {
      if (trade.name.trim()) {
        // For mutual funds, use ISIN as key if available, otherwise use name
        const key = (trade.investmentType === 'mutual_fund' && trade.isin) ? trade.isin : trade.name;
        
        const existing = investmentMap.get(key);
        if (!existing || trade.date > existing.lastTradeDate) {
          investmentMap.set(key, {
            type: trade.investmentType,
            lastTradeDate: trade.date,
            isin: trade.isin
          });
        }
      }
    });
    return investmentMap;
  }, [trades]);

  // Fast initial load - show interface immediately
  const fastInitialLoad = useCallback(() => {
    setLoading(false);
    setHasLoadedInitialData(true);
  }, []);

  // Enhanced price fetching with retry logic and better error handling
  const fetchRealTimePrice = useCallback(async (symbol: string, type: string): Promise<number> => {
    const cacheKey = `${symbol}-${type}`;
    const now = Date.now();
    const cacheEntry = priceCache[cacheKey];
    
    // Check cache first
    if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_DURATION) {
      return cacheEntry.price;
    }
    
    // Skip if too many retries
    if (cacheEntry && cacheEntry.retryCount >= MAX_RETRY_COUNT) {
      console.warn(`Max retries reached for ${symbol}, using cached price`);
      return cacheEntry.price;
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
        // For mutual funds, try to get NAV by ISIN first, then by name
        if (symbol.length === 12) { // ISIN is typically 12 characters
          // Try to get NAV by ISIN
          const navData = await mutualFundService.searchByISIN(symbol);
          if (navData) {
            price = navData.nav;
          }
        }
        // If not found by ISIN, try by name
        if (!price) {
          price = await mutualFundService.getNavPrice(symbol);
        }
      }
      
      // Cache the result with success
      if (price !== null) {
        setPriceCache(prev => ({
          ...prev,
          [cacheKey]: { 
            price, 
            timestamp: now, 
            retryCount: 0,
            lastError: undefined
          }
        }));
        return price;
      }
      
      // No price found, increment retry count
      const retryCount = (cacheEntry?.retryCount || 0) + 1;
      const fallbackPrice = cacheEntry?.price || 100;
      
      setPriceCache(prev => ({
        ...prev,
        [cacheKey]: {
          price: fallbackPrice,
          timestamp: now,
          retryCount,
          lastError: 'No price source available'
        }
      }));
      
      return fallbackPrice;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      
      const retryCount = (cacheEntry?.retryCount || 0) + 1;
      const fallbackPrice = cacheEntry?.price || 100;
      
      setPriceCache(prev => ({
        ...prev,
        [cacheKey]: {
          price: fallbackPrice,
          timestamp: now,
          retryCount,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      
      return fallbackPrice;
    }
  }, [priceCache]);

  // Optimized trades loading with better error handling
  const loadTrades = useCallback(async (userId: string) => {
    if (subscriptions.trades) return; // Prevent duplicate subscriptions
    
    setLoadingStates(prev => ({ ...prev, trades: true }));
    
    try {
      // First, get immediate data
      const immediateData = await firestoreService.getUserTrades(userId);
      setTrades(immediateData);
      
      // Then set up real-time subscription with timeout
      const timeoutId = setTimeout(() => {
        console.warn('Trades subscription timeout');
        setLoadingStates(prev => ({ ...prev, trades: false }));
      }, 10000);
      
      const unsubscribe = firestoreService.subscribeToUserTrades(userId, (newTrades) => {
        clearTimeout(timeoutId);
        setTrades(newTrades);
        setLoadingStates(prev => ({ ...prev, trades: false }));
        setError(null);
      });
      
      setSubscriptions(prev => ({ ...prev, trades: unsubscribe }));
    } catch (error) {
      console.error('Error loading trades:', error);
      setError('Failed to load trades');
      setLoadingStates(prev => ({ ...prev, trades: false }));
    }
  }, [subscriptions.trades]);

  // Optimized holdings calculation with FIFO and cleanup of zero quantities
  const calculateCurrentHoldings = useCallback((): Holding[] => {
    if (trades.length === 0) return [];

    const holdingsMap = new Map<string, {
      investmentType: string;
      bucketAllocation: string;
      isin?: string;
      transactions: Array<{
        date: string;
        type: 'buy' | 'sell';
        quantity: number;
        price: number;
        amount: number;
        interestRate?: number;
      }>;
    }>();

    // Group trades by name (or ISIN for mutual funds)
    trades.forEach(trade => {
      // For mutual funds, use ISIN as the key if available, otherwise use name
      const key = (trade.investmentType === 'mutual_fund' && trade.isin) ? trade.isin : trade.name;
      
      if (!holdingsMap.has(key)) {
        holdingsMap.set(key, {
          investmentType: trade.investmentType,
          bucketAllocation: trade.bucketAllocation,
          isin: trade.isin,
          transactions: []
        });
      }
      
      const holding = holdingsMap.get(key)!;
      holding.transactions.push({
        date: trade.date,
        type: trade.transactionType,
        quantity: trade.quantity,
        price: trade.transactionType === 'buy' ? trade.buyRate : (trade.sellRate || trade.buyRate),
        amount: trade.transactionType === 'buy' ? trade.buyAmount : (trade.sellAmount || trade.buyAmount),
        interestRate: trade.interestRate
      });
    });

    // Calculate holdings using FIFO principle with enhanced logic
    const calculatedHoldings: Holding[] = [];
    
    for (const [name, data] of holdingsMap) {
      const sortedTransactions = data.transactions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let netQuantity = 0;
      let totalInvestedAmount = 0;
      let remainingBuys: Array<{ quantity: number; price: number; date: string }> = [];
      
      // Build cash flows for XIRR calculation
      const cashFlows: { date: Date; amount: number }[] = [];
      
      // Process all transactions to build cash flows
      sortedTransactions.forEach(transaction => {
        if (transaction.type === 'buy') {
          remainingBuys.push({
            quantity: transaction.quantity,
            price: transaction.price,
            date: transaction.date
          });
          netQuantity += transaction.quantity;
          totalInvestedAmount += transaction.amount;
          // Buy transactions are negative cash flows (money going out)
          cashFlows.push({ date: new Date(transaction.date), amount: -transaction.amount });
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
          // Sell transactions are positive cash flows (money coming in)
          // Use sellAmount if available, otherwise calculate from quantity and rate
          const sellAmount = transaction.amount || (transaction.quantity * (transaction.price || 0));
          cashFlows.push({ date: new Date(transaction.date), amount: sellAmount });
        }
      });
      
      // Only include holdings with positive quantity (cleanup zero quantities)
      if (netQuantity > 0 && totalInvestedAmount > 0) {
        const averageBuyPrice = totalInvestedAmount / netQuantity;
        
        // For mutual funds, use ISIN to look up NAV price, otherwise use name
        let cacheKey: string;
        if (data.investmentType === 'mutual_fund' && data.isin) {
          cacheKey = `${data.isin}-${data.investmentType}`;
        } else {
          cacheKey = `${name}-${data.investmentType}`;
        }
        
        let currentPrice = priceCache[cacheKey]?.price || averageBuyPrice;
        let currentValue = netQuantity * currentPrice;
        
        // Handle Fixed Deposit calculations
        if (data.investmentType === 'fixed_deposit') {
          // Get the latest buy trade for fixed deposit
          const latestTrade = sortedTransactions
            .filter(t => t.type === 'buy')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
          if (latestTrade && latestTrade.interestRate) {
            // For fixed deposits: principal = Quantity × Rate
            const principal = latestTrade.quantity * latestTrade.price;
            
            const fdCalculation = calculateFixedDepositValue(
              principal,
              latestTrade.interestRate,
              latestTrade.date
            );
            currentValue = fdCalculation.maturityValue;
            currentPrice = currentValue / netQuantity; // Update price per unit
          }
        }
        
        const gainLossAmount = currentValue - totalInvestedAmount;
        const gainLossPercent = totalInvestedAmount > 0 ? (gainLossAmount / totalInvestedAmount) * 100 : 0;
        
        // Calculate XIRR with proper cash flows
        // Add current value as final positive cash flow (money coming in if sold today)
        const finalCashFlow = { date: new Date(), amount: currentValue };
        const allCashFlows = [...cashFlows, finalCashFlow];
        
        // Debug cash flows for validation (uncomment for debugging)
        // validateCashFlows(allCashFlows, displayName);
        
        const xirr = calculateXIRR(allCashFlows);
        
        // Improved annualized return calculation
        const firstBuyDate = sortedTransactions.find(t => t.type === 'buy')?.date || new Date().toISOString();
        const daysDiff = Math.abs(new Date().getTime() - new Date(firstBuyDate).getTime()) / (1000 * 60 * 60 * 24);
        const years = Math.max(daysDiff / 365.25, 1/365.25);
        const annualYield = totalInvestedAmount > 0 ? (Math.pow(currentValue / totalInvestedAmount, 1 / years) - 1) * 100 : 0;
        
        // For mutual funds, get the name from the trades, not the ISIN key
        let displayName = name;
        if (data.investmentType === 'mutual_fund' && data.isin) {
          // Find the first trade with this ISIN to get the name
          const firstTrade = trades.find(trade => trade.isin === data.isin);
          displayName = firstTrade?.name || name;
        }
        
        calculatedHoldings.push({
          name: displayName,
          investmentType: data.investmentType,
          bucketAllocation: data.bucketAllocation,
          netQuantity,
          averageBuyPrice,
          investedAmount: totalInvestedAmount,
          currentPrice,
          currentValue,
          gainLossAmount,
          gainLossPercent,
          annualYield: isFinite(annualYield) ? annualYield : 0,
          xirr: isFinite(xirr) ? xirr : annualYield
        });
      }
    }
    
    return calculatedHoldings.sort((a, b) => b.currentValue - a.currentValue);
  }, [trades, priceCache]);

  // Enhanced bucket calculation with improved XIRR logic
  const calculateBucketSummary = useCallback((): BucketSummary[] => {
    const defaultBuckets = {
      'bucket1a': { targetAmount: 500000, purpose: 'Emergency Fund' },
      'bucket1b': { targetAmount: 300000, purpose: 'Short Term Goals' },
      'bucket1c': { targetAmount: 200000, purpose: 'Medium Term Goals' },
      'bucket1d': { targetAmount: 150000, purpose: 'Retirement Planning' },
      'bucket1e': { targetAmount: 100000, purpose: 'Tax Saving' },
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

    // Calculate bucket summaries with enhanced metrics
    const bucketSummaries: BucketSummary[] = [];
    
    for (const [bucketName, data] of bucketMap) {
      const currentValue = data.holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const investedAmount = data.holdings.reduce((sum, h) => sum + h.investedAmount, 0);
      const gainLossAmount = currentValue - investedAmount;
      const gainLossPercent = investedAmount > 0 ? (gainLossAmount / investedAmount) * 100 : 0;
      const progressPercent = data.targetAmount > 0 ? Math.min((currentValue / data.targetAmount) * 100, 100) : 0;
      
      // Enhanced weighted returns calculation
      const totalValue = data.holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const weightedAnnualYield = totalValue > 0 
        ? data.holdings.reduce((sum, h) => {
            const weight = h.currentValue / totalValue;
            return sum + (h.annualYield * weight);
          }, 0)
        : 0;
      
      const weightedXirr = totalValue > 0 
        ? data.holdings.reduce((sum, h) => {
            const weight = h.currentValue / totalValue;
            return sum + (h.xirr * weight);
          }, 0)
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
        annualYield: isFinite(weightedAnnualYield) ? weightedAnnualYield : 0,
        xirr: isFinite(weightedXirr) ? weightedXirr : weightedAnnualYield
      });
    }

    return bucketSummaries.sort((a, b) => a.bucketName.localeCompare(b.bucketName));
  }, [buckets, calculateCurrentHoldings]);

  // Optimized lazy loading functions
  const loadHoldings = useCallback(async (userId: string) => {
    if (subscriptions.holdings) return;
    
    setLoadingStates(prev => ({ ...prev, holdings: true }));
    
    setTimeout(() => {
      const calculated = calculateCurrentHoldings();
      setCalculatedHoldings(calculated);
      setLoadingStates(prev => ({ ...prev, holdings: false }));
    }, 200);
  }, [calculateCurrentHoldings, subscriptions.holdings]);

  const loadBuckets = useCallback(async (userId: string) => {
    if (subscriptions.buckets) return;
    
    setLoadingStates(prev => ({ ...prev, buckets: true }));
    
    setTimeout(() => {
      const calculated = calculateBucketSummary();
      setCalculatedBuckets(calculated);
      setLoadingStates(prev => ({ ...prev, buckets: false }));
    }, 200);
  }, [calculateBucketSummary, subscriptions.buckets]);

  // Enhanced user effect with better lifecycle management
  useEffect(() => {
    if (!user) {
      // Cleanup on user logout
      Object.values(subscriptions).forEach(unsubscribe => unsubscribe && unsubscribe());
      setSubscriptions({});
      setTrades([]);
      setCalculatedHoldings([]);
      setCalculatedBuckets([]);
      setLoading(false);
      setLoadingStates({ trades: false, holdings: false, buckets: false, prices: false });
      setHasLoadedInitialData(false);
      return;
    }

    setError(null);

    if (enableLazyLoading) {
      fastInitialLoad();
      
      setTimeout(() => {
        switch (initialTab) {
          case 'trades':
            loadTrades(user.uid);
            break;
          case 'holdings':
            if (!subscriptions.trades) {
              loadTrades(user.uid);
            }
            setTimeout(() => loadHoldings(user.uid), 200);
            break;
          case 'buckets':
            if (!subscriptions.trades) {
              loadTrades(user.uid);
            }
            setTimeout(() => loadBuckets(user.uid), 200);
            break;
        }
      }, 150);
    } else {
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

  // Auto-recalculate holdings and buckets when trades change
  useEffect(() => {
    if (trades.length > 0 && hasLoadedInitialData) {
      // Recalculate holdings
      const newHoldings = calculateCurrentHoldings();
      setCalculatedHoldings(newHoldings);
      
      // Recalculate buckets
      const newBuckets = calculateBucketSummary();
      setCalculatedBuckets(newBuckets);
    }
  }, [trades, calculateCurrentHoldings, calculateBucketSummary, hasLoadedInitialData]);

  // Enhanced filters with asset type and value range support
  useEffect(() => {
    let filtered = trades;
    
    if (filters.investmentType) {
      filtered = filtered.filter(trade => trade.investmentType === filters.investmentType);
    }
    
    if (filters.assetType) {
      filtered = filtered.filter(trade => trade.investmentType === filters.assetType);
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
        (trade.isin && trade.isin.toLowerCase().includes(searchLower)) ||
        trade.brokerBank.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(trade => trade.date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(trade => trade.date <= filters.dateTo);
    }
    
    if (filters.minValue !== undefined) {
      filtered = filtered.filter(trade => trade.buyAmount >= filters.minValue!);
    }
    
    if (filters.maxValue !== undefined) {
      filtered = filtered.filter(trade => trade.buyAmount <= filters.maxValue!);
    }
    
    setFilteredTrades(filtered);
  }, [trades, filters]);

  // Function to manually load data for specific tabs
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
    
    if (subscriptions.trades) {
      subscriptions.trades();
      setSubscriptions(prev => ({ ...prev, trades: undefined }));
    }
    
    setLoadingStates(prev => ({ ...prev, trades: false }));
    setTrades([]);
    
    setTimeout(() => {
      loadTrades(user.uid);
    }, 100);
  }, [user, subscriptions.trades, loadTrades]);

  // CRUD Operations with enhanced error handling
  const addTrade = async (trade: Omit<Trade, 'id' | 'buyAmount'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(), // Temporary ID until Firebase returns the real one
      buyAmount: trade.quantity * trade.buyRate
    };
    
    try {
      setSaveNotification({ show: true, message: 'Saving trade...', type: 'loading' });
      
      // Update local state immediately for better UX
      setTrades(prev => [...prev, newTrade]);
      
      // Then save to Firebase
      const firebaseId = await firestoreService.addTrade(user.uid, newTrade);
      
      // Update the trade with the real Firebase ID
      setTrades(prev => prev.map(t => 
        t.id === newTrade.id ? { ...t, id: firebaseId } : t
      ));
      
      setSaveNotification({ show: true, message: 'Trade saved successfully!', type: 'success' });
    } catch (error) {
      // Remove the trade from local state if Firebase save failed
      setTrades(prev => prev.filter(t => t.id !== newTrade.id));
      setSaveNotification({ show: true, message: 'Failed to save trade', type: 'error' });
      setError('Failed to add trade');
      throw error;
    }
  };

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Store original trade for rollback
      const originalTrade = trades.find(t => t.id === id);
      if (!originalTrade) throw new Error('Trade not found');
      
      const updatedTrade = { ...updates };
      
      // Calculate buyAmount when quantity OR buyRate changes
      const newQuantity = updates.quantity !== undefined ? updates.quantity : originalTrade.quantity;
      const newBuyRate = updates.buyRate !== undefined ? updates.buyRate : originalTrade.buyRate;
      
      if (updates.quantity !== undefined || updates.buyRate !== undefined) {
        updatedTrade.buyAmount = newQuantity * newBuyRate;
      }
      
      setSaveNotification({ show: true, message: 'Updating trade...', type: 'loading' });
      
      // Update local state immediately for better UX
      setTrades(prev => prev.map(trade => 
        trade.id === id ? { ...trade, ...updatedTrade } : trade
      ));
      
      // Then save to Firebase
      await firestoreService.updateTrade(user.uid, id, updatedTrade);
      
      setSaveNotification({ show: true, message: 'Trade updated successfully!', type: 'success' });
    } catch (error) {
      // Rollback local state if Firebase save failed
      if (originalTrade) {
        setTrades(prev => prev.map(trade => 
          trade.id === id ? originalTrade : trade
        ));
      }
      setSaveNotification({ show: true, message: 'Failed to update trade', type: 'error' });
      setError('Failed to update trade');
      throw error;
    }
  };

  const deleteTrade = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Store original trade for rollback
      const originalTrade = trades.find(t => t.id === id);
      
      setSaveNotification({ show: true, message: 'Deleting trade...', type: 'loading' });
      
      // Update local state immediately for better UX
      setTrades(prev => prev.filter(trade => trade.id !== id));
      
      // Then delete from Firebase
      await firestoreService.deleteTrade(user.uid, id);
      
      setSaveNotification({ show: true, message: 'Trade deleted successfully!', type: 'success' });
    } catch (error) {
      // Rollback local state if Firebase delete failed
      if (originalTrade) {
        setTrades(prev => [...prev, originalTrade]);
      }
      setSaveNotification({ show: true, message: 'Failed to delete trade', type: 'error' });
      setError('Failed to delete trade');
      throw error;
    }
  };

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

  // Enhanced price update with batch operations and better performance
  const updateAllPrices = async () => {
    setIsLoadingPrices(true);
    setLoadingStates(prev => ({ ...prev, prices: true }));
    
    try {
      // Use memoized unique investments for better performance
      const investments = Array.from(uniqueInvestments.entries());
      
      // Optimized batch processing
      const batchSize = 3; // Reduced for better API rate limiting
      const results: Array<{ name: string; type: string; price: number }> = [];
      
      for (let i = 0; i < investments.length; i += batchSize) {
        const batch = investments.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async ([key, data]) => {
            const price = await fetchRealTimePrice(key, data.type);
            return { name: key, type: data.type, price, isin: data.isin };
          })
        );
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });
        
        // Rate limiting between batches
        if (i + batchSize < investments.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Batch update to Firestore using the new service
      if (user && results.length > 0) {
        const updatedHoldings = calculateCurrentHoldings();
        const updatedBuckets = calculateBucketSummary();
        
        // Use batch write for better performance
        await persistCalculatedData(user.uid, updatedHoldings, updatedBuckets);
        
        setCalculatedHoldings(updatedHoldings);
        setCalculatedBuckets(updatedBuckets);
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      setError('Failed to update prices');
    } finally {
      setIsLoadingPrices(false);
      setLoadingStates(prev => ({ ...prev, prices: false }));
    }
  };

  // New function to persist calculated data to Firestore using batch writes
  const persistCalculatedData = async (userId: string, holdings: Holding[], bucketSummaries: BucketSummary[]) => {
    try {
      const batch = writeBatch(db);
      
      // Update holdings
      holdings.forEach(holding => {
        const holdingRef = doc(db, 'users', userId, 'holdings', holding.name);
        batch.set(holdingRef, {
          ...holding,
          updatedAt: new Date(),
          lastCalculated: new Date()
        });
      });
      
      // Update buckets
      bucketSummaries.forEach(bucket => {
        const bucketRef = doc(db, 'users', userId, 'buckets', bucket.bucketName);
        batch.set(bucketRef, {
          ...bucket,
          updatedAt: new Date(),
          lastCalculated: new Date()
        });
      });
      
      await batch.commit();
      console.log('Successfully persisted calculated data to Firestore');
    } catch (error) {
      console.error('Error persisting calculated data:', error);
      throw error;
    }
  };

  // New function to filter holdings by asset type
  const getHoldingsByAssetType = useCallback((assetType: string) => {
    return calculatedHoldings.filter(holding => holding.investmentType === assetType);
  }, [calculatedHoldings]);

  // New function to cleanup zero-quantity holdings
  const cleanupZeroHoldings = useCallback(async () => {
    if (!user) return;
    
    try {
      const zeroHoldings = calculatedHoldings.filter(h => h.netQuantity <= 0);
      
      if (zeroHoldings.length > 0) {
        const batch = writeBatch(db);
        
        zeroHoldings.forEach(holding => {
          const holdingRef = doc(db, 'users', user.uid, 'holdings', holding.name);
          batch.delete(holdingRef);
        });
        
        await batch.commit();
        
        // Update local state
        setCalculatedHoldings(prev => prev.filter(h => h.netQuantity > 0));
        
        console.log(`Cleaned up ${zeroHoldings.length} zero-quantity holdings`);
      }
    } catch (error) {
      console.error('Error cleaning up zero holdings:', error);
      setError('Failed to cleanup zero holdings');
    }
  }, [user, calculatedHoldings]);

  // Function to update price cache with NAV data
  const updatePriceCacheWithNAV = useCallback((isin: string, nav: number) => {
    const cacheKey = `${isin}-mutual_fund`;
    setPriceCache(prev => ({
      ...prev,
      [cacheKey]: {
        price: nav,
        timestamp: Date.now(),
        retryCount: 0,
        lastError: undefined
      }
    }));
    console.log(`Updated price cache for ${isin} with NAV: ${nav}`);
  }, []);

  // Enhanced return object with new features
  return {
    // Data
    trades,
    filteredTrades,
    holdings: calculatedHoldings,
    buckets: calculatedBuckets,
    uniqueInvestments, // New: Expose unique investments for debugging
    
    // State
    loading,
    loadingStates,
    hasLoadedInitialData,
    error,
    isLoadingPrices,
    filters,
    priceCache, // New: Expose price cache for debugging
    saveNotification,
    setSaveNotification,
    
    // Actions
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateBucketTarget,
    updateBucketPurpose,
    updateAllPrices,
    loadTabData,
    forceReloadTrades,
    
    // New enhanced functions
    getHoldingsByAssetType,
    cleanupZeroHoldings,
    persistCalculatedData,
    updatePriceCacheWithNAV, // New: Function to update price cache with NAV data
    
    // Utils
    clearError: () => setError(null),
    clearPriceCache: () => setPriceCache({}), // New: Clear price cache
    
    // Performance metrics (for debugging)
    performanceMetrics: {
      tradesCount: trades.length,
      holdingsCount: calculatedHoldings.length,
      bucketsCount: calculatedBuckets.length,
      cachedPricesCount: Object.keys(priceCache).length,
      uniqueInvestmentsCount: uniqueInvestments.size
    }
  };
};