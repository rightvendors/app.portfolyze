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
  private readonly SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7gAzBO2fhdWPcM5GUic1nrs0x45lAXwPY5P_CtxStppYLB2wkvOVKafduzw2Qd78mlP2GGNVK7dbl/pub?output=csv';
  private cache: Map<string, { data: MutualFundData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchNAVByISIN(isin: string): Promise<NAVServiceResponse> {
    try {
      // Check cache first
      const cached = this.cache.get(isin);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, data: cached.data };
      }

      console.log(`Fetching NAV data for ISIN: ${isin}`);
      
      // Fetch fresh data
      const response = await fetch(this.SHEET_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log('CSV data received, length:', csvText.length);
      
      // Handle different line endings
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      console.log('Number of lines in CSV:', lines.length);
      
      // Log first few lines for debugging
      if (lines.length > 0) {
        console.log('Header line:', lines[0]);
        if (lines.length > 1) {
          console.log('First data line:', lines[1]);
        }
      }
      
      // Skip header row and find matching ISIN
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);
        console.log(`Line ${i} columns:`, columns);
        
        if (columns.length < 4) {
          console.log(`Line ${i} has insufficient columns:`, columns.length);
          continue;
        }

        const [csvISIN, schemeName, navStr, date] = columns;
        
        if (csvISIN.trim().toUpperCase() === isin.trim().toUpperCase()) {
          const nav = parseFloat(navStr);
          if (isNaN(nav)) {
            console.log(`Invalid NAV value for ISIN ${isin}:`, navStr);
            return { success: false, error: 'Invalid NAV value in data' };
          }

          const data: MutualFundData = {
            isin: csvISIN.trim(),
            schemeName: schemeName.trim(),
            nav,
            date: date.trim()
          };

          console.log('Found matching data:', data);

          // Cache the result
          this.cache.set(isin, { data, timestamp: Date.now() });
          
          return { success: true, data };
        }
      }

      console.log(`ISIN ${isin} not found in NAV data`);
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

  // Debug method to test the service
  async testService(): Promise<void> {
    try {
      console.log('Testing NAV service...');
      const response = await fetch(this.SHEET_URL);
      if (!response.ok) {
        console.error('Failed to fetch CSV:', response.status, response.statusText);
        return;
      }

      const csvText = await response.text();
      console.log('Raw CSV data (first 500 chars):', csvText.substring(0, 500));
      
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      console.log('Total lines:', lines.length);
      
      if (lines.length > 0) {
        console.log('Header:', lines[0]);
        console.log('First 3 data lines:');
        for (let i = 1; i < Math.min(4, lines.length); i++) {
          console.log(`Line ${i}:`, lines[i]);
        }
      }
    } catch (error) {
      console.error('Error testing NAV service:', error);
    }
  }
}

export const navService = new NAVService();
export type { MutualFundData, NAVServiceResponse }; 