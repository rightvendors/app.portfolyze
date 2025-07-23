// Upstox API service for real-time stock prices
export interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export interface UpstoxQuote {
  instrument_key: string;
  timestamp: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_trade_time: string;
  oi_day_high: number;
  oi_day_low: number;
}

export interface UpstoxInstrument {
  instrument_key: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  segment: string;
  exchange: string;
}

class UpstoxApiService {
  private config: UpstoxConfig | null = null;
  private accessToken: string | null = null;
  private instrumentsCache: Map<string, UpstoxInstrument> = new Map();
  private quotesCache: Map<string, { quote: UpstoxQuote; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly API_BASE_URL = 'http://localhost:3001/api/upstox';

  constructor(config?: UpstoxConfig) {
    this.config = config || null;

    this.loadTokenFromStorage();
    
    const envToken = import.meta.env.VITE_UPSTOX_ACCESS_TOKEN;
    if (!this.accessToken && envToken) {
      console.log('Using token from env');
      this.accessToken = envToken;
      this.saveTokenToStorage(envToken);
    }

    if (!this.accessToken) {
      throw new Error('UpstoxApiService: Access token is missing. Provide it via .env or localStorage.');
    }
  }

  // Load access token from localStorage
  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('upstox_access_token');
    if (token) {
      this.accessToken = token;
    }
  }

  // Save access token to localStorage
  private saveTokenToStorage(token: string): void {
    this.accessToken = token;
    localStorage.setItem('upstox_access_token', token);
  }

  // Generate authorization URL
  getAuthUrl(): string {
    if (!this.config) {
      return '';
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.apiKey,
      redirect_uri: this.config.redirectUri,
      state: 'portfolio_app'
    });
    
    return `${this.config.baseUrl}/login/authorization/dialog?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(authCode: string): Promise<string> {
    if (!this.config) {
      throw new Error('Upstox config not initialized');
    }
    
    try {
      const response = await fetch(`${this.config.baseUrl}/login/authorization/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          code: authCode,
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.saveTokenToStorage(data.access_token);
        return data.access_token;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get user profile (to verify authentication)
  async getUserProfile(): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch failed:', error);
      throw error;
    }
  }

  // Search for instruments by symbol
  async searchInstruments(query: string): Promise<UpstoxInstrument[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/search/${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.success && result.data?.data) {
        // Cache instruments for future use
        result.data.data.forEach((instrument: UpstoxInstrument) => {
          this.instrumentsCache.set(instrument.tradingsymbol, instrument);
        });
        return result.data.data;
      } else {
        throw new Error(result.error || 'Failed to search instruments');
      }
    } catch (error) {
      console.error('Error searching instruments:', error);
      throw error;
    }
  }

  // Get instrument key for a symbol
  async getInstrumentKey(symbol: string): Promise<string | null> {
    // Check cache first
    const cached = this.instrumentsCache.get(symbol.toUpperCase());
    if (cached) {
      return cached.instrument_key;
    }

    // Search for the instrument
    try {
      const instruments = await this.searchInstruments(symbol);
      const exactMatch = instruments.find(
        inst => inst.tradingsymbol.toUpperCase() === symbol.toUpperCase() && 
                inst.segment === 'NSE_EQ'
      );
      
      if (exactMatch) {
        return exactMatch.instrument_key;
      }
      
      // If no exact match, try the first result
      return instruments.length > 0 ? instruments[0].instrument_key : null;
    } catch (error) {
      console.error(`Error getting instrument key for ${symbol}:`, error);
      return null;
    }
  }

  // Get real-time quote for a single instrument
  async getLTP(instrumentKey: string): Promise<number | null> {
    // Check cache first
    const cached = this.quotesCache.get(instrumentKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.quote.last_price;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/ltp/${encodeURIComponent(instrumentKey)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.success && result.data?.data?.[instrumentKey]) {
        const quoteData = result.data.data[instrumentKey];
        const quote: UpstoxQuote = {
          instrument_key: instrumentKey,
          last_price: quoteData.last_price,
          ...quoteData
        };
        
        // Cache the quote
        this.quotesCache.set(instrumentKey, {
          quote,
          timestamp: Date.now()
        });
        
        return quote.last_price;
      } else {
        throw new Error(result.error || 'No quote data available');
      }
    } catch (error) {
      console.error(`Error getting LTP for ${instrumentKey}:`, error);
      return null;
    }
  }

  // Get multiple quotes at once
  async getMultipleLTPs(instrumentKeys: string[]): Promise<{ [key: string]: number }> {
    const prices: { [key: string]: number } = {};
    const keysToFetch: string[] = [];

    // Check cache for each instrument
    instrumentKeys.forEach(key => {
      const cached = this.quotesCache.get(key);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        prices[key] = cached.quote.last_price;
      } else {
        keysToFetch.push(key);
      }
    });

    // Fetch uncached prices
    if (keysToFetch.length > 0) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/ltp/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({ instrumentKeys: keysToFetch })
        });
        
        const result = await response.json();
        
        if (result.success && result.data?.data) {
          Object.entries(result.data.data).forEach(([key, quoteData]: [string, any]) => {
            const quote: UpstoxQuote = {
              instrument_key: key,
              last_price: quoteData.last_price,
              ...quoteData
            };
            
            prices[key] = quote.last_price;
            
            // Cache the quote
            this.quotesCache.set(key, {
              quote,
              timestamp: Date.now()
            });
          });
        }
      } catch (error) {
        console.error('Error getting multiple LTPs:', error);
      }
    }

    return prices;
  }

  // Legacy method for backward compatibility
  async getQuote(instrumentKey: string): Promise<UpstoxQuote | null> {
    const price = await this.getLTP(instrumentKey);
    if (price !== null) {
      return {
        instrument_key: instrumentKey,
        last_price: price,
        timestamp: new Date().toISOString(),
        volume: 0,
        average_price: price,
        oi: 0,
        net_change: 0,
        total_buy_quantity: 0,
        total_sell_quantity: 0,
        lower_circuit_limit: 0,
        upper_circuit_limit: 0,
        last_trade_time: new Date().toISOString(),
        oi_day_high: 0,
        oi_day_low: 0
      };
    }
    return null;
  }

  // Legacy method for backward compatibility
  async getMultipleQuotes(instrumentKeys: string[]): Promise<{ [key: string]: UpstoxQuote }> {
    const quotes: { [key: string]: UpstoxQuote } = {};
    const keysToFetch: string[] = [];
    const batchSize = 50; // Process in batches to avoid rate limits

    // Check cache for each instrument
    instrumentKeys.forEach(key => {
      const cached = this.quotesCache.get(key);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        quotes[key] = cached.quote;
      } else {
        keysToFetch.push(key);
      }
    });

    // Fetch uncached quotes in batches
    if (keysToFetch.length > 0) {
      try {
        for (let i = 0; i < keysToFetch.length; i += batchSize) {
          const batch = keysToFetch.slice(i, i + batchSize);
          const response = await fetch(`${this.API_BASE_URL}/ltp/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({ instrumentKeys: batch })
          });
          
          const result = await response.json();
          
          if (result.success && result.data?.data) {
            Object.entries(result.data.data).forEach(([key, quoteData]: [string, any]) => {
              const quote: UpstoxQuote = {
                instrument_key: key,
                last_price: quoteData.last_price,
                timestamp: new Date().toISOString(),
                volume: quoteData.volume || 0,
                average_price: quoteData.average_price || quoteData.last_price,
                oi: quoteData.oi || 0,
                net_change: quoteData.net_change || 0,
                total_buy_quantity: quoteData.total_buy_quantity || 0,
                total_sell_quantity: quoteData.total_sell_quantity || 0,
                lower_circuit_limit: quoteData.lower_circuit_limit || 0,
                upper_circuit_limit: quoteData.upper_circuit_limit || 0,
                last_trade_time: quoteData.last_trade_time || new Date().toISOString(),
                oi_day_high: quoteData.oi_day_high || 0,
                oi_day_low: quoteData.oi_day_low || 0
              };
              
              quotes[key] = quote;
              
              // Cache the quote
              this.quotesCache.set(key, {
                quote,
                timestamp: Date.now()
              });
            });
          }
          
          // Small delay between batches to respect rate limits
          if (i + batchSize < keysToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error('Error getting multiple quotes:', error);
      }
    }

    return quotes;
  }

  // Get current price for a stock symbol
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const instrumentKey = await this.getInstrumentKey(symbol);
      if (!instrumentKey) {
        console.warn(`No instrument key found for symbol: ${symbol}`);
        return null;
      }

      const quote = await this.getQuote(instrumentKey);
      return quote ? quote.last_price : null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  // Logout and clear tokens
  logout(): void {
    this.accessToken = null;
    localStorage.removeItem('upstox_access_token');
    this.quotesCache.clear();
    this.instrumentsCache.clear();
  }
}

// Create singleton instance
let upstoxService: UpstoxApiService | null = null;

export const createUpstoxService = (config?: UpstoxConfig): UpstoxApiService => {
  if (!upstoxService) {
    upstoxService = new UpstoxApiService(config);
  }
  return upstoxService;
};

export const getUpstoxService = (): UpstoxApiService => {
  if (!upstoxService) {
    upstoxService = new UpstoxApiService();
  }
  return upstoxService;
};

export default UpstoxApiService;