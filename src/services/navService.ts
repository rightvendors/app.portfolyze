// NAV Service for fetching mutual fund data via Apps Script JSON API
interface MutualFundData {
  isin: string;
  schemeName: string;
  nav: number;
  date: string;
}

interface NAVServiceResponse {
  success: boolean;
  data?: MutualFundData;
  error?: string;
}

class NAVService {
  private cache: Map<string, { data: MutualFundData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getApiBase(): string | undefined {
    return (import.meta as any)?.env?.VITE_NAV_API_BASE as string | undefined;
  }

  private async fetchFromApi<T = any>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (!res.ok) return null;
      const json = await res.json();
      return json as T;
    } catch {
      return null;
    }
  }

  async fetchNAVByISIN(isin: string): Promise<NAVServiceResponse> {
    try {
      // Check cache first
      const cached = this.cache.get(isin);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, data: cached.data };
      }

      console.log(`Fetching NAV data for ISIN: ${isin}`);

      // Try Apps Script JSON API
      const base = this.getApiBase();
      if (base) {
        const apiUrl = `${base}${base.includes('?') ? '&' : '?'}isin=${encodeURIComponent(isin)}`;
        const api = await this.fetchFromApi<any>(apiUrl);
        if (api) {
          const item = Array.isArray(api?.data) ? api.data[0] : (api?.data || api);
          if (item && (item.nav || item.NAV)) {
            const data: MutualFundData = {
              isin: (item.isin || isin).toString(),
              schemeName: (item.schemeName || item.scheme_name || '').toString(),
              nav: Number(item.nav || item.NAV),
              date: (item.date || new Date().toISOString().split('T')[0]).toString()
            };
            this.cache.set(isin, { data, timestamp: Date.now() });
            return { success: true, data };
          }
        }
      }
      return { success: false, error: 'NAV not found from API' };
    } catch (error) {
      console.error('Error fetching NAV data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch NAV data' 
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // CSV-related utilities removed - API-only
}

export const navService = new NAVService();
export type { MutualFundData, NAVServiceResponse }; 