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
      
      // Check if we have any data
      if (lines.length <= 1) {
        console.log('No data found in Google Sheets (only header or empty)');
        return { success: false, error: 'No data found in Google Sheets. Please ensure the sheet contains mutual fund data.' };
      }
      
      // Parse header to understand column structure
      const headerColumns = this.parseCSVLine(lines[0]);
      console.log('Header columns:', headerColumns);
      
      // Try to auto-detect column positions
      const columnMap = this.detectColumnPositions(headerColumns);
      console.log('Detected column mapping:', columnMap);
      
      // Skip header row and find matching ISIN
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);
        console.log(`Line ${i} columns:`, columns);
        
        if (columns.length < Math.max(columnMap.isin, columnMap.name, columnMap.nav, columnMap.date) + 1) {
          console.log(`Line ${i} has insufficient columns:`, columns.length);
          continue;
        }

        const csvISIN = columns[columnMap.isin] || '';
        const schemeName = columns[columnMap.name] || '';
        const navStr = columns[columnMap.nav] || '';
        const date = columns[columnMap.date] || '';
        
        // Skip rows with #N/A or empty values
        if (csvISIN === '#N/A' || csvISIN.trim() === '' || 
            schemeName === '#N/A' || schemeName.trim() === '' ||
            navStr === '#N/A' || navStr.trim() === '') {
          console.log(`Skipping row with invalid data:`, columns);
          continue;
        }
        
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

  private detectColumnPositions(headerColumns: string[]): { isin: number; name: number; nav: number; date: number } {
    // Based on user's Google Sheets structure:
    // ISIN = 2nd column (index 1)
    // Name = 4th column (index 3)
    // Current Price/NAV = 5th column (index 4)
    // Date = 1st column (index 0) - assuming this is the case
    
    const isinIndex = 1;  // 2nd column
    const nameIndex = 3;  // 4th column
    const navIndex = 4;   // 5th column
    const dateIndex = 0;  // 1st column (assuming)
    
    console.log(`Using fixed column mapping:`);
    console.log(`  ISIN (2nd column): index ${isinIndex}`);
    console.log(`  Name (4th column): index ${nameIndex}`);
    console.log(`  NAV (5th column): index ${navIndex}`);
    console.log(`  Date (1st column): index ${dateIndex}`);
    
    return { isin: isinIndex, name: nameIndex, nav: navIndex, date: dateIndex };
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
        const headerColumns = this.parseCSVLine(lines[0]);
        console.log('Header columns:', headerColumns);
        console.log('Column mapping:');
        console.log('  Column 1 (ISIN):', headerColumns[0] || 'NOT FOUND');
        console.log('  Column 2 (Name):', headerColumns[1] || 'NOT FOUND');
        console.log('  Column 3 (NAV/Value):', headerColumns[2] || 'NOT FOUND');
        console.log('  Column 4 (Date):', headerColumns[3] || 'NOT FOUND');
        
        console.log('First 3 data lines:');
        for (let i = 1; i < Math.min(4, lines.length); i++) {
          const dataColumns = this.parseCSVLine(lines[i]);
          console.log(`Line ${i}:`, dataColumns);
          console.log(`  ISIN: ${dataColumns[0] || 'N/A'}`);
          console.log(`  Name: ${dataColumns[1] || 'N/A'}`);
          console.log(`  NAV: ${dataColumns[2] || 'N/A'}`);
          console.log(`  Date: ${dataColumns[3] || 'N/A'}`);
        }
      }
    } catch (error) {
      console.error('Error testing NAV service:', error);
    }
  }
}

export const navService = new NAVService();
export type { MutualFundData, NAVServiceResponse }; 