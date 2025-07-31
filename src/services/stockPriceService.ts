export interface StockData {
  symbol: string;
  name: string;
  series: string;
  price: number;
}

export interface StockSuggestion {
  symbol: string;
  name: string;
  displayText: string;
}

class StockPriceService {
  private stockDataCache: StockData[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGzu4i2XYwhr2zclwNxBpGxSVLBgjjJiDIhi5kbVc-y1856SY7gY4kkFQ4zHXcXKzKac8mHN3GZQIb/pub?gid=0&single=true&output=csv';

  // Fetch stock data from CSV
  async fetchStockData(): Promise<StockData[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.stockDataCache.length > 0 && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.stockDataCache;
    }

    try {
      const response = await fetch(this.CSV_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
      }

      const csvText = await response.text();
      const stockData = this.parseCSV(csvText);
      
      this.stockDataCache = stockData;
      this.lastFetchTime = now;
      
      console.log(`StockPriceService: Fetched ${stockData.length} stocks from CSV`);
      return stockData;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      
      // Return cached data if available, even if expired
      if (this.stockDataCache.length > 0) {
        console.warn('Using cached stock data due to fetch error');
        return this.stockDataCache;
      }
      
      throw error;
    }
  }

  // Parse CSV data
  private parseCSV(csvText: string): StockData[] {
    const lines = csvText.trim().split('\n');
    const stockData: StockData[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const columns = this.parseCSVLine(line);
      
      if (columns.length >= 4) {
        const [symbol, name, series, priceStr] = columns;
        const price = parseFloat(priceStr);
        
        if (!isNaN(price) && symbol && name) {
          stockData.push({
            symbol: symbol.trim(),
            name: name.trim(),
            series: series.trim(),
            price: price
          });
        }
      }
    }

    return stockData;
  }

  // Parse CSV line handling quoted values
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Get stock suggestions based on partial name/symbol
  async getStockSuggestions(query: string, limit: number = 10): Promise<StockSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const stockData = await this.fetchStockData();
    const queryLower = query.toLowerCase();
    
    const suggestions = stockData
      .filter(stock => 
        stock.symbol.toLowerCase().includes(queryLower) ||
        stock.name.toLowerCase().includes(queryLower)
      )
      .slice(0, limit)
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        displayText: `${stock.symbol} - ${stock.name}`
      }));

    return suggestions;
  }

  // Get current price for a stock symbol
  async getCurrentPrice(symbol: string): Promise<number | null> {
    const stockData = await this.fetchStockData();
    const stock = stockData.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    return stock ? stock.price : null;
  }

  // Get multiple stock prices
  async getMultiplePrices(symbols: string[]): Promise<{ [key: string]: number }> {
    const stockData = await this.fetchStockData();
    const prices: { [key: string]: number } = {};

    symbols.forEach(symbol => {
      const stock = stockData.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
      if (stock) {
        prices[symbol] = stock.price;
      }
    });

    return prices;
  }

  // Search stock by name or symbol
  async searchStock(query: string): Promise<StockData | null> {
    const stockData = await this.fetchStockData();
    const queryLower = query.toLowerCase();
    
    return stockData.find(stock => 
      stock.symbol.toLowerCase() === queryLower ||
      stock.name.toLowerCase().includes(queryLower)
    ) || null;
  }

  // Clear cache
  clearCache(): void {
    this.stockDataCache = [];
    this.lastFetchTime = 0;
  }

  // Get cache status
  getCacheStatus(): { hasData: boolean; lastFetch: number; dataCount: number } {
    return {
      hasData: this.stockDataCache.length > 0,
      lastFetch: this.lastFetchTime,
      dataCount: this.stockDataCache.length
    };
  }
}

// Create singleton instance
let stockPriceService: StockPriceService | null = null;

export const getStockPriceService = (): StockPriceService => {
  if (!stockPriceService) {
    stockPriceService = new StockPriceService();
  }
  return stockPriceService;
};

export default StockPriceService; 