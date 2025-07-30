// NAV Service for fetching mutual fund data from Google Sheets
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
  private readonly SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7gAzBO2fhdWPcM5GUic1nrs0x45lAXwPY5P_CtxStppYLB2wkvOVKafduzw2Qd78mlP2GGNVK7dbl/pub?gid=1833356118&single=true&output=csv';
  private cache: Map<string, { data: MutualFundData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchNAVByISIN(isin: string): Promise<NAVServiceResponse> {
    try {
      // Check cache first
      const cached = this.cache.get(isin);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, data: cached.data };
      }

      // Fetch fresh data
      const response = await fetch(this.SHEET_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      // Skip header row and find matching ISIN
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);
        if (columns.length < 4) continue;

        const [csvISIN, schemeName, navStr, date] = columns;
        
        if (csvISIN.trim().toUpperCase() === isin.trim().toUpperCase()) {
          const nav = parseFloat(navStr);
          if (isNaN(nav)) {
            return { success: false, error: 'Invalid NAV value in data' };
          }

          const data: MutualFundData = {
            isin: csvISIN.trim(),
            schemeName: schemeName.trim(),
            nav,
            date: date.trim()
          };

          // Cache the result
          this.cache.set(isin, { data, timestamp: Date.now() });
          
          return { success: true, data };
        }
      }

      return { success: false, error: 'ISIN not found in NAV data' };
    } catch (error) {
      console.error('Error fetching NAV data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch NAV data' 
      };
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"|"$/g, ''));
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const navService = new NAVService();
export type { MutualFundData, NAVServiceResponse }; 