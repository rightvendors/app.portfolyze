export interface GoldPriceData {
  city: string;
  gold_24k: number;
  gold_22k: number;
  gold_18k: number;
  timestamp: string;
}

export interface GoldPriceResponse {
  success: boolean;
  data?: GoldPriceData;
  error?: string;
}

class GoldPriceService {
  private readonly API_KEY = '49d8557f59msh20345ca4ff94ed7p1d0d00jsn0c3a24c251e5';
  private readonly API_HOST = 'indian-gold-and-silver-price.p.rapidapi.com';
  private priceCache: { price: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getCurrentGoldPrice(city: string = 'Mumbai'): Promise<number | null> {
    try {
      // Check cache first
      if (this.priceCache && Date.now() - this.priceCache.timestamp < this.CACHE_DURATION) {
        return this.priceCache.price;
      }

      const response = await fetch(`https://${this.API_HOST}/gold?city=${city}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.API_KEY,
          'x-rapidapi-host': this.API_HOST,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GoldPriceResponse = await response.json();
      
      if (data.success && data.data) {
        const price = data.data.gold_24k; // Use 24k gold price per gram
        this.priceCache = {
          price,
          timestamp: Date.now()
        };
        return price;
      } else {
        throw new Error(data.error || 'Failed to fetch gold price');
      }
    } catch (error) {
      console.error('Error fetching gold price:', error);
      return null;
    }
  }

  async getGoldPriceData(city: string = 'Mumbai'): Promise<GoldPriceData | null> {
    try {
      const response = await fetch(`https://${this.API_HOST}/gold?city=${city}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.API_KEY,
          'x-rapidapi-host': this.API_HOST,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GoldPriceResponse = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch gold price data');
      }
    } catch (error) {
      console.error('Error fetching gold price data:', error);
      return null;
    }
  }

  clearCache(): void {
    this.priceCache = null;
  }

  getCacheStatus(): { hasCache: boolean; lastFetch: number | null } {
    return {
      hasCache: this.priceCache !== null,
      lastFetch: this.priceCache?.timestamp || null
    };
  }
}

let goldPriceService: GoldPriceService | null = null;

export const getGoldPriceService = (): GoldPriceService => {
  if (!goldPriceService) {
    goldPriceService = new GoldPriceService();
  }
  return goldPriceService;
}; 