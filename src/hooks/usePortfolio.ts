import { useState, useEffect } from 'react';
import { Trade, Summary, FilterState, Holding } from '../types/portfolio';
import { getMutualFundService } from '../services/mutualFundApi';
import { getStockPriceService } from '../services/stockPriceService';
import { getGoldPriceService } from '../services/goldPriceService';

// Local storage keys
const STORAGE_KEYS = {
  TRADES: 'portfolio_trades',
  BUCKET_TARGETS: 'portfolio_bucket_targets',
  PRICE_CACHE: 'portfolio_price_cache'
};

// Helper functions for local storage
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};
export const usePortfolio = () => {
  const [trades, setTrades] = useState<Trade[]>(() => {
    // Load trades from localStorage or create default
    const savedTrades = loadFromLocalStorage(STORAGE_KEYS.TRADES);
    if (savedTrades && savedTrades.length > 0) {
      return savedTrades;
    }
    
    // Create sample test data if no saved data
    const testTrades: Trade[] = [
      {
        id: '1',
        date: '2024-01-15',
        investmentType: 'stock',
        name: 'RELIANCE',
        transactionType: 'buy',
        quantity: 50,
        buyRate: 2400.00,
        buyAmount: 120000,
        brokerBank: 'Zerodha',
        bucketAllocation: 'bucket1a'
      },
      {
        id: '2',
        date: '2024-02-10',
        investmentType: 'stock',
        name: 'TCS',
        transactionType: 'buy',
        quantity: 30,
        buyRate: 3500.00,
        buyAmount: 105000,
        brokerBank: 'Zerodha',
        bucketAllocation: 'bucket1b'
      },
      {
        id: '3',
        date: '2024-01-20',
        investmentType: 'mutual_fund',
        isin: 'INF200K01158',
        name: 'SBI Bluechip Fund Direct Growth',
        transactionType: 'buy',
        quantity: 1500,
        buyRate: 65.45,
        buyAmount: 98175,
        brokerBank: 'SBI MF',
        bucketAllocation: 'bucket2'
      },
      {
        id: '4',
        date: '2024-03-05',
        investmentType: 'stock',
        name: 'INFY',
        transactionType: 'buy',
        quantity: 60,
        buyRate: 1700.00,
        buyAmount: 102000,
        brokerBank: 'ICICI Direct',
        bucketAllocation: 'bucket3'
      },
      {
        id: '5',
        date: '2024-02-28',
        investmentType: 'mutual_fund',
        isin: 'INF179K01158',
        name: 'HDFC Top 100 Fund Direct Growth',
        transactionType: 'buy',
        quantity: 150,
        buyRate: 780.32,
        buyAmount: 117048,
        brokerBank: 'HDFC MF',
        bucketAllocation: 'bucket2'
      },
      {
        id: '6',
        date: '2024-01-30',
        investmentType: 'stock',
        name: 'HDFCBANK',
        transactionType: 'buy',
        quantity: 70,
        buyRate: 1550.00,
        buyAmount: 108500,
        brokerBank: 'Angel One',
        bucketAllocation: 'bucket1c'
      },
      {
        id: '7',
        date: '2024-03-15',
        investmentType: 'gold',
        name: 'Gold ETF',
        transactionType: 'buy',
        quantity: 20,
        buyRate: 5800.00,
        buyAmount: 116000,
        brokerBank: 'Zerodha',
        bucketAllocation: 'bucket1d'
      },
      {
        id: '8',
        date: '2024-02-15',
        investmentType: 'fixed_deposit',
        name: 'HDFC Bank FD',
        interestRate: 7.5,
        transactionType: 'buy',
        quantity: 1,
        buyRate: 200000,
        buyAmount: 200000,
        brokerBank: 'HDFC Bank',
        bucketAllocation: 'bucket1e'
      },
      {
        id: '9',
        date: '2024-03-20',
        investmentType: 'stock',
        name: 'ICICIBANK',
        transactionType: 'buy',
        quantity: 100,
        buyRate: 920.00,
        buyAmount: 92000,
        brokerBank: 'Groww',
        bucketAllocation: 'bucket3'
      },
      {
        id: '10',
        date: '2024-01-25',
        investmentType: 'mutual_fund',
        isin: 'INF109K01319',
        name: 'ICICI Prudential Bluechip Fund Direct Growth',
        transactionType: 'buy',
        quantity: 2000,
        buyRate: 58.76,
        buyAmount: 117520,
        brokerBank: 'ICICI MF',
        bucketAllocation: 'bucket2'
      },
      {
        id: '11',
        date: '2024-04-01',
        investmentType: 'stock',
        name: 'BHARTIARTL',
        transactionType: 'buy',
        quantity: 120,
        buyRate: 820.00,
        buyAmount: 98400,
        brokerBank: 'Paytm Money',
        bucketAllocation: 'bucket1a'
      },
      {
        id: '12',
        date: '2024-03-10',
        investmentType: 'etf',
        name: 'Nifty 50 ETF',
        transactionType: 'buy',
        quantity: 500,
        buyRate: 180.50,
        buyAmount: 90250,
        brokerBank: 'Zerodha',
        bucketAllocation: 'bucket3'
      }
    ];
    return testTrades;
  });
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    investmentType: '',
    buckets: '',
    transactionType: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [bucketTargets, setBucketTargets] = useState<{ [key: string]: number }>(() => {
    const savedTargets = loadFromLocalStorage(STORAGE_KEYS.BUCKET_TARGETS);
    return savedTargets || {
      'bucket1a': 500000,
      'bucket1b': 300000,
      'bucket1c': 200000,
      'bucket1d': 150000,
      'bucket1e': 100000,
      'bucket2': 400000,
      'bucket3': 250000
    };
  });
  const [bucketPurposes, setBucketPurposes] = useState<{ [key: string]: string }>(() => {
    const savedPurposes = loadFromLocalStorage(STORAGE_KEYS.BUCKET_TARGETS + '_purposes');
    return savedPurposes || {
      'bucket1a': '',
      'bucket1b': '',
      'bucket1c': '',
      'bucket1d': '',
      'bucket1e': '',
      'bucket2': 'Monthly income for financial freedom',
      'bucket3': 'Get rich with compounding power'
    };
  });
  const [priceCache, setPriceCache] = useState<{ [key: string]: { price: number; timestamp: number } }>(() => {
    const savedCache = loadFromLocalStorage(STORAGE_KEYS.PRICE_CACHE);
    return savedCache || {};
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Enhanced price fetching with caching
  const fetchRealTimePrice = async (symbol: string, type: string): Promise<number> => {
    const cacheKey = `${symbol}-${type}`;
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Check cache first
    if (priceCache[cacheKey] && (now - priceCache[cacheKey].timestamp) < CACHE_DURATION) {
      return priceCache[cacheKey].price;
    }
    
    try {
      // Try Stock Price Service for stocks first
      if (type === 'stock') {
        const stockService = getStockPriceService();
        try {
          const realPrice = await stockService.getCurrentPrice(symbol);
          if (realPrice !== null && realPrice > 0) {
            // Cache the real price
            setPriceCache(prev => {
              const updatedCache = {
                ...prev,
                [cacheKey]: { price: realPrice, timestamp: now }
              };
              saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
              return updatedCache;
            });
            return realPrice;
          }
        } catch (error) {
          console.warn(`Stock Price Service failed for ${symbol}, using mock data:`, error);
        }
      }
      
      // Try Mutual Fund API for mutual funds
      if (type === 'mutual_fund') {
        const mutualFundService = getMutualFundService();
        try {
          const realNAV = await mutualFundService.getNAV(symbol);
          if (realNAV !== null) {
            // Cache the real NAV
            setPriceCache(prev => {
              const updatedCache = {
                ...prev,
                [cacheKey]: { price: realNAV, timestamp: now }
              };
              saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
              return updatedCache;
            });
            return realNAV;
          }
        } catch (error) {
          console.warn(`Mutual Fund API failed for ${symbol}, using mock data:`, error);
        }
      }
      
      // Try Gold Price Service for gold
      if (type === 'gold') {
        const goldService = getGoldPriceService();
        try {
          const realGoldPrice = await goldService.getCurrentGoldPrice();
          if (realGoldPrice !== null && realGoldPrice > 0) {
            // Cache the real gold price
            setPriceCache(prev => {
              const updatedCache = {
                ...prev,
                [cacheKey]: { price: realGoldPrice, timestamp: now }
              };
              saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
              return updatedCache;
            });
            return realGoldPrice;
          }
        } catch (error) {
          console.warn(`Gold Price Service failed for ${symbol}, using mock data:`, error);
        }
      }
      
      // Enhanced mock data with realistic price movements
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      let price: number;
      
      if (type === 'stock') {
        // Mock stock prices - fallback when CSV service is unavailable
        const stockPrices: { [key: string]: number } = {
          'RELIANCE': 2450.50 + (Math.random() - 0.5) * 100,
          'TCS': 3650.75 + (Math.random() - 0.5) * 150,
          'INFY': 1750.25 + (Math.random() - 0.5) * 80,
          'HDFCBANK': 1580.00 + (Math.random() - 0.5) * 70,
          'ICICIBANK': 950.50 + (Math.random() - 0.5) * 40,
          'SBIN': 580.25 + (Math.random() - 0.5) * 30,
          'WIPRO': 425.75 + (Math.random() - 0.5) * 20,
          'BHARTIARTL': 850.00 + (Math.random() - 0.5) * 35,
          'ADANIPORTS': 720.30 + (Math.random() - 0.5) * 30,
          'ASIANPAINT': 3200.45 + (Math.random() - 0.5) * 120,
          'AXISBANK': 1050.80 + (Math.random() - 0.5) * 45,
          'BAJFINANCE': 6800.25 + (Math.random() - 0.5) * 200,
          'BAJAJFINSV': 1650.90 + (Math.random() - 0.5) * 60,
          'BPCL': 320.15 + (Math.random() - 0.5) * 15,
          'BRITANNIA': 4850.60 + (Math.random() - 0.5) * 180,
          'CIPLA': 1180.35 + (Math.random() - 0.5) * 50,
          'COALINDIA': 280.70 + (Math.random() - 0.5) * 12,
          'DIVISLAB': 3950.20 + (Math.random() - 0.5) * 150,
          'DRREDDY': 5200.85 + (Math.random() - 0.5) * 200,
          'EICHERMOT': 3400.40 + (Math.random() - 0.5) * 130,
          'GRASIM': 1850.75 + (Math.random() - 0.5) * 70,
          'HCLTECH': 1520.90 + (Math.random() - 0.5) * 60,
          'HEROMOTOCO': 2750.30 + (Math.random() - 0.5) * 100,
          'HINDALCO': 480.65 + (Math.random() - 0.5) * 20,
          'HINDUNILVR': 2650.80 + (Math.random() - 0.5) * 100,
          'HDFC': 2850.45 + (Math.random() - 0.5) * 110,
          'INDUSINDBK': 1320.25 + (Math.random() - 0.5) * 55,
          'IOC': 95.40 + (Math.random() - 0.5) * 4,
          'ITC': 420.85 + (Math.random() - 0.5) * 18,
          'JSWSTEEL': 780.60 + (Math.random() - 0.5) * 30,
          'KOTAKBANK': 1780.95 + (Math.random() - 0.5) * 70,
          'LT': 2950.30 + (Math.random() - 0.5) * 115,
          'M&M': 1450.75 + (Math.random() - 0.5) * 55,
          'MARUTI': 10200.40 + (Math.random() - 0.5) * 400,
          'NESTLEIND': 22500.85 + (Math.random() - 0.5) * 900,
          'NTPC': 185.20 + (Math.random() - 0.5) * 8,
          'ONGC': 180.65 + (Math.random() - 0.5) * 7,
          'POWERGRID': 220.90 + (Math.random() - 0.5) * 9,
          'SBILIFE': 1380.45 + (Math.random() - 0.5) * 55,
          'SHREECEM': 26800.70 + (Math.random() - 0.5) * 1000,
          'SUNPHARMA': 1050.35 + (Math.random() - 0.5) * 40,
          'TATACONSUM': 850.80 + (Math.random() - 0.5) * 35,
          'TATAMOTORS': 480.25 + (Math.random() - 0.5) * 20,
          'TATASTEEL': 120.90 + (Math.random() - 0.5) * 5,
          'TECHM': 1680.45 + (Math.random() - 0.5) * 65,
          'TITAN': 3200.70 + (Math.random() - 0.5) * 125,
          'ULTRACEMCO': 8950.35 + (Math.random() - 0.5) * 350,
          'UPL': 520.80 + (Math.random() - 0.5) * 20
        };
        price = stockPrices[symbol.toUpperCase()] || (Math.random() * 1000 + 100);
      } else if (type === 'mutual_fund') {
        // Mock mutual fund NAV prices
        price = Math.random() * 500 + 50;
      } else if (type === 'gold') {
        // Mock gold price per gram
        price = 5850.00 + (Math.random() - 0.5) * 200;
      } else if (type === 'silver') {
        // Mock silver price per gram
        price = 72.50 + (Math.random() - 0.5) * 5;
              } else if (type === 'etf' || type === 'nps') {
        // Mock ETF/NPS prices
        price = Math.random() * 200 + 50;
      } else {
        // Default for bonds, FDs, etc.
        price = Math.random() * 1000 + 100;
      }
      
      // Cache the price
      setPriceCache(prev => {
        const updatedCache = {
          ...prev,
          [cacheKey]: { price, timestamp: now }
        };
        saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
        return updatedCache;
      });
      
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Return cached price if available, otherwise a default
      return priceCache[cacheKey]?.price || 100;
    }
  };

  // Batch update prices for all holdings
  const updateAllPrices = async () => {
    setIsLoadingPrices(true);
    
    try {
      const stockService = getStockPriceService();
      const mutualFundService = getMutualFundService();
      
      const uniqueInvestments = new Map<string, string>();
      
      // Get unique investments from trades
      trades.forEach(trade => {
        if (trade.name.trim()) {
          uniqueInvestments.set(trade.name, trade.investmentType);
        }
      });
      
      // Use Stock Price Service for stocks
      const stockInvestments = Array.from(uniqueInvestments.entries())
        .filter(([name, type]) => type === 'stock');
      
      if (stockInvestments.length > 0) {
        try {
          const stockSymbols = stockInvestments.map(([symbol]) => symbol);
          const stockPrices = await stockService.getMultiplePrices(stockSymbols);
          
          // Update cache with real stock prices
          Object.entries(stockPrices).forEach(([symbol, price]) => {
            if (price !== null) {
              const cacheKey = `${symbol}-stock`;
              setPriceCache(prev => {
                const updatedCache = {
                  ...prev,
                  [cacheKey]: { price: price, timestamp: Date.now() }
                };
                saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
                return updatedCache;
              });
            }
          });
        } catch (error) {
          console.warn('Error fetching stock prices from CSV service, using mock data:', error);
        }
      }
      
      // Use Mutual Fund API for mutual funds
      const mutualFundInvestments = Array.from(uniqueInvestments.entries())
        .filter(([name, type]) => type === 'mutual_fund');
      
      if (mutualFundInvestments.length > 0) {
        try {
          // Fetch all NAVs at once
          await mutualFundService.getAllNAVs();
          
          // Update cache with real NAVs
          for (const [symbol, type] of mutualFundInvestments) {
            const nav = await mutualFundService.getNAV(symbol);
            if (nav !== null) {
              const cacheKey = `${symbol}-${type}`;
              setPriceCache(prev => {
                const updatedCache = {
                  ...prev,
                  [cacheKey]: { price: nav, timestamp: Date.now() }
                };
                saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, updatedCache);
                return updatedCache;
              });
            }
          }
        } catch (error) {
          console.warn('Error fetching mutual fund NAVs, using mock data:', error);
        }
      }
      
      // Fetch remaining prices using mock data
      const batchSize = 5;
      const investments = Array.from(uniqueInvestments.entries());
      
      for (let i = 0; i < investments.length; i += batchSize) {
        const batch = investments.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(([name, type]) => fetchRealTimePrice(name, type))
        );
        
        // Small delay between batches
        if (i + batchSize < investments.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Get current price from cache or fetch
  const getCurrentPrice = async (symbol: string, type: string): Promise<number> => {
    const cacheKey = `${symbol}-${type}`;
    const cached = priceCache[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
      return cached.price;
    }
    
    return await fetchRealTimePrice(symbol, type);
  };

  const addTrade = (trade: Omit<Trade, 'id' | 'buyAmount' | 'presentAmount' | 'profitPercent' | 'annualizedReturn'>) => {
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
      isin: trade.isin || '',
      buyAmount: trade.quantity * trade.buyRate
    };
    setTrades(prev => {
      const updatedTrades = [...prev, newTrade];
      saveToLocalStorage(STORAGE_KEYS.TRADES, updatedTrades);
      return updatedTrades;
    });
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades(prev => {
      const updatedTrades = prev.map(trade => {
        if (trade.id === id) {
          const updatedTrade = { ...trade, ...updates };
          updatedTrade.buyAmount = updatedTrade.quantity * updatedTrade.buyRate;
          return updatedTrade;
        }
        return trade;
      });
      saveToLocalStorage(STORAGE_KEYS.TRADES, updatedTrades);
      return updatedTrades;
    });
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => {
      const updatedTrades = prev.filter(trade => trade.id !== id);
      saveToLocalStorage(STORAGE_KEYS.TRADES, updatedTrades);
      return updatedTrades;
    });
  };

  const calculateAnnualizedReturn = (buyRate: number, presentRate: number, date: string): number => {
    const daysDiff = Math.abs(new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365;
    if (years === 0) return 0;
    return (Math.pow(presentRate / buyRate, 1 / years) - 1) * 100;
  };

  const updateRealTimePrices = async () => {
    const updatedTrades = await Promise.all(
      trades.map(async (trade) => {
        const presentRate = await fetchRealTimePrice(trade.name, trade.investmentType);
        const presentAmount = trade.quantity * presentRate;
        const profitPercent = ((presentRate - trade.buyRate) / trade.buyRate) * 100;
        const annualizedReturn = calculateAnnualizedReturn(trade.buyRate, presentRate, trade.date);
        
        return {
          ...trade,
          presentRate,
          presentAmount,
          profitPercent,
          annualizedReturn
        };
      })
    );
    setTrades(updatedTrades);
  };

  const applyFilters = () => {
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
        trade.date.includes(searchTerm) ||
        trade.quantity.toString().includes(searchTerm) ||
        trade.buyRate.toString().includes(searchTerm) ||
        trade.buyAmount.toString().includes(searchTerm)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(trade => new Date(trade.date) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(trade => new Date(trade.date) <= new Date(filters.dateTo));
    }
    
    setFilteredTrades(filtered);
  };

  const calculateXIRR = (trades: Trade[]): number => {
    if (trades.length === 0) return 0;
    
    // Create cash flows array
    const cashFlows: { date: Date; amount: number }[] = [];
    
    trades.forEach(trade => {
      // Investment (negative cash flow)
      cashFlows.push({
        date: new Date(trade.date),
        amount: -trade.buyAmount
      });
    });
    
    // Current value (positive cash flow) - use today's date
    const currentValue = trades.reduce((sum, trade) => sum + trade.presentAmount, 0);
    if (currentValue > 0) {
      cashFlows.push({
        date: new Date(),
        amount: currentValue
      });
    }
    
    if (cashFlows.length < 2) return 0;
    
    // Simple XIRR approximation using Newton-Raphson method
    let rate = 0.1; // Initial guess
    const maxIterations = 100;
    const tolerance = 1e-6;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;
      
      cashFlows.forEach(cf => {
        const daysDiff = (cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24);
        const years = daysDiff / 365;
        const factor = Math.pow(1 + rate, years);
        
        npv += cf.amount / factor;
        dnpv -= cf.amount * years / factor / (1 + rate);
      });
      
      if (Math.abs(npv) < tolerance) break;
      if (Math.abs(dnpv) < tolerance) break;
      
      rate = rate - npv / dnpv;
    }
    
    return rate * 100; // Convert to percentage
  };

  const calculateCurrentHoldings = (): Holding[] => {
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
      // Skip trades with empty names
      if (!trade.name || trade.name.trim() === '') {
        return;
      }
      
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
    const holdings: Holding[] = [];
    
    for (const [name, data] of holdingsMap) {
      // Sort transactions by date (FIFO)
      const sortedTransactions = data.transactions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let netQuantity = 0;
      let totalInvestedAmount = 0;
      let remainingBuys: Array<{ quantity: number; price: number; date: string }> = [];
      
      // Process transactions using FIFO
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
          
          // Sell from oldest buys first (FIFO)
          while (sellQuantity > 0 && remainingBuys.length > 0) {
            const oldestBuy = remainingBuys[0];
            
            if (oldestBuy.quantity <= sellQuantity) {
              // Sell entire oldest buy
              sellQuantity -= oldestBuy.quantity;
              totalInvestedAmount -= oldestBuy.quantity * oldestBuy.price;
              remainingBuys.shift();
            } else {
              // Partial sell of oldest buy
              oldestBuy.quantity -= sellQuantity;
              totalInvestedAmount -= sellQuantity * oldestBuy.price;
              sellQuantity = 0;
            }
          }
          
          netQuantity -= transaction.quantity;
        }
      });
      
      // Only include holdings with net quantity > 0
      if (netQuantity > 0 && totalInvestedAmount > 0) {
        const averageBuyPrice = totalInvestedAmount / netQuantity;
        
        // Get current price from cache
        const cacheKey = `${name}-${data.investmentType}`;
        const currentPrice = priceCache[cacheKey]?.price || averageBuyPrice; // Fallback to average buy price
        
        const currentValue = netQuantity * currentPrice;
        const gainLossAmount = currentValue - totalInvestedAmount;
        const gainLossPercent = totalInvestedAmount > 0 ? (gainLossAmount / totalInvestedAmount) * 100 : 0;
        
        // Calculate annual yield (simple approximation)
        const firstBuyDate = sortedTransactions.find(t => t.type === 'buy')?.date || new Date().toISOString();
        const daysDiff = Math.abs(new Date().getTime() - new Date(firstBuyDate).getTime()) / (1000 * 60 * 60 * 24);
        const years = Math.max(daysDiff / 365, 1/365); // Minimum 1 day
        const annualYield = (Math.pow(currentValue / totalInvestedAmount, 1 / years) - 1) * 100;
        
        // Calculate XIRR for this holding
        const cashFlows: { date: Date; amount: number }[] = [];
        
        // Add all buy transactions as negative cash flows
        remainingBuys.forEach(buy => {
          const existingFlow = cashFlows.find(cf => 
            cf.date.getTime() === new Date(buy.date).getTime()
          );
          if (existingFlow) {
            existingFlow.amount -= buy.quantity * buy.price;
          } else {
            cashFlows.push({
              date: new Date(buy.date),
              amount: -(buy.quantity * buy.price)
            });
          }
        });
        
        // Add current value as positive cash flow
        cashFlows.push({
          date: new Date(),
          amount: currentValue
        });
        
        // Simple XIRR calculation
        let xirr = 0;
        if (cashFlows.length >= 2) {
          const totalInvested = Math.abs(cashFlows.slice(0, -1).reduce((sum, cf) => sum + cf.amount, 0));
          const currentVal = cashFlows[cashFlows.length - 1].amount;
          const avgDate = new Date(cashFlows.slice(0, -1).reduce((sum, cf) => sum + cf.date.getTime(), 0) / (cashFlows.length - 1));
          const daysDiff = Math.abs(new Date().getTime() - avgDate.getTime()) / (1000 * 60 * 60 * 24);
          const years = Math.max(daysDiff / 365, 1/365);
          xirr = (Math.pow(currentVal / totalInvested, 1 / years) - 1) * 100;
        }
        
        holdings.push({
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
    
    return holdings.sort((a, b) => b.currentValue - a.currentValue);
  };

  const calculateBucketSummary = (): BucketSummary[] => {
    const bucketMap = new Map<string, {
      holdings: Holding[];
      targetAmount: number;
      purpose: string;
    }>();

    // Initialize all buckets
    Object.entries(bucketTargets).forEach(([bucketName, targetAmount]) => {
      bucketMap.set(bucketName, {
        holdings: [],
        targetAmount,
        purpose: bucketPurposes[bucketName] || ''
      });
    });

    // Group holdings by bucket
    const holdings = calculateCurrentHoldings();
    holdings.forEach(holding => {
      // Find trades for this holding to get bucket allocation
      const tradesForHolding = filteredTrades.filter(trade => trade.name === holding.name);
      if (tradesForHolding.length > 0) {
        const bucketAllocation = tradesForHolding[0].bucketAllocation;
        if (bucketAllocation && bucketMap.has(bucketAllocation)) {
          bucketMap.get(bucketAllocation)!.holdings.push({
            ...holding,
            bucketAllocation
          });
        }
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
      const shortfallAmount = Math.max(0, data.targetAmount - currentValue);
      
      // Calculate weighted average annual yield and XIRR
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
  };

  const updateBucketTarget = (bucketName: string, targetAmount: number) => {
    setBucketTargets(prev => {
      const updatedTargets = {
        ...prev,
        [bucketName]: targetAmount
      };
      saveToLocalStorage(STORAGE_KEYS.BUCKET_TARGETS, updatedTargets);
      return updatedTargets;
    });
  };

  const updateBucketPurpose = (bucketName: string, purpose: string) => {
    setBucketPurposes(prev => {
      const updatedPurposes = {
        ...prev,
        [bucketName]: purpose
      };
      saveToLocalStorage(STORAGE_KEYS.BUCKET_TARGETS + '_purposes', updatedPurposes);
      return updatedPurposes;
    });
  };
  const calculateSummary = (): Summary => {
    const totalInvestment = filteredTrades.reduce((sum, trade) => sum + trade.buyAmount, 0);
    const currentValue = filteredTrades.reduce((sum, trade) => sum + trade.presentAmount, 0);
    const totalProfit = currentValue - totalInvestment;
    const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    
    const assetAllocation: { [key: string]: number } = {};
    filteredTrades.forEach(trade => {
      assetAllocation[trade.investmentType] = (assetAllocation[trade.investmentType] || 0) + trade.presentAmount;
    });
    
    const sortedTrades = [...filteredTrades].sort((a, b) => b.profitPercent - a.profitPercent);
    const topPerformers = sortedTrades.slice(0, 5);
    const bottomPerformers = sortedTrades.slice(-5).reverse();
    
    const totalAnnualizedReturn = filteredTrades.length > 0 
      ? filteredTrades.reduce((sum, trade) => sum + trade.annualizedReturn, 0) / filteredTrades.length 
      : 0;
    
    const xirr = calculateXIRR(filteredTrades);
    
    return {
      totalInvestment,
      currentValue,
      totalProfit,
      totalProfitPercent,
      totalAnnualizedReturn,
      xirr,
      assetAllocation,
      topPerformers,
      bottomPerformers
    };
  };

  useEffect(() => {
    applyFilters();
  }, [trades, filters]);

  // Save trades to localStorage whenever trades change
  useEffect(() => {
    if (trades.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.TRADES, trades);
    }
  }, [trades]);

  // Save bucket targets to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.BUCKET_TARGETS, bucketTargets);
  }, [bucketTargets]);

  // Save bucket purposes to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.BUCKET_TARGETS + '_purposes', bucketPurposes);
  }, [bucketPurposes]);
  // Clean up old price cache entries (older than 1 hour)
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      setPriceCache(prev => {
        const cleaned = Object.fromEntries(
          Object.entries(prev).filter(([_, data]) => 
            (now - data.timestamp) < oneHour
          )
        );
        saveToLocalStorage(STORAGE_KEYS.PRICE_CACHE, cleaned);
        return cleaned;
      });
    };

    // Clean up cache every 30 minutes
    const interval = setInterval(cleanupCache, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return {
    trades,
    filteredTrades,
    filters,
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateRealTimePrices,
    updateAllPrices,
    isLoadingPrices,
    calculateSummary,
    calculateCurrentHoldings,
    calculateBucketSummary,
    updateBucketTarget,
    updateBucketPurpose
  };
};