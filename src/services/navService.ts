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
    const baseUrl = (import.meta as any)?.env?.VITE_NAV_API_BASE as string | undefined;
    
    console.log('🔍 NAVService: Environment check:', {
      hasImportMeta: !!import.meta,
      hasEnv: !!(import.meta as any)?.env,
      baseUrl: baseUrl,
      allEnvVars: (import.meta as any)?.env ? Object.keys((import.meta as any).env) : 'no env object'
    });
    
    if (!baseUrl || baseUrl.trim() === '') {
      console.warn('⚠️  VITE_NAV_API_BASE environment variable is not set or empty.');
      console.warn('   To fix this:');
      console.warn('   1. Create a .env file in your project root');
      console.warn('   2. Add: VITE_NAV_API_BASE=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
      console.warn('   3. Replace YOUR_SCRIPT_ID with your actual Apps Script deployment ID');
      console.warn('   4. Restart your development server');
      console.warn('   For now, NAV data will not be available.');
      return undefined;
    }
    
    console.log('✅ NAVService: Using API base URL:', baseUrl);
    return baseUrl;
  }

  private async fetchFromApi<T = any>(url: string): Promise<T | null> {
    try {
      // Use simple GET request without custom headers to avoid preflight OPTIONS
      console.log('🌐 NAVService: Fetching from URL:', url);
      const res = await fetch(url);
      console.log('📡 NAVService: Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        console.warn('⚠️ NAVService: API request failed:', res.status, res.statusText);
        return null;
      }
      
      const json = await res.json();
      console.log('📊 NAVService: API response data:', json);
      return json as T;
    } catch (error) {
      console.error('❌ NAVService: API request error:', error);
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