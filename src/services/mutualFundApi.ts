// Mutual Fund NAV API service using Apps Script JSON API
export interface MutualFundNAV {
  scheme_name: string;
  nav: number;
  date: string;
  scheme_code?: string;
  isin: string;
}

class MutualFundApiService {
  private navCache: Map<string, { nav: MutualFundNAV; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (NAV updates daily)

  constructor() {
    // No API key needed for public sheets
  }

  // Resolve Apps Script API base from env (strip any leading '@' if present)
  private getApiBase(): string | undefined {
    // Vite injects envs on import.meta.env
    const baseUrl = (import.meta as any)?.env?.VITE_NAV_API_BASE as string | undefined;
    
    console.log('🔍 MutualFundApi: Environment check:', {
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
      console.warn('   For now, using mock data instead of real NAV data.');
      return undefined;
    }
    
    console.log('✅ MutualFundApi: Using API base URL:', baseUrl);
    return baseUrl;
  }

  // Try fetch JSON from Apps Script endpoint
  private async fetchFromApi<T = any>(path: string): Promise<T | null> {
    const base = this.getApiBase();
    if (!base) return null;
    const url = base.endsWith('/') ? `${base.slice(0, -1)}${path}` : `${base}${path}`;
    try {
      const res = await fetch(url, { mode: 'cors', headers: { 'cache-control': 'no-cache' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data as T;
    } catch {
      return null;
    }
  }

  private async tryApiCandidates<T = any>(candidates: string[]): Promise<T | null> {
    for (const path of candidates) {
      const data = await this.fetchFromApi<T>(path);
      if (data) return data;
    }
    return null;
  }

  // CSV parsing removed as we no longer use published CSV fallback

  // Get all mutual fund NAVs from Apps Script JSON API
  async getAllNAVs(): Promise<MutualFundNAV[]> {
    try {
      // Prefer Apps Script API if configured: try common variants
      const apiAll = await this.tryApiCandidates<MutualFundNAV[] | { data?: MutualFundNAV[] }>([
        `?all=1`,
        `?sheet=${encodeURIComponent('AMFI APP SCRIPT')}`,
        `?sheet=AMFI`,
        `?action=all`
      ]);
      if (apiAll) {
        const list = Array.isArray(apiAll) ? apiAll : (apiAll as any).data;
        if (Array.isArray(list) && list.length > 0) {
          const cleaned = list
            .map((item: any) => {
              const name = item?.scheme_name || item?.schemeName || item?.name || '';
              const navRaw = item?.nav ?? item?.NAV ?? item?.currentNav;
              const nav = Number(navRaw);
              const isin = item?.isin || item?.ISIN || item?.isinCode || '';
              const date = item?.date || item?.navDate || new Date().toISOString().split('T')[0];
              if (!name || !isFinite(nav)) return null;
              return { scheme_name: name, nav, date, isin } as MutualFundNAV;
            })
            .filter(Boolean) as MutualFundNAV[];
          cleaned.forEach(nav => {
            this.navCache.set(nav.scheme_name.toLowerCase(), { nav, timestamp: Date.now() });
          });
          return cleaned;
        }
      }

      // No valid API response; give up and use mock
      throw new Error('Apps Script API returned no data');
    } catch (error) {
      console.error('Error fetching NAVs (API failed):', error);
      // As a last resort, attempt name-based API root without params
      const lastTry = await this.fetchFromApi<any>('');
      if (Array.isArray(lastTry)) {
        try {
          const cleaned = lastTry
            .filter((item: any) => item && (item.scheme_name || item.schemeName) && (item.nav || item.NAV))
            .map((item: any) => ({
              scheme_name: item.scheme_name || item.schemeName,
              nav: Number(item.nav || item.NAV),
              date: item.date || new Date().toISOString().split('T')[0],
              isin: item.isin || ''
            } as MutualFundNAV));
          if (cleaned.length > 0) return cleaned;
        } catch {}
      }
      return this.getMockNAVs();
    }
  }

  // Search for a specific mutual fund NAV
  async searchNAV(schemeName: string): Promise<MutualFundNAV | null> {
    const searchKey = schemeName.toLowerCase();
    
    // Check cache first
    const cached = this.navCache.get(searchKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.nav;
    }

    // If not in cache, fetch all NAVs and search
    const allNAVs = await this.getAllNAVs();
    
    // Try exact match first
    let found = allNAVs.find(nav => 
      nav.scheme_name.toLowerCase() === searchKey
    );

    // If no exact match, try partial match
    if (!found) {
      found = allNAVs.find(nav => 
        nav.scheme_name.toLowerCase().includes(searchKey) ||
        searchKey.includes(nav.scheme_name.toLowerCase())
      );
    }

    console.log(`Name search for "${schemeName}":`, {
      searchKey,
      totalNAVs: allNAVs.length,
      found: found ? found.scheme_name : null,
      availableNames: allNAVs.map(nav => nav.scheme_name).slice(0, 5) // Show first 5 names for debugging
    });

    return found || null;
  }

  // Search for mutual fund by ISIN
  async searchByISIN(isin: string): Promise<MutualFundNAV | null> {
    const searchKey = isin.toUpperCase().trim();
    // Try Apps Script API first
    const api = await this.tryApiCandidates<MutualFundNAV | { nav?: number | string; NAV?: number | string; scheme_name?: string; schemeName?: string; date?: string; isin?: string; ISIN?: string }>([
      `?isin=${encodeURIComponent(searchKey)}`,
      `?schemeCode=${encodeURIComponent(searchKey)}`,
      `?q=${encodeURIComponent(searchKey)}&type=isin`,
      `?sheet=${encodeURIComponent('AMFI APP SCRIPT')}&isin=${encodeURIComponent(searchKey)}`
    ]);
    if (api && ((api as any).nav || (api as any).NAV)) {
      const item = api as any;
      const result: MutualFundNAV = {
        scheme_name: item.scheme_name || item.schemeName || '',
        nav: Number(item.nav ?? item.NAV),
        date: item.date || new Date().toISOString().split('T')[0],
        isin: item.isin || item.ISIN || searchKey
      };
      this.navCache.set(result.scheme_name.toLowerCase(), { nav: result, timestamp: Date.now() });
      return result;
    }
    // Fallback: search within CSV-loaded NAVs
    const allNAVs = await this.getAllNAVs();
    const found = allNAVs.find(nav => nav.isin && nav.isin.toUpperCase() === searchKey);
    return found || null;
  }

  // Get NAV for a specific scheme
  async getNAV(schemeName: string): Promise<number | null> {
    // Try API by name first (several common parameter variants)
    const api = await this.tryApiCandidates<MutualFundNAV | { nav?: number | string; NAV?: number | string; scheme_name?: string; schemeName?: string; date?: string; isin?: string }>([
      `?name=${encodeURIComponent(schemeName)}`,
      `?schemeName=${encodeURIComponent(schemeName)}`,
      `?q=${encodeURIComponent(schemeName)}&type=name`,
      `?sheet=${encodeURIComponent('AMFI APP SCRIPT')}&name=${encodeURIComponent(schemeName)}`
    ]);
    if (api && ((api as any).nav || (api as any).NAV)) {
      return Number((api as any).nav ?? (api as any).NAV);
    }
    const navData = await this.searchNAV(schemeName);
    return navData ? navData.nav : null;
  }

  // Mock NAV data for testing when API is not available
  private getMockNAVs(): MutualFundNAV[] {
    return [
      {
        scheme_name: 'SBI Bluechip Fund Direct Growth',
        nav: 65.45,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF200K01158'
      },
      {
        scheme_name: 'HDFC Top 100 Fund Direct Growth',
        nav: 785.32,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF179K01158'
      },
      {
        scheme_name: 'HDFC Focused Fund - GROWTH PLAN',
        nav: 225.36,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF179K01159'
      },
      {
        scheme_name: 'ICICI Prudential Bluechip Fund Direct Growth',
        nav: 58.76,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF109K01319'
      },
      {
        scheme_name: 'Axis Bluechip Fund Direct Growth',
        nav: 45.23,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF846K01238'
      },
      {
        scheme_name: 'Mirae Asset Large Cap Fund Direct Growth',
        nav: 89.12,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF769K01021'
      },
      {
        scheme_name: 'Parag Parikh Long Term Equity Fund Direct Growth',
        nav: 52.34,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF169K01239'
      },
      {
        scheme_name: 'UTI Nifty Fund Direct Growth',
        nav: 234.56,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF789K01234'
      },
      {
        scheme_name: 'DSP Tax Saver Fund Direct Growth',
        nav: 78.90,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF740K01234'
      },
      {
        scheme_name: 'Kotak Standard Multicap Fund Direct Growth',
        nav: 45.67,
        date: new Date().toISOString().split('T')[0],
        isin: 'INF174K01234'
      }
    ];
  }

  // Get suggestive list of fund names and ISINs based on partial input
  async getFundSuggestions(partialName: string, maxResults = 100): Promise<{ name: string; isin: string }[]> {
    const allNAVs = await this.getAllNAVs();
    const searchKey = partialName.toLowerCase().trim();

    const matches = allNAVs
      .filter(nav => nav.scheme_name.toLowerCase().includes(searchKey))
      .map(nav => ({ name: nav.scheme_name, isin: nav.isin }));

    // Remove duplicates based on name and limit results
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.name.toLowerCase() === match.name.toLowerCase())
    ).slice(0, maxResults);

    // Log debugging information
    console.log(`Mutual fund search for "${partialName}" found:`, {
      totalNAVs: allNAVs.length,
      matches: matches.length,
      uniqueMatches: uniqueMatches.length,
      maxResults: maxResults,
      sampleMatches: uniqueMatches.slice(0, 5)
    });

    return uniqueMatches;
  }

  // Clear cache
  clearCache(): void {
    this.navCache.clear();
  }
}

// Create singleton instance
let mutualFundService: MutualFundApiService | null = null;

export const getMutualFundService = (): MutualFundApiService => {
  if (!mutualFundService) {
    mutualFundService = new MutualFundApiService();
  }
  return mutualFundService;
};

export default MutualFundApiService;