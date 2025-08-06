import { getStockPriceService } from './stockPriceService';
import { getMutualFundService } from './mutualFundApi';
import { getGoldSilverPriceService } from './goldPriceService';
import { firestoreService } from './firestoreService';

export interface CachedData {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'mutual_fund' | 'gold' | 'silver';
  price: number;
  lastUpdated: number;
  source: string;
}

export interface CacheMetadata {
  lastFetch: number;
  nextFetch: number;
  dataType: 'stocks' | 'mutual_funds' | 'commodities';
  status: 'fresh' | 'stale' | 'fetching';
}

class BackgroundDataService {
  private stockService = getStockPriceService();
  private mutualFundService = getMutualFundService();
  private goldSilverService = getGoldSilverPriceService();
  
  // Cache storage
  private stockCache: CachedData[] = [];
  private mutualFundCache: CachedData[] = [];
  private commodityCache: CachedData[] = [];
  
  // Cache metadata
  private cacheMetadata: { [key: string]: CacheMetadata } = {};
  
  // NSE trading hours (IST)
  private readonly NSE_OPEN_HOUR = 9;
  private readonly NSE_OPEN_MINUTE = 15;
  private readonly NSE_CLOSE_HOUR = 15;
  private readonly NSE_CLOSE_MINUTE = 30;
  
  constructor() {
    this.initializeCache();
    this.setupBackgroundSync();
  }
  
  private async initializeCache() {
    try {
      // Load cached data from Firebase
      await this.loadCachedData();
      
      // Check if we need to fetch fresh data
      await this.checkAndUpdateCache();
    } catch (error) {
      console.error('Error initializing cache:', error);
    }
  }
  
  private setupBackgroundSync() {
    // Set up periodic cache updates
    setInterval(() => {
      this.checkAndUpdateCache();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Set up daily refresh for mutual funds
    setInterval(() => {
      this.refreshMutualFundData();
    }, 24 * 60 * 60 * 1000); // Daily
  }
  
  private isNSETradingHours(): boolean {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
    
    const day = istTime.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    
    const currentTime = hour * 60 + minute;
    const openTime = this.NSE_OPEN_HOUR * 60 + this.NSE_OPEN_MINUTE;
    const closeTime = this.NSE_CLOSE_HOUR * 60 + this.NSE_CLOSE_MINUTE;
    
    return currentTime >= openTime && currentTime <= closeTime;
  }
  
  private shouldFetchStocks(): boolean {
    const metadata = this.cacheMetadata['stocks'];
    if (!metadata) return true;
    
    const now = Date.now();
    
    // If it's NSE trading hours, check if data is fresh (within 5 minutes)
    if (this.isNSETradingHours()) {
      return now - metadata.lastFetch > 5 * 60 * 1000; // 5 minutes
    }
    
    // Outside trading hours, check if we have today's data
    const lastFetchDate = new Date(metadata.lastFetch);
    const today = new Date();
    return lastFetchDate.getDate() !== today.getDate() ||
           lastFetchDate.getMonth() !== today.getMonth() ||
           lastFetchDate.getFullYear() !== today.getFullYear();
  }
  
  private shouldFetchMutualFunds(): boolean {
    const metadata = this.cacheMetadata['mutual_funds'];
    if (!metadata) return true;
    
    const now = Date.now();
    const lastFetchDate = new Date(metadata.lastFetch);
    const today = new Date();
    
    // Fetch once per day on weekdays
    return lastFetchDate.getDate() !== today.getDate() ||
           lastFetchDate.getMonth() !== today.getMonth() ||
           lastFetchDate.getFullYear() !== today.getFullYear();
  }
  
  private shouldFetchCommodities(): boolean {
    const metadata = this.cacheMetadata['commodities'];
    if (!metadata) return true;
    
    const now = Date.now();
    const lastFetchDate = new Date(metadata.lastFetch);
    const today = new Date();
    
    // Fetch once per day
    return lastFetchDate.getDate() !== today.getDate() ||
           lastFetchDate.getMonth() !== today.getMonth() ||
           lastFetchDate.getFullYear() !== today.getFullYear();
  }
  
  private async checkAndUpdateCache() {
    try {
      // Update stocks if needed
      if (this.shouldFetchStocks()) {
        await this.updateStockCache();
      }
      
      // Update mutual funds if needed
      if (this.shouldFetchMutualFunds()) {
        await this.updateMutualFundCache();
      }
      
      // Update commodities if needed
      if (this.shouldFetchCommodities()) {
        await this.updateCommodityCache();
      }
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }
  
  private async updateStockCache() {
    try {
      this.cacheMetadata['stocks'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (5 * 60 * 1000), // 5 minutes
        dataType: 'stocks',
        status: 'fetching'
      };
      
      // Get popular stocks (you can expand this list)
      const popularStocks = [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK'
      ];
      
      const stockData: CachedData[] = [];
      
      for (const symbol of popularStocks) {
        try {
          const price = await this.stockService.getCurrentPrice(symbol);
          if (price) {
            stockData.push({
              id: `stock-${symbol}`,
              name: symbol, // You might want to store actual company names
              symbol: symbol,
              type: 'stock',
              price: price,
              lastUpdated: Date.now(),
              source: 'NSE'
            });
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
        }
      }
      
      this.stockCache = stockData;
      
      // Update metadata
      this.cacheMetadata['stocks'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (5 * 60 * 1000),
        dataType: 'stocks',
        status: 'fresh'
      };
      
      // Save to Firebase
      await this.saveCachedData('stocks', stockData);
      
    } catch (error) {
      console.error('Error updating stock cache:', error);
      this.cacheMetadata['stocks'].status = 'stale';
    }
  }
  
  private async updateMutualFundCache() {
    try {
      this.cacheMetadata['mutual_funds'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        dataType: 'mutual_funds',
        status: 'fetching'
      };
      
      // Get popular mutual funds
      const popularFunds = [
        'INF179K01WM1', // HDFC Nifty 50 Index Fund
        'INF179K01VK7', // HDFC Focused Fund
        'INF179K01VK8', // HDFC Mid-Cap Opportunities Fund
        'INF179K01VK9', // HDFC Small Cap Fund
        'INF179K01VL0'  // HDFC Balanced Advantage Fund
      ];
      
      const fundData: CachedData[] = [];
      
      for (const isin of popularFunds) {
        try {
          const navData = await this.mutualFundService.searchByISIN(isin);
          if (navData) {
            fundData.push({
              id: `mf-${isin}`,
              name: navData.name || `Fund ${isin}`,
              symbol: isin,
              type: 'mutual_fund',
              price: navData.nav,
              lastUpdated: Date.now(),
              source: 'AMFI'
            });
          }
        } catch (error) {
          console.error(`Error fetching NAV for ${isin}:`, error);
        }
      }
      
      this.mutualFundCache = fundData;
      
      // Update metadata
      this.cacheMetadata['mutual_funds'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (24 * 60 * 60 * 1000),
        dataType: 'mutual_funds',
        status: 'fresh'
      };
      
      // Save to Firebase
      await this.saveCachedData('mutual_funds', fundData);
      
    } catch (error) {
      console.error('Error updating mutual fund cache:', error);
      this.cacheMetadata['mutual_funds'].status = 'stale';
    }
  }
  
  private async updateCommodityCache() {
    try {
      this.cacheMetadata['commodities'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        dataType: 'commodities',
        status: 'fetching'
      };
      
      const commodityData: CachedData[] = [];
      
      // Fetch gold price
      try {
        const goldPrice = await this.goldSilverService.getCurrentGoldPrice();
        if (goldPrice) {
          commodityData.push({
            id: 'commodity-gold',
            name: '24 Carat Gold',
            symbol: 'GOLD',
            type: 'gold',
            price: goldPrice,
            lastUpdated: Date.now(),
            source: 'MCX'
          });
        }
      } catch (error) {
        console.error('Error fetching gold price:', error);
      }
      
      // Fetch silver price
      try {
        const silverPrice = await this.goldSilverService.getCurrentSilverPrice();
        if (silverPrice) {
          commodityData.push({
            id: 'commodity-silver',
            name: 'Silver',
            symbol: 'SILVER',
            type: 'silver',
            price: silverPrice,
            lastUpdated: Date.now(),
            source: 'MCX'
          });
        }
      } catch (error) {
        console.error('Error fetching silver price:', error);
      }
      
      this.commodityCache = commodityData;
      
      // Update metadata
      this.cacheMetadata['commodities'] = {
        lastFetch: Date.now(),
        nextFetch: Date.now() + (24 * 60 * 60 * 1000),
        dataType: 'commodities',
        status: 'fresh'
      };
      
      // Save to Firebase
      await this.saveCachedData('commodities', commodityData);
      
    } catch (error) {
      console.error('Error updating commodity cache:', error);
      this.cacheMetadata['commodities'].status = 'stale';
    }
  }
  
  private async loadCachedData() {
    try {
      // Load from Firebase
      const cachedData = await firestoreService.getCachedData();
      
      if (cachedData.stocks) {
        this.stockCache = cachedData.stocks;
      }
      
      if (cachedData.mutualFunds) {
        this.mutualFundCache = cachedData.mutualFunds;
      }
      
      if (cachedData.commodities) {
        this.commodityCache = cachedData.commodities;
      }
      
      if (cachedData.metadata) {
        this.cacheMetadata = cachedData.metadata;
      }
      
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }
  
  private async saveCachedData(type: string, data: CachedData[]) {
    try {
      await firestoreService.saveCachedData(type, data, this.cacheMetadata);
    } catch (error) {
      console.error(`Error saving ${type} cache:`, error);
    }
  }
  
  // Public methods for search
  public async searchStocks(query: string): Promise<CachedData[]> {
    const searchTerm = query.toLowerCase();
    return this.stockCache.filter(stock => 
      stock.name.toLowerCase().includes(searchTerm) ||
      stock.symbol.toLowerCase().includes(searchTerm)
    );
  }
  
  public async searchMutualFunds(query: string): Promise<CachedData[]> {
    const searchTerm = query.toLowerCase();
    return this.mutualFundCache.filter(fund => 
      fund.name.toLowerCase().includes(searchTerm) ||
      fund.symbol.toLowerCase().includes(searchTerm)
    );
  }
  
  public async searchCommodities(query: string): Promise<CachedData[]> {
    const searchTerm = query.toLowerCase();
    return this.commodityCache.filter(commodity => 
      commodity.name.toLowerCase().includes(searchTerm) ||
      commodity.symbol.toLowerCase().includes(searchTerm)
    );
  }
  
  public async getAllCachedData(): Promise<{
    stocks: CachedData[];
    mutualFunds: CachedData[];
    commodities: CachedData[];
  }> {
    return {
      stocks: this.stockCache,
      mutualFunds: this.mutualFundCache,
      commodities: this.commodityCache
    };
  }
  
  public getCacheStatus(): { [key: string]: CacheMetadata } {
    return this.cacheMetadata;
  }
  
  public async refreshMutualFundData() {
    await this.updateMutualFundCache();
  }
  
  public async forceRefreshAll() {
    await this.updateStockCache();
    await this.updateMutualFundCache();
    await this.updateCommodityCache();
  }
}

// Singleton instance
export const backgroundDataService = new BackgroundDataService(); 