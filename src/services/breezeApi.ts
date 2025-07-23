import BreezeConnect from 'breezeconnect';

// Breeze API service for real-time stock prices
export interface BreezeConfig {
  apiKey: string;
  apiSecret: string;
  sessionToken?: string;
}

export interface BreezeQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface BreezeInstrument {
  exchange_code: string;
  product_type: string;
  stock_code: string;
  right: string;
  strike_price: string;
  expiry_date: string;
  action: string;
  quantity: string;
  price: string;
  order_type: string;
  validity: string;
  disclosed_quantity: string;
  stop_loss: string;
  order_type_fresh: string;
  order_rate_fresh: string;
}

class BreezeApiService {
  private breeze: any;
  private config: BreezeConfig | null = null;
  private isConnected: boolean = false;
  private quotesCache: Map<string, { quote: BreezeQuote; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config?: BreezeConfig) {
    this.config = config || this.loadConfigFromEnv();
    
    if (this.config?.apiKey && this.config?.apiSecret) {
      this.initializeBreezeConnection();
    } else {
      console.warn('Breeze API: Configuration missing. Please provide API key and secret.');
    }
  }

  // Load configuration from environment variables
  private loadConfigFromEnv(): BreezeConfig | null {
    const apiKey = import.meta.env.VITE_BREEZE_API_KEY;
    const apiSecret = import.meta.env.VITE_BREEZE_API_SECRET;
    const sessionToken = import.meta.env.VITE_BREEZE_SESSION_TOKEN;

    if (apiKey && apiSecret) {
      return {
        apiKey,
        apiSecret,
        sessionToken
      };
    }

    return null;
  }

  // Initialize Breeze connection
  private async initializeBreezeConnection(): Promise<void> {
    if (!this.config) {
      throw new Error('Breeze configuration not available');
    }

    try {
      this.breeze = new BreezeConnect({
        appKey: this.config.apiKey
      });

      // If we have a session token, try to use it
      if (this.config.sessionToken) {
        this.breeze.setSessionToken(this.config.sessionToken);
        this.isConnected = true;
        console.log('Breeze API: Connected with existing session token');
      } else {
        console.log('Breeze API: Initialized, but session token required for trading operations');
      }
    } catch (error) {
      console.error('Error initializing Breeze connection:', error);
      throw error;
    }
  }

  // Generate session URL for authentication
  getSessionUrl(): string {
    if (!this.config) {
      throw new Error('Breeze configuration not available');
    }

    // This would typically redirect to ICICI Direct login
    return `https://api.icicidirect.com/breezeapi/api/v1/customerlogin?api_key=${this.config.apiKey}`;
  }

  // Set session token after authentication
  setSessionToken(sessionToken: string): void {
    if (this.config) {
      this.config.sessionToken = sessionToken;
      
      if (this.breeze) {
        this.breeze.setSessionToken(sessionToken);
        this.isConnected = true;
        
        // Save to localStorage for persistence
        localStorage.setItem('breeze_session_token', sessionToken);
        console.log('Breeze API: Session token set successfully');
      }
    }
  }

  // Check if connected
  isAuthenticated(): boolean {
    return this.isConnected && !!this.config?.sessionToken;
  }

  // Get quote for a single stock
  async getQuote(stockCode: string, exchange: string = 'NSE'): Promise<BreezeQuote | null> {
    if (!this.isAuthenticated()) {
      console.warn('Breeze API: Not authenticated. Using mock data.');
      return this.getMockQuote(stockCode);
    }

    // Check cache first
    const cacheKey = `${exchange}:${stockCode}`;
    const cached = this.quotesCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.quote;
    }

    try {
      const response = await this.breeze.getQuotes({
        stock_code: stockCode,
        exchange_code: exchange,
        expiry_date: '',
        product_type: 'cash',
        right: 'others',
        strike_price: '0'
      });

      if (response && response.Success) {
        const data = response.Success[0];
        const quote: BreezeQuote = {
          symbol: stockCode,
          ltp: parseFloat(data.ltp || '0'),
          open: parseFloat(data.open || '0'),
          high: parseFloat(data.high || '0'),
          low: parseFloat(data.low || '0'),
          close: parseFloat(data.close || '0'),
          volume: parseInt(data.volume || '0'),
          change: parseFloat(data.change || '0'),
          changePercent: parseFloat(data.change_percentage || '0'),
          timestamp: new Date().toISOString()
        };

        // Cache the quote
        this.quotesCache.set(cacheKey, {
          quote,
          timestamp: Date.now()
        });

        return quote;
      } else {
        console.warn(`Breeze API: No data for ${stockCode}`);
        return this.getMockQuote(stockCode);
      }
    } catch (error) {
      console.error(`Error fetching quote for ${stockCode}:`, error);
      return this.getMockQuote(stockCode);
    }
  }

  // Get multiple quotes
  async getMultipleQuotes(stocks: Array<{ code: string; exchange?: string }>): Promise<{ [key: string]: BreezeQuote }> {
    const quotes: { [key: string]: BreezeQuote } = {};
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (stock) => {
        const quote = await this.getQuote(stock.code, stock.exchange || 'NSE');
        if (quote) {
          quotes[stock.code] = quote;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return quotes;
  }

  // Get current price for a stock symbol
  async getCurrentPrice(symbol: string, exchange: string = 'NSE'): Promise<number | null> {
    try {
      const quote = await this.getQuote(symbol, exchange);
      return quote ? quote.ltp : null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  // Mock quote data for testing/fallback
  private getMockQuote(stockCode: string): BreezeQuote {
    const mockPrices: { [key: string]: number } = {
      'RELIANCE': 2450.50,
      'TCS': 3650.75,
      'INFY': 1750.25,
      'HDFCBANK': 1580.00,
      'ICICIBANK': 950.50,
      'SBIN': 580.25,
      'WIPRO': 425.75,
      'BHARTIARTL': 850.00,
      'ADANIPORTS': 720.30,
      'ASIANPAINT': 3200.45,
      'AXISBANK': 1050.80,
      'BAJFINANCE': 6800.25,
      'BAJAJFINSV': 1650.90,
      'BPCL': 320.15,
      'BRITANNIA': 4850.60,
      'CIPLA': 1180.35,
      'COALINDIA': 280.70,
      'DIVISLAB': 3950.20,
      'DRREDDY': 5200.85,
      'EICHERMOT': 3400.40
    };

    const basePrice = mockPrices[stockCode.toUpperCase()] || (Math.random() * 1000 + 100);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const ltp = basePrice * (1 + variation);
    const change = ltp - basePrice;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: stockCode,
      ltp: parseFloat(ltp.toFixed(2)),
      open: parseFloat((basePrice * 0.98).toFixed(2)),
      high: parseFloat((ltp * 1.02).toFixed(2)),
      low: parseFloat((ltp * 0.98).toFixed(2)),
      close: basePrice,
      volume: Math.floor(Math.random() * 1000000),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  // Search for instruments (if supported by Breeze API)
  async searchInstruments(query: string): Promise<any[]> {
    // Note: This would depend on Breeze API's search functionality
    // For now, return empty array as this might not be directly supported
    console.log(`Searching for instruments: ${query}`);
    return [];
  }

  // Logout and clear session
  logout(): void {
    this.isConnected = false;
    if (this.config) {
      this.config.sessionToken = undefined;
    }
    localStorage.removeItem('breeze_session_token');
    this.quotesCache.clear();
    console.log('Breeze API: Logged out successfully');
  }

  // Get connection status
  getConnectionStatus(): { connected: boolean; hasConfig: boolean; hasSession: boolean } {
    return {
      connected: this.isConnected,
      hasConfig: !!this.config,
      hasSession: !!this.config?.sessionToken
    };
  }
}

// Create singleton instance
let breezeService: BreezeApiService | null = null;

export const createBreezeService = (config?: BreezeConfig): BreezeApiService => {
  if (!breezeService) {
    breezeService = new BreezeApiService(config);
  }
  return breezeService;
};

export const getBreezeService = (): BreezeApiService => {
  if (!breezeService) {
    breezeService = new BreezeApiService();
  }
  return breezeService;
};

export default BreezeApiService;