export interface GoldSilverPriceData {
  gold_24k: number;
  silver_per_kg: number;
  timestamp: string;
}

class GoldSilverPriceService {
  private readonly CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2oIq7FfNcvUMPhugPZd8f3dUQHSHAT879W0OfpYcHQZZ-aY696QUGk4JmYu8fyt8yDAeEJ001c7y/pub?gid=0&single=true&output=csv';
  private priceCache: { gold: number; silver: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchPrices(): Promise<GoldSilverPriceData | null> {
    try {
      // Check cache first
      if (this.priceCache && Date.now() - this.priceCache.timestamp < this.CACHE_DURATION) {
        console.log('Using cached gold/silver prices:', this.priceCache);
        return {
          gold_24k: this.priceCache.gold,
          silver_per_kg: this.priceCache.silver,
          timestamp: new Date(this.priceCache.timestamp).toISOString()
        };
      }

      console.log('Fetching gold/silver prices from CSV...');
      const response = await fetch(this.CSV_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log('CSV response:', csvText);
      
      const prices = this.parseCSV(csvText);
      console.log('Parsed prices:', prices);
      
      if (prices) {
        this.priceCache = {
          gold: prices.gold_24k,
          silver: prices.silver_per_kg,
          timestamp: Date.now()
        };
        return prices;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching gold/silver prices:', error);
      return null;
    }
  }

  private parseCSV(csvText: string): GoldSilverPriceData | null {
    try {
      console.log('Raw CSV text:', csvText);
      
      // Handle the specific format: "24 carat Gold price per gm,"9,930" Silver rate per kg," 111,450.00""
      // This is a single line with quoted values
      
      let goldPrice = 0;
      let silverPrice = 0;
      
      // Extract gold price - look for pattern: "9,930"
      const goldMatch = csvText.match(/"([0-9,]+)"/);
      if (goldMatch) {
        goldPrice = parseFloat(goldMatch[1].replace(/,/g, ''));
        console.log('Gold price extracted:', goldPrice);
      }
      
      // Extract silver price - look for pattern: " 111,450.00"
      const silverMatch = csvText.match(/"\s*([0-9,]+\.?[0-9]*)"/g);
      if (silverMatch && silverMatch.length > 1) {
        // Take the second quoted value (silver price)
        const silverValue = silverMatch[1].replace(/"/g, '').trim();
        silverPrice = parseFloat(silverValue.replace(/,/g, ''));
        console.log('Silver price extracted:', silverPrice);
      }
      
      console.log('Final extracted prices - Gold:', goldPrice, 'Silver:', silverPrice);

      if (goldPrice > 0 || silverPrice > 0) {
        return {
          gold_24k: goldPrice,
          silver_per_kg: silverPrice,
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return null;
    }
  }

  async getCurrentGoldPrice(): Promise<number | null> {
    const prices = await this.fetchPrices();
    return prices?.gold_24k || null;
  }

  async getCurrentSilverPrice(): Promise<number | null> {
    const prices = await this.fetchPrices();
    return prices?.silver_per_kg || null;
  }

  async getCurrentPrices(): Promise<{ gold: number | null; silver: number | null }> {
    const prices = await this.fetchPrices();
    return {
      gold: prices?.gold_24k || null,
      silver: prices?.silver_per_kg || null
    };
  }

  clearCache(): void {
    console.log('Clearing gold/silver price cache');
    this.priceCache = null;
  }

  getCacheStatus(): { hasCache: boolean; lastFetch: number | null } {
    return {
      hasCache: this.priceCache !== null,
      lastFetch: this.priceCache?.timestamp || null
    };
  }
}

let goldSilverPriceService: GoldSilverPriceService | null = null;

export const getGoldSilverPriceService = (): GoldSilverPriceService => {
  if (!goldSilverPriceService) {
    goldSilverPriceService = new GoldSilverPriceService();
  }
  return goldSilverPriceService;
}; 