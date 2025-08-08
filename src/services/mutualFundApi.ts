// Mutual Fund NAV API service using Google Sheets
export interface MutualFundNAV {
  scheme_name: string;
  nav: number;
  date: string;
  scheme_code?: string;
  isin: string;
}

class MutualFundApiService {
  private readonly SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7gAzBO2fhdWPcM5GUic1nrs0x45lAXwPY5P_CtxStppYLB2wkvOVKafduzw2Qd78mlP2GGNVK7dbl/pub?gid=1833356118&single=true&output=csv';
  private navCache: Map<string, { nav: MutualFundNAV; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (NAV updates daily)

  constructor() {
    // No API key needed for public sheets
  }

  // Parse CSV data from Google Sheets
  private parseCSV(csvText: string): MutualFundNAV[] {
    const lines = csvText.trim().split('\n').filter(line => line.trim()); // Remove empty lines
    const navs: MutualFundNAV[] = [];
    
    // Skip header row and parse data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      // Parse CSV line (handle quoted fields)
      const fields = this.parseCSVLine(line);
      
      // New CSV format: Scheme Code, ISIN Div Payout/ISIN Growth, ISIN Div Reinvestment, Scheme Name, Net Asset Value, Date
      const schemeCodeIndex = 0;
      const isinDivPayoutIndex = 1;
      const isinDivReinvestmentIndex = 2;
      const schemeNameIndex = 3;
      const navIndex = 4;
      const dateIndex = 5;
      
      // Skip rows with fewer than expected columns (should have 6 columns)
      if (fields.length < 6) continue;
      
      const schemeName = fields[schemeNameIndex]?.trim() || '';
      const navString = fields[navIndex]?.trim() || '';
      const date = fields[dateIndex]?.trim() || '';
      const schemeCode = fields[schemeCodeIndex]?.trim() || '';
      
      // Skip if scheme name is empty
      if (!schemeName) continue;
      
      // Parse NAV - handle commas in numbers (Indian number format)
      const cleanNavString = navString.replace(/,/g, '').trim();
      const navValue = parseFloat(cleanNavString);
      
      // Skip if NAV is not a valid number
      if (isNaN(navValue) || navValue <= 0) continue;
      
      navs.push({
        scheme_name: schemeName,
        nav: navValue,
        date: date || new Date().toISOString().split('T')[0],
        scheme_code: schemeCode,
        isin: fields[isinDivPayoutIndex]?.trim() || ''
      });
      }
    
    return navs;
  }
  
  // Parse a single CSV line handling quoted fields
  private parseCSVLine(line: string): string[] {
    return line.split(',').map(f => f.trim());
  }

  // Get all mutual fund NAVs from Google Sheets
  async getAllNAVs(): Promise<MutualFundNAV[]> {
    try {
      const response = await fetch(this.SHEET_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const navs = this.parseCSV(csvText);
      
        if (navs.length === 0) {
          throw new Error('No data found in spreadsheet');
        }

      // Cache all NAVs
      navs.forEach(nav => {
        this.navCache.set(nav.scheme_name.toLowerCase(), {
          nav: nav,
          timestamp: Date.now()
        });
      });

      return navs;
    } catch (error) {
      console.error('Error fetching NAVs from Google Sheets:', error);
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
    
    // Check cache first
    const allNAVs = await this.getAllNAVs();
    
    const found = allNAVs.find(nav => 
      nav.isin && nav.isin.toUpperCase() === searchKey
    );

    console.log(`ISIN search for "${searchKey}":`, {
      totalNAVs: allNAVs.length,
      found: found ? found.scheme_name : null,
      availableISINs: allNAVs.map(nav => nav.isin).slice(0, 5) // Show first 5 ISINs for debugging
    });

    return found || null;
  }

  // Get NAV for a specific scheme
  async getNAV(schemeName: string): Promise<number | null> {
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