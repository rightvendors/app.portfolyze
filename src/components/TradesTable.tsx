import React, { useState, useRef } from 'react';
import { Trade } from '../types/portfolio';
import { Trash2, Plus, Download, Upload, Loader, FileText, Edit } from 'lucide-react';
import { getMutualFundService } from '../services/mutualFundApi';
import { getStockPriceService } from '../services/stockPriceService';
import { navService, MutualFundData } from '../services/navService';
import StockSuggestionDropdown from './StockSuggestionDropdown';
import AddInvestmentModal from './AddInvestmentModal';
import EditInvestmentModal from './EditInvestmentModal';
import * as XLSX from 'xlsx';

interface TradesTableProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'buyAmount'>) => void;
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  onDeleteAllTrades?: () => Promise<void>;
  updatePriceCacheWithNAV?: (isin: string, nav: number) => void;
}

const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade,
  onDeleteAllTrades,
  updatePriceCacheWithNAV
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isinLookupResult, setIsinLookupResult] = useState<{ schemeName: string; nav: number } | null>(null);
  const [isinError, setIsinError] = useState<string>('');
  const [isLoadingName, setIsLoadingName] = useState<{ [key: string]: boolean }>({});
  const [navData, setNavData] = useState<{ [key: string]: MutualFundData }>({});
  const [stockSuggestions, setStockSuggestions] = useState<{ [key: string]: { query: string; isVisible: boolean } }>({});
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 40,
    date: 120,
    investmentType: 140,
    isin: 140,
    name: 180,
    interestRate: 100,
    transactionType: 100,
    quantity: 100,
    buyRate: 120,
    buyAmount: 140,
    brokerBank: 150,
    bucketAllocation: 160
  });

  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autosave state management
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autosaveMessage, setAutosaveMessage] = useState('');
  const [pendingChanges, setPendingChanges] = useState<{ id: string; field: string; value: any }[]>([]);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<{ [key: string]: number }>({});

  // Autosave functions
  const scheduleAutosave = (change: { id: string; field: string; value: any }) => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Add change to pending changes
    setPendingChanges(prev => {
      const existing = prev.findIndex(p => p.id === change.id && p.field === change.field);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });

    // Show immediate feedback
    setAutosaveStatus('saving');
    setAutosaveMessage('Saving...');

    // Schedule autosave with shorter delay for better responsiveness
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave();
    }, 800); // Reduced from 1.5 seconds to 800ms
  };

  const performAutosave = async () => {
    if (pendingChanges.length === 0) {
      setAutosaveStatus('saved');
      setAutosaveMessage('All changes saved');
      return;
    }

    try {
      // Since we're already saving immediately, just clear pending changes
      // and show success status
      setPendingChanges([]);
      setAutosaveStatus('saved');
      setAutosaveMessage('All changes saved');
      
      console.log('Autosave completed - changes were already saved immediately');
    } catch (error) {
      console.error('Autosave error:', error);
      setAutosaveStatus('error');
      setAutosaveMessage('Save failed');
    }
  };

  // Cleanup autosave timeout on unmount
  React.useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Clear autosave status after delay
  React.useEffect(() => {
    if (autosaveStatus === 'saved') {
      const timer = setTimeout(() => {
        setAutosaveStatus('idle');
        setAutosaveMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autosaveStatus]);

  // Lookup mutual fund by ISIN
  const lookupMutualFundByISIN = async (isin: string, tradeId: string) => {
    if (isin.length < 12) {
      setIsinLookupResult(null);
      setIsinError('');
      return;
    }

    try {
      const mutualFundService = getMutualFundService();
      const navData = await mutualFundService.searchByISIN(isin);
      
      if (navData) {
        setIsinLookupResult({
          schemeName: navData.scheme_name,
          nav: navData.nav
        });
        setIsinError('');
        
        // Auto-populate the scheme name
        onUpdateTrade(tradeId, { name: navData.scheme_name });
      } else {
        setIsinLookupResult(null);
        setIsinError('ISIN not found in AMFI database. Please check the number or search here: https://www.amfiindia.com/net-asset-value/nav-search');
      }
    } catch (error) {
      console.error('Error looking up ISIN:', error);
      setIsinLookupResult(null);
      setIsinError('Error looking up ISIN. Please try again.');
    }
  };

  // Handle stock name input for suggestions
  const handleStockNameInput = (value: string, tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.investmentType !== 'stock') {
      return;
    }

    if (value.length >= 2) {
      setStockSuggestions(prev => ({
        ...prev,
        [tradeId]: { query: value, isVisible: true }
      }));
    } else {
      setStockSuggestions(prev => ({
        ...prev,
        [tradeId]: { query: '', isVisible: false }
      }));
    }
  };

  // Handle stock suggestion selection
  const handleStockSuggestionSelect = (tradeId: string, suggestion: any) => {
    onUpdateTrade(tradeId, { name: suggestion.symbol });
    setStockSuggestions(prev => ({
      ...prev,
      [tradeId]: { query: '', isVisible: false }
    }));
  };

  // Close stock suggestions
  const closeStockSuggestions = (tradeId: string) => {
    setStockSuggestions(prev => ({
      ...prev,
      [tradeId]: { query: '', isVisible: false }
    }));
  };

  // Enhanced ISIN lookup with NAV service
  const lookupMutualFundByISINEnhanced = async (isin: string, tradeId: string) => {
    if (isin.length < 12) {
      setIsinLookupResult(null);
      setIsinError('');
      setIsLoadingName(prev => ({ ...prev, [tradeId]: false }));
      return;
    }

    try {
      setIsLoadingName(prev => ({ ...prev, [tradeId]: true }));
      setIsinError('');
      
      const result = await navService.fetchNAVByISIN(isin);
      
      if (result.success && result.data) {
        setNavData(prev => ({ ...prev, [tradeId]: result.data! }));
        setIsinLookupResult({
          schemeName: result.data.schemeName,
          nav: result.data.nav
        });
        
        // Auto-update only the name field, keep buyRate manual
        onUpdateTrade(tradeId, {
          name: result.data.schemeName
        });
        
        // Update price cache with NAV data for holdings table current price calculation
        if (updatePriceCacheWithNAV) {
          updatePriceCacheWithNAV(result.data.isin, result.data.nav);
        }
        
        console.log(`NAV data stored for holdings: ISIN=${result.data.isin}, NAV=${result.data.nav}`);
      } else {
        setIsinError(result.error || 'Failed to fetch mutual fund data');
      }
    } catch (error) {
      setIsinError('Error fetching mutual fund data');
      console.error('ISIN lookup error:', error);
    } finally {
      setIsLoadingName(prev => ({ ...prev, [tradeId]: false }));
    }
  };



  // Export data to Excel file
  const exportData = () => {
    // Helper function to format date as dd-mm-yyyy
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Prepare data for Excel export
    const excelData = trades.map(trade => ({
      'Date': formatDate(trade.date),
      'Investment Type': investmentTypes.find(t => t.value === trade.investmentType)?.label || trade.investmentType,
      'ISIN Number': trade.isin || '',
      'Name': trade.name || '',
      'Interest %': trade.interestRate || '',
      'Buy/Sell': trade.transactionType.toUpperCase(),
      'Quantity': trade.quantity,
      'Buy Rate': trade.buyRate,
      'Buy Amount': trade.buyAmount,
      'Broker/Bank': trade.brokerBank || '',
      'Bucket Allocation': getBucketDisplayValue(trade.bucketAllocation)
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Investment Type
      { wch: 15 }, // ISIN Number
      { wch: 30 }, // Name
      { wch: 10 }, // Interest %
      { wch: 10 }, // Buy/Sell
      { wch: 12 }, // Quantity
      { wch: 12 }, // Buy Rate
      { wch: 15 }, // Buy Amount
      { wch: 20 }, // Broker/Bank
      { wch: 18 }  // Bucket Allocation
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio Trades');

    // Generate filename with current date
    const fileName = `portfolio-trades-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  // Clear all trades from Firebase (for debugging)
  const clearAllTrades = async () => {
    // Confirmation dialog to prevent accidental deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${trades.length} trades? This action cannot be undone and will permanently remove all your trade data from the cloud database.`
    );
    
    if (!confirmed) {
      console.log('Clear all trades cancelled by user');
      return;
    }
    
    try {
      if (onDeleteAllTrades) {
        await onDeleteAllTrades();
        console.log('All trades cleared successfully from Firebase');
        alert('All trades cleared successfully from Firebase!');
      } else {
        // Fallback to localStorage clearing if Firebase function not available
        localStorage.removeItem('portfolio_trades');
        localStorage.removeItem('portfolio_bucket_targets');
        localStorage.removeItem('portfolio_price_cache');
        localStorage.removeItem('portfolio_bucket_targets_purposes');
        console.log('LocalStorage cleared successfully (fallback)');
        alert('LocalStorage cleared successfully. Please refresh the page.');
      }
    } catch (error) {
      console.error('Error clearing trades:', error);
      alert('Error clearing trades: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Download Excel template
  const downloadTemplate = () => {
    // Create template data with headers and example rows
    const templateData = [
      {
        'Date': '15-01-2024',
        'Investment Type': 'Stock',
        'ISIN Number': '',
        'Name': 'Example Stock',
        'Interest %': '',
        'Buy/Sell': 'BUY',
        'Quantity': 100,
        'Buy Rate': 150.50,
        'Buy Amount': 15050,
        'Broker/Bank': 'Example Broker',
        'Bucket Allocation': 'Bucket 1A'
      },
      {
        'Date': '16-01-2024',
        'Investment Type': 'Mutual Fund',
        'ISIN Number': 'INF209KA12Z1',
        'Name': '', // Can be blank for mutual funds - name will be fetched from ISIN
        'Interest %': '',
        'Buy/Sell': 'BUY',
        'Quantity': 1000,
        'Buy Rate': 25.75,
        'Buy Amount': 25750,
        'Broker/Bank': 'Example Bank',
        'Bucket Allocation': 'Bucket 2'
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Investment Type
      { wch: 15 }, // ISIN Number
      { wch: 30 }, // Name
      { wch: 10 }, // Interest %
      { wch: 10 }, // Buy/Sell
      { wch: 12 }, // Quantity
      { wch: 12 }, // Buy Rate
      { wch: 15 }, // Buy Amount
      { wch: 20 }, // Broker/Bank
      { wch: 18 }  // Bucket Allocation
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Save template file
    XLSX.writeFile(wb, 'portfolio-trades-template.xlsx');
  };

  // Import data from Excel file
  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true, // Parse dates as Date objects
          cellNF: false,
          cellText: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Convert all values to strings/objects
          dateNF: 'yyyy-mm-dd' // Date number format
        });

        // Convert Excel data to Trade format
        const importedTrades = jsonData.map((row: any, index: number) => {
          // Map Excel columns to Trade properties
          const investmentTypeMap: { [key: string]: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'nps' | 'etf' } = {
            'Stock': 'stock',
            'Mutual Fund': 'mutual_fund',
            'Bond': 'bond',
            'Fixed Deposit': 'fixed_deposit',
            'Gold': 'gold',
            'Silver': 'silver',
            'NPS': 'nps',
            'ETF': 'etf'
          };

          const transactionTypeMap: { [key: string]: 'buy' | 'sell' } = {
            'BUY': 'buy',
            'SELL': 'sell',
            'Buy': 'buy',
            'Sell': 'sell',
            'buy': 'buy',
            'sell': 'sell'
          };

          const bucketMap: { [key: string]: string } = {
            'Bucket 1A': 'bucket1a',
            'Bucket 1B': 'bucket1b',
            'Bucket 1C': 'bucket1c',
            'Bucket 1D': 'bucket1d',
            'Bucket 1E': 'bucket1e',
            'Bucket 2': 'bucket2',
            'Bucket 3': 'bucket3'
          };

          const investmentTypeValue = row['Investment Type'];
          const mappedInvestmentType: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'nps' | 'etf' = 
            (investmentTypeMap[investmentTypeValue] as 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'nps' | 'etf') || 'stock';
          
          // Debug transaction type mapping
          const rawTransactionType = row['Buy/Sell'];
          console.log(`Raw transaction type: "${rawTransactionType}", type: ${typeof rawTransactionType}`);
          const mappedTransactionType = transactionTypeMap[rawTransactionType] || 'buy';
          console.log(`Mapped transaction type: ${mappedTransactionType}`);

          // Parse date - handle Excel date objects and various string formats
          let parsedDate = new Date().toISOString().split('T')[0]; // Default to today
          if (row['Date']) {
            console.log(`Raw date value: ${row['Date']}, type: ${typeof row['Date']}`);
            
            let dateToParse = row['Date'];
            
            // Handle Excel date numbers (Excel stores dates as numbers)
            if (typeof dateToParse === 'number') {
              // Excel date numbers are days since 1900-01-01
              const excelEpoch = new Date(1900, 0, 1);
              const date = new Date(excelEpoch.getTime() + (dateToParse - 2) * 24 * 60 * 60 * 1000);
              parsedDate = date.toISOString().split('T')[0];
              console.log(`Converted Excel number ${dateToParse} to date: ${parsedDate}`);
            }
            // Handle Date objects
            else if (dateToParse instanceof Date) {
              parsedDate = dateToParse.toISOString().split('T')[0];
              console.log(`Converted Date object to: ${parsedDate}`);
            }
            // Handle string formats
            else if (typeof dateToParse === 'string') {
              const dateStr = dateToParse.trim();
              
              // Handle dd-mm-yyyy format
              if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    // yyyy-mm-dd format
                    parsedDate = dateStr;
                  } else {
                    // dd-mm-yyyy format, convert to yyyy-mm-dd
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    parsedDate = `${year}-${month}-${day}`;
                  }
                }
              }
              // Handle dd/mm/yyyy format
              else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    // yyyy/mm/dd format
                    parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                  } else {
                    // dd/mm/yyyy format
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    parsedDate = `${year}-${month}-${day}`;
                  }
                }
              }
              // Try to parse as ISO date
              else {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  parsedDate = date.toISOString().split('T')[0];
                }
              }
              
              console.log(`Parsed string date "${dateStr}" to: ${parsedDate}`);
            }
          }

          const tradeObject = {
            id: `imported-${Date.now()}-${index}`,
            date: parsedDate,
            investmentType: mappedInvestmentType,
            isin: row['ISIN Number'] || '',
            name: row['Name'] || '', // Allow blank names - will be fetched from ISIN for mutual funds
            interestRate: parseFloat(row['Interest %']) || 0,
            transactionType: mappedTransactionType,
            quantity: parseFloat(row['Quantity']) || 0,
            buyRate: parseFloat(row['Buy Rate']) || 0,
            buyAmount: parseFloat(row['Buy Amount']) || 0,
            brokerBank: row['Broker/Bank'] || '',
            bucketAllocation: bucketMap[row['Bucket Allocation']] || ''
          };
          
          console.log(`Created trade object for row ${index}:`, tradeObject);
          return tradeObject;
        });

        // Validate imported trades - allow blank names for mutual funds and be more lenient
        const validTrades = importedTrades.filter((trade: any) => {
          // Basic validation - require date, investment type, transaction type, quantity, and buy rate
          const hasRequiredFields = trade.date && trade.investmentType && trade.transactionType && 
            trade.quantity > 0 && trade.buyRate > 0;
          
          // For mutual funds, allow blank names if ISIN is provided
          const hasValidName = trade.investmentType === 'mutual_fund' ? 
            (trade.isin || trade.name) : // Allow blank name if ISIN exists for mutual funds
            trade.name; // Require name for other investment types
          
          const isValid = hasRequiredFields && hasValidName;
          
          if (!isValid) {
            console.warn('Invalid trade found:', trade);
          }
          
          return isValid;
        });

        console.log(`Found ${jsonData.length} rows in Excel, ${validTrades.length} valid trades`);

        if (validTrades.length > 0) {
          // Add imported trades to existing trades using onAddTrade function
          console.log(`Importing ${validTrades.length} trades`);
          
          // Process each trade sequentially to avoid overwhelming the system
          const importPromises = validTrades.map(async (trade: any, index: number) => {
            try {
              // Remove the temporary ID and let Firebase generate a proper one
              const { id, ...tradeData } = trade;
              
              // For mutual funds with ISIN, fetch the name from ISIN
              if (tradeData.investmentType === 'mutual_fund' && tradeData.isin) {
                try {
                  console.log(`Fetching name for ISIN: ${tradeData.isin}`);
                  const mutualFundService = getMutualFundService();
                  const navData = await mutualFundService.searchByISIN(tradeData.isin);
                  
                  if (navData && navData.scheme_name) {
                    // Override user-provided name with ISIN-fetched name
                    tradeData.name = navData.scheme_name;
                    console.log(`Fetched name for ISIN ${tradeData.isin}: ${navData.scheme_name}`);
                  } else {
                    console.warn(`Could not fetch name for ISIN: ${tradeData.isin}`);
                    // Keep existing name or use a placeholder
                    if (!tradeData.name) {
                      tradeData.name = `Unknown Fund (${tradeData.isin})`;
                    }
                  }
                } catch (isinError) {
                  console.warn(`Error fetching name for ISIN ${tradeData.isin}:`, isinError);
                  // Keep existing name or use a placeholder
                  if (!tradeData.name) {
                    tradeData.name = `Unknown Fund (${tradeData.isin})`;
                  }
                }
              }
              
              // Add the trade using the onAddTrade function
              await onAddTrade(tradeData);
              
              console.log(`Imported trade ${index + 1}/${validTrades.length}: ${tradeData.name}`);
              
              // Small delay to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 100));
              
              return true;
            } catch (error) {
              console.error(`Error importing trade ${index + 1}:`, error);
              return false;
            }
          });
          
          // Wait for all imports to complete
          const results = await Promise.allSettled(importPromises);
          const successfulImports = results.filter(result => result.status === 'fulfilled' && result.value).length;
          
          if (successfulImports > 0) {
            alert(`Successfully imported ${successfulImports} out of ${validTrades.length} trades!`);
          } else {
            alert('Failed to import any trades. Please check the data format and try again.');
          }
        } else {
          alert('No valid trades found in the imported file. Please check the format.');
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file. Please ensure it\'s a valid Excel file.');
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset input
  };
  const investmentTypes = [
    { value: 'stock', label: 'Stock' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'bond', label: 'Bond' },
    { value: 'fixed_deposit', label: 'Fixed Deposit' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
            { value: 'nps', label: 'NPS' },
    { value: 'etf', label: 'ETF' }
  ];

  const bucketOptions = [
    { value: '', label: 'Select Bucket' },
    { value: 'bucket1a', label: 'Bucket 1A' },
    { value: 'bucket1b', label: 'Bucket 1B' },
    { value: 'bucket1c', label: 'Bucket 1C' },
    { value: 'bucket1d', label: 'Bucket 1D' },
    { value: 'bucket1e', label: 'Bucket 1E' },
    { value: 'bucket2', label: 'Bucket 2' },
    { value: 'bucket3', label: 'Bucket 3' }
  ];

  const addNewRow = () => {
    const newTrade = {
      date: new Date().toISOString().split('T')[0],
      investmentType: 'stock' as const,
      isin: '',
      name: '',
      transactionType: 'buy' as const,
      quantity: 0,
      buyRate: 0,
      brokerBank: '',
      bucketAllocation: ''
    };
    onAddTrade(newTrade);
  };

  // Removed inline editing functions - now using modal-based editing

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column as keyof typeof columnWidths]
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    
    const diff = e.clientX - resizing.startX;
    const newWidth = Math.max(60, resizing.startWidth + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizing.column]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  React.useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Sorting function
  const sortTrades = (trades: Trade[]) => {
    return [...trades].sort((a, b) => {
      let aValue: any = a[sortField as keyof Trade];
      let bValue: any = b[sortField as keyof Trade];
      
      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    console.log('Sorting field:', field, 'Current sortField:', sortField, 'Current direction:', sortDirection);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    console.log('New sortField:', field, 'New direction:', sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  // Checkbox selection functions
  const handleSelectAll = () => {
    console.log('Select all clicked. Current selected:', selectedTrades.size, 'Total trades:', trades.length);
    if (selectedTrades.size === trades.length) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(trades.map(t => t.id)));
    }
  };

  const handleSelectTrade = (tradeId: string) => {
    console.log('Select trade clicked:', tradeId, 'Currently selected:', selectedTrades.has(tradeId));
    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedTrades.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTrades.size} selected trade(s)?`)) {
      for (const tradeId of selectedTrades) {
        await onDeleteTrade(tradeId);
      }
      setSelectedTrades(new Set());
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await onDeleteTrade(tradeId);
    }
  };

  const handleBulkEdit = () => {
    if (selectedTrades.size === 1) {
      const tradeId = Array.from(selectedTrades)[0];
      const trade = trades.find(t => t.id === tradeId);
      if (trade) {
        setEditingTrade(trade);
      }
    }
  };

  const totals = trades.reduce((acc, trade) => {
    const amount = trade.buyAmount;
    if (trade.transactionType === 'buy') {
      return { buyAmount: acc.buyAmount + amount };
    } else {
      return { buyAmount: acc.buyAmount - amount }; // Subtract sell amounts
    }
  }, { buyAmount: 0 });

  const getBucketDisplayValue = (value: string) => {
    if (!value) return '';
    const bucket = bucketOptions.find(opt => opt.value === value);
    return bucket?.label || value;
  };

  const renderBucketCell = (trade: Trade) => {
    const readOnlyClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center";
    
    return (
      <div 
        className={readOnlyClass}
        style={{ width: columnWidths.bucketAllocation, height: 'auto' }}
      >
        {getBucketDisplayValue(trade.bucketAllocation)}
      </div>
    );
  };

  const renderCell = (trade: Trade, field: string, value: any, isEditable: boolean = true) => {
    const isMutualFund = trade.investmentType === 'mutual_fund';
    const readOnlyClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center";

    if (field === 'date') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {new Date(value).toLocaleDateString('en-GB')}
        </div>
      );
    }

    if (field === 'investmentType') {
      const typeLabel = investmentTypes.find(type => type.value === value)?.label || value;
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {typeLabel}
        </div>
      );
    }

    if (field === 'name') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          <span className={isMutualFund ? 'text-blue-600' : ''}>{value || ''}</span>
        </div>
      );
    }

    if (field === 'buyAmount') {
      const isSell = trade.transactionType === 'sell';
      const textColor = isSell ? 'text-red-600' : 'text-gray-900';
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          <span className={textColor}>{formatCurrency(value)}</span>
        </div>
      );
    }

    if (field === 'transactionType') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          <span className={`capitalize ${trade.transactionType === 'sell' ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </span>
        </div>
      );
    }

    if (field === 'interestRate') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {value ? `${value}%` : ''}
        </div>
      );
    }

    if (field === 'buyRate') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {formatCurrency(value)}
        </div>
      );
    }

    if (field === 'quantity') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {value.toFixed(2)}
        </div>
      );
    }

    // Default case for other fields
    return (
      <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
        {value || ''}
      </div>
    );
  };

  const renderHeaderCell = (label: string, field: string, sortable: boolean = false) => (
    <div 
      className="relative h-8 px-2 text-xs font-medium text-gray-700 bg-gray-100 border-r border-b border-gray-300 flex items-center"
      style={{ width: columnWidths[field as keyof typeof columnWidths] }}
    >
      <span 
        className={sortable ? 'cursor-pointer hover:text-blue-600 flex items-center gap-1' : ''}
        onClick={sortable ? (e) => {
          e.stopPropagation();
          handleSort(field);
        } : undefined}
      >
        {label}
        {sortable && sortField === field && (
          <span className="text-blue-600">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </span>
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
        onMouseDown={(e) => handleMouseDown(e, field)}
      />
    </div>
  );

  const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  return (
    <div className="p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-semibold text-gray-800">Portfolio Trades</h2>
          
          {/* Autosave Status */}
          {autosaveStatus !== 'idle' && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              autosaveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
              autosaveStatus === 'saved' ? 'bg-green-50 text-green-700' :
              autosaveStatus === 'error' ? 'bg-red-50 text-red-700' : ''
            }`}>
              {autosaveStatus === 'saving' && (
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              {autosaveStatus === 'saved' && (
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              )}
              {autosaveStatus === 'error' && (
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              )}
              <span className="font-medium">{autosaveMessage}</span>
              {pendingChanges.length > 0 && autosaveStatus === 'saving' && (
                <span className="text-xs opacity-75">({pendingChanges.length} pending)</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddInvestmentModal(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add New Investment
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
          >
            <Download size={10} />
            Export
          </button>
          
          <label className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors cursor-pointer">
            <Upload size={10} />
            Import
            <input
              type="file"
              accept=".xlsx"
              onChange={importData}
              className="hidden"
            />
          </label>
          
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors"
          >
            <FileText size={10} />
            Template
          </button>
          
          {selectedTrades.size > 0 && (
            <>
              {selectedTrades.size === 1 && (
                <button
                  onClick={handleBulkEdit}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  <Edit size={10} />
                  Edit Selected
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
              >
                <Trash2 size={10} />
                Delete Selected ({selectedTrades.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="mb-3 p-2 bg-blue-50 rounded text-xs border">
        <div className="flex gap-4">
          <div>
            <span className="font-medium text-xs">Net Investment: </span>
            <span className={`font-bold text-xs ${totals.buyAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totals.buyAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Excel-like Table with Frozen Header */}
      <div className="border border-gray-300 rounded overflow-hidden" style={{ maxHeight: '70vh' }} ref={tableRef}>
        <div style={{ width: `${tableWidth}px`, minWidth: '100%' }}>
          {/* Frozen Header */}
          <div className="sticky top-0 z-10 bg-white">
                      {/* Header */}
            <div className="flex bg-gray-100 border-b border-gray-300">
              <div className="h-8 px-2 text-xs font-medium text-gray-700 border-r border-gray-300 flex items-center justify-center bg-gray-100"
                   style={{ width: columnWidths.checkbox }}>
                <input
                  type="checkbox"
                  checked={selectedTrades.size === trades.length && trades.length > 0}
                  onChange={handleSelectAll}
                  className="w-3 h-3 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 checked:bg-blue-600 checked:border-blue-600"
                />
              </div>
              {renderHeaderCell('Date', 'date', true)}
              {renderHeaderCell('Investment Type', 'investmentType', true)}
              {renderHeaderCell('ISIN Number', 'isin')}
              {renderHeaderCell('Name', 'name', true)}
              {renderHeaderCell('Interest %', 'interestRate')}
              {renderHeaderCell('Buy/Sell', 'transactionType')}
              {renderHeaderCell('Quantity', 'quantity')}
              {renderHeaderCell('Buy Rate', 'buyRate')}
              {renderHeaderCell('Buy Amount', 'buyAmount')}
              {renderHeaderCell('Broker/Bank', 'brokerBank')}
              {renderHeaderCell('Bucket Allocation', 'bucketAllocation')}
            </div>

                      {/* Totals Row */}
            <div className="flex bg-blue-50 border-b border-gray-300">
              <div className="h-8 px-2 text-xs font-bold text-gray-700 border-r border-gray-300 flex items-center" 
                   style={{ width: columnWidths.checkbox }}>
              </div>
              <div className="h-8 px-2 text-xs font-bold text-gray-700 border-r border-gray-300 flex items-center" 
                   style={{ width: columnWidths.date + columnWidths.investmentType + columnWidths.isin + columnWidths.name + columnWidths.interestRate + columnWidths.transactionType + columnWidths.quantity + columnWidths.buyRate }}>
                TOTALS
              </div>
              <div className={`h-8 px-2 text-xs font-bold border-r border-gray-300 flex items-center ${totals.buyAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`} style={{ width: columnWidths.buyAmount }}>
                {formatCurrency(totals.buyAmount)}
              </div>
              <div className="h-8 px-2 text-xs border-r border-gray-300 flex items-center" style={{ width: columnWidths.brokerBank }}></div>
              <div className="h-8 px-2 text-xs border-r border-gray-300 flex items-center" style={{ width: columnWidths.bucketAllocation }}></div>
            </div>
          </div>

          {/* Scrollable Data Rows */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
            {/* Data Rows */}
          {sortTrades(trades).map((trade) => (
            <div 
              key={trade.id} 
              className="flex hover:bg-gray-50 relative group"
              onMouseEnter={() => setHoveredRow(trade.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center justify-center"
                   style={{ width: columnWidths.checkbox }}>
                <input
                  type="checkbox"
                  checked={selectedTrades.has(trade.id)}
                  onChange={() => handleSelectTrade(trade.id)}
                  className="w-3 h-3 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 checked:bg-blue-600 checked:border-blue-600"
                />
              </div>
              {renderCell(trade, 'date', trade.date)}
              {renderCell(trade, 'investmentType', trade.investmentType)}
              {renderCell(trade, 'isin', trade.isin || '')}
              {renderCell(trade, 'name', trade.name)}
              {renderCell(trade, 'interestRate', trade.interestRate || 0, ['bond', 'fixed_deposit'].includes(trade.investmentType))}
              {renderCell(trade, 'transactionType', trade.transactionType)}
              {renderCell(trade, 'quantity', trade.quantity)}
              {renderCell(trade, 'buyRate', trade.buyRate)}
              {renderCell(trade, 'buyAmount', trade.buyAmount, false)}
              {renderCell(trade, 'brokerBank', trade.brokerBank)}
              {renderBucketCell(trade)}
              
              {/* Hover Actions */}
              {hoveredRow === trade.id && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-lg px-2 py-1">
                  <button
                    onClick={() => handleEditTrade(trade)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteTrade(trade.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
      

      
      {/* Add Investment Modal */}
      <AddInvestmentModal
        isOpen={showAddInvestmentModal}
        onClose={() => setShowAddInvestmentModal(false)}
        onAddTrade={onAddTrade}
        existingTrades={trades}
      />
      
      {/* Edit Investment Modal */}
      <EditInvestmentModal
        isOpen={editingTrade !== null}
        onClose={() => setEditingTrade(null)}
        onUpdateTrade={onUpdateTrade}
        trade={editingTrade}
        existingTrades={trades}
      />
    </div>
  );
};

export default TradesTable;