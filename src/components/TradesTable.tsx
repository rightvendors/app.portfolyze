import React, { useState, useRef } from 'react';
import { Trade } from '../types/portfolio';
import { Trash2, Plus, Download, Upload, Loader } from 'lucide-react';
import { getMutualFundService } from '../services/mutualFundApi';
import { getStockPriceService } from '../services/stockPriceService';
import { navService, MutualFundData } from '../services/navService';
import StockSuggestionDropdown from './StockSuggestionDropdown';

interface TradesTableProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'buyAmount'>) => void;
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  updatePriceCacheWithNAV?: (isin: string, nav: number) => void;
}

const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade,
  updatePriceCacheWithNAV
}) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isinLookupResult, setIsinLookupResult] = useState<{ schemeName: string; nav: number } | null>(null);
  const [isinError, setIsinError] = useState<string>('');
  const [isLoadingName, setIsLoadingName] = useState<{ [key: string]: boolean }>({});
  const [navData, setNavData] = useState<{ [key: string]: MutualFundData }>({});
  const [stockSuggestions, setStockSuggestions] = useState<{ [key: string]: { query: string; isVisible: boolean } }>({});
  const [columnWidths, setColumnWidths] = useState({
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
    bucketAllocation: 160,
    action: 80
  });

  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Handle ISIN input change
  const handleIsinInputChange = (value: string, tradeId: string) => {
    const upperValue = value.toUpperCase();
    setEditValue(value);
    
    // Auto-uppercase and lookup if 12 characters
    if (upperValue.length === 12) {
      lookupMutualFundByISINEnhanced(upperValue, tradeId);
    } else {
      setIsinLookupResult(null);
      setIsinError('');
    }
  };

  // Export data to JSON file
  const exportData = () => {
    const dataToExport = {
      trades,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-trades-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Test NAV service
  const testNavService = async () => {
    try {
      console.log('Testing NAV service from TradesTable...');
      await navService.testService();
    } catch (error) {
      console.error('Error testing NAV service:', error);
    }
  };

  // Import data from JSON file
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (importedData.trades && Array.isArray(importedData.trades)) {
          // Validate and import trades
          const validTrades = importedData.trades.filter((trade: any) => 
            trade.id && trade.date && trade.investmentType && trade.transactionType
          );
          
          if (validTrades.length > 0) {
            // Replace current trades with imported ones
            localStorage.setItem('portfolio_trades', JSON.stringify(validTrades));
            window.location.reload(); // Reload to apply changes
          } else {
            alert('No valid trades found in the imported file.');
          }
        } else {
          alert('Invalid file format. Please select a valid portfolio export file.');
        }
      } catch (error) {
        alert('Error reading file. Please ensure it\'s a valid JSON file.');
      }
    };
    
    reader.readAsText(file);
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

  const handleCellClick = (id: string, field: string, currentValue: any) => {
    if (field === 'buyAmount' || (field === 'name' && trades.find(t => t.id === id)?.investmentType === 'mutual_fund')) {
      return; // This is a calculated field
    }
    
    // Reset ISIN lookup state when editing ISIN
    if (field === 'isin') {
      setIsinLookupResult(null);
      setIsinError('');
    }
    
    setEditingCell({ id, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const { id, field } = editingCell;
    let value: any = editValue;
    
    // Convert to appropriate type
    if (['quantity', 'buyRate', 'sellRate', 'interestRate'].includes(field)) {
      value = parseFloat(editValue) || 0;
    } else if (field === 'isin') {
      value = editValue.toUpperCase();
    }
    
    onUpdateTrade(id, { [field]: value });
    setEditingCell(null);
    setEditValue('');
    
    // Clear ISIN lookup state when done editing
    if (field !== 'isin') {
      setIsinLookupResult(null);
      setIsinError('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
      setIsinLookupResult(null);
      setIsinError('');
    }
  };

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

  const totals = trades.reduce((acc, trade) => ({
    buyAmount: acc.buyAmount + trade.buyAmount
  }), { buyAmount: 0 });

  const getBucketDisplayValue = (value: string) => {
    if (!value) return '';
    const bucket = bucketOptions.find(opt => opt.value === value);
    return bucket?.label || value;
  };

  const renderBucketCell = (trade: Trade) => {
    const isEditing = editingCell?.id === trade.id && editingCell?.field === 'bucketAllocation';
    const cellClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white hover:bg-blue-50 cursor-pointer flex items-center";

    if (isEditing) {
      return (
        <div className="min-h-8 px-1 py-1 border-r border-b border-gray-300 bg-white" style={{ width: columnWidths.bucketAllocation, height: 'auto' }}>
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellSave}
            onKeyDown={handleKeyPress}
            className="w-full min-h-6 text-xs border-none outline-none bg-white"
            autoFocus
          >
            {bucketOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div 
        className={cellClass}
        style={{ width: columnWidths.bucketAllocation, height: 'auto' }}
        onClick={() => handleCellClick(trade.id, 'bucketAllocation', trade.bucketAllocation)}
      >
        {getBucketDisplayValue(trade.bucketAllocation)}
      </div>
    );
  };

  const renderCell = (trade: Trade, field: string, value: any, isEditable: boolean = true) => {
    const isEditing = editingCell?.id === trade.id && editingCell?.field === field;
    const cellClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white hover:bg-blue-50 cursor-pointer flex items-center";
    const readOnlyClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-gray-50 flex items-center";
    const disabledClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-gray-100 text-gray-400 flex items-center";

    if (!isEditable) {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          {field === 'buyAmount' ? formatCurrency(value) : value}
        </div>
      );
    }
    
    // Special handling for ISIN field
    if (field === 'isin' && trade.investmentType !== 'mutual_fund') {
      return (
        <div className={disabledClass} style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
          -
        </div>
      );
    }
    
    // Special handling for ISIN field when mutual fund is selected but field is not being edited
    if (field === 'isin' && trade.investmentType === 'mutual_fund' && !isEditing) {
      return (
        <div 
          className={cellClass}
          style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}
          onClick={() => handleCellClick(trade.id, field, value)}
        >
          {value || 'Click to enter ISIN'}
        </div>
      );
    }
    
    // Special handling for name field
    if (field === 'name') {
      const isLoading = isLoadingName[trade.id];
      const isMutualFund = trade.investmentType === 'mutual_fund';
      const isStock = trade.investmentType === 'stock';
      const suggestionData = stockSuggestions[trade.id];
      
      return (
        <div className="relative min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white hover:bg-blue-50 cursor-pointer flex items-center"
             style={{ width: columnWidths[field], height: 'auto' }}
             onClick={() => !isMutualFund && handleCellClick(trade.id, field, value)}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader className="w-3 h-3 animate-spin text-blue-500" />
              <span className="text-gray-500">Fetching...</span>
            </div>
          ) : (
            isEditing ? (
              <div className="relative w-full">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    if (isStock) {
                      handleStockNameInput(e.target.value, trade.id);
                    }
                  }}
                  onBlur={handleCellSave}
                  onKeyDown={handleKeyPress}
                  className="w-full min-h-6 text-xs border-none outline-none bg-white"
                  autoFocus
                />
                
                {/* Stock suggestions dropdown */}
                {isStock && suggestionData && (
                  <StockSuggestionDropdown
                    query={suggestionData.query}
                    isVisible={suggestionData.isVisible}
                    onSelect={(suggestion) => handleStockSuggestionSelect(trade.id, suggestion)}
                    onClose={() => closeStockSuggestions(trade.id)}
                  />
                )}
              </div>
            ) : (
              <span className={isMutualFund ? 'text-blue-600' : ''}>{value || ''}</span>
            )
          )}
        </div>
      );
    }

    if (isEditing) {
      if (field === 'investmentType') {
        return (
          <div className="min-h-8 px-1 py-1 border-r border-b border-gray-300 bg-white" style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className="w-full min-h-6 text-xs border-none outline-none bg-white"
              autoFocus
            >
              {investmentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        );
      } else if (field === 'transactionType') {
        return (
          <div className="min-h-8 px-1 py-1 border-r border-b border-gray-300 bg-white" style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className="w-full min-h-6 text-xs border-none outline-none bg-white"
              autoFocus
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        );
      } else {
        return (
          <div className="min-h-8 px-1 py-1 border-r border-b border-gray-300 bg-white" style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}>
            <div className="relative">
              <input
                ref={field === 'name' ? inputRef : undefined}
                type={['quantity', 'buyRate', 'sellRate', 'interestRate'].includes(field) ? 'number' : 
                      field === 'date' ? 'date' : 'text'}
                value={editValue}
                onChange={(e) => {
                  if (field === 'isin') {
                    handleIsinInputChange(e.target.value, editingCell?.id || '');
                  } else {
                    setEditValue(e.target.value);
                  }
                }}
                onBlur={() => {
                  handleCellSave();
                }}
                onKeyDown={handleKeyPress}
                className={`w-full min-h-6 text-xs border-none outline-none bg-white ${
                  field === 'isin' ? 'uppercase' : ''
                }`}
                autoFocus
                step={['quantity', 'buyRate', 'sellRate', 'interestRate'].includes(field) ? '0.01' : undefined}
                maxLength={field === 'isin' ? 12 : undefined}
                placeholder={field === 'isin' ? 'INF209KA12Z1' : undefined}
              />
              
              {/* ISIN lookup result */}
              {field === 'isin' && (isinLookupResult || isinError) && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-2">
                  {isinLookupResult && (
                    <div className="text-xs text-green-600">
                      <div className="font-medium">{isinLookupResult.schemeName}</div>
                      <div>NAV: ₹{isinLookupResult.nav}</div>
                    </div>
                  )}
                  {isinError && (
                    <div className="text-xs text-red-600">
                      {isinError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    return (
      <div 
        className={cellClass}
        style={{ width: columnWidths[field as keyof typeof columnWidths], height: 'auto' }}
        onClick={() => handleCellClick(trade.id, field, value)}
      >
        {field === 'investmentType' ? investmentTypes.find(t => t.value === value)?.label || value :
        field === 'date' ? new Date(value).toLocaleDateString('en-GB') :
         field === 'transactionType' ? 
         <span className={`px-1 py-0.5 rounded text-xs font-medium ${
           value === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
         }`}>
           {value.toUpperCase()}
         </span> :
         field === 'interestRate' && !['bond', 'fixed_deposit'].includes(trade.investmentType) ? '-' :
         field === 'interestRate' ? `${value.toFixed(2)}%` :
         ['quantity', 'buyRate'].includes(field) ? value.toFixed(2) :
         value}
      </div>
    );
  };

  const renderHeaderCell = (label: string, field: string) => (
    <div 
      className="relative h-8 px-2 text-xs font-medium text-gray-700 bg-gray-100 border-r border-b border-gray-300 flex items-center"
      style={{ width: columnWidths[field as keyof typeof columnWidths] }}
    >
      {label}
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
        <h2 className="text-xs font-semibold text-gray-800">Portfolio Trades</h2>
        <div className="flex items-center gap-2">
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
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
          
          <button
            onClick={addNewRow}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
          >
            <Plus size={10} />
            Add Row
          </button>
          
          <button
            onClick={testNavService}
            className="flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
          >
            Test NAV
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="mb-3 p-2 bg-blue-50 rounded text-xs border">
        <div className="flex gap-4">
          <div>
            <span className="font-medium text-xs">Total Investment: </span>
            <span className="text-blue-600 font-bold text-xs">{formatCurrency(totals.buyAmount)}</span>
          </div>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="border border-gray-300 rounded overflow-auto" style={{ maxHeight: '70vh' }} ref={tableRef}>
        <div style={{ width: `${tableWidth}px`, minWidth: '100%' }}>
          {/* Header */}
          <div className="flex bg-gray-100 border-b border-gray-300">
            {renderHeaderCell('Date', 'date')}
            {renderHeaderCell('Investment Type', 'investmentType')}
            {renderHeaderCell('ISIN Number', 'isin')}
            {renderHeaderCell('Name', 'name')}
            {renderHeaderCell('Interest %', 'interestRate')}
            {renderHeaderCell('Buy/Sell', 'transactionType')}
            {renderHeaderCell('Quantity', 'quantity')}
            {renderHeaderCell('Buy Rate', 'buyRate')}
            {renderHeaderCell('Buy Amount', 'buyAmount')}
            {renderHeaderCell('Broker/Bank', 'brokerBank')}
            {renderHeaderCell('Bucket Allocation', 'bucketAllocation')}
            {renderHeaderCell('Action', 'action')}
          </div>

          {/* Totals Row */}
          <div className="flex bg-blue-50 border-b border-gray-300">
            <div className="h-8 px-2 text-xs font-bold text-gray-700 border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.date + columnWidths.investmentType + columnWidths.isin + columnWidths.name + columnWidths.interestRate + columnWidths.transactionType + columnWidths.quantity + columnWidths.buyRate }}>
              TOTALS
            </div>
            <div className="h-8 px-2 text-xs font-bold text-blue-600 border-r border-gray-300 flex items-center" style={{ width: columnWidths.buyAmount }}>
              {formatCurrency(totals.buyAmount)}
            </div>
            <div className="h-8 px-2 text-xs border-r border-gray-300 flex items-center" style={{ width: columnWidths.brokerBank }}></div>
            <div className="h-8 px-2 text-xs border-r border-gray-300 flex items-center" style={{ width: columnWidths.bucketAllocation }}></div>
            <div className="h-8 px-2 text-xs border-r border-gray-300 flex items-center" style={{ width: columnWidths.action }}></div>
          </div>

          {/* Data Rows */}
          {trades.map((trade) => (
            <div key={trade.id} className="flex hover:bg-gray-50">
              {renderCell(trade, 'date', trade.date)}
              {renderCell(trade, 'investmentType', trade.investmentType)}
              {renderCell(trade, 'isin', trade.isin || '')}
              {renderCell(trade, 'name', trade.name)}
              {renderCell(trade, 'interestRate', trade.interestRate || 0, ['bond', 'fixed_deposit'].includes(trade.investmentType))}
              {renderCell(trade, 'transactionType', trade.transactionType)}
              <div className="min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white hover:bg-blue-50 cursor-pointer flex items-center justify-end"
                   style={{ width: columnWidths.quantity, height: 'auto' }}
                   onClick={() => handleCellClick(trade.id, 'quantity', trade.quantity)}>
                {editingCell?.id === trade.id && editingCell?.field === 'quantity' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleCellSave}
                    onKeyDown={handleKeyPress}
                    className="w-full min-h-6 text-xs border-none outline-none bg-white text-right"
                    autoFocus
                    step="0.01"
                  />
                ) : (
                  trade.quantity.toFixed(2)
                )}
              </div>
              <div className="min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white hover:bg-blue-50 cursor-pointer flex items-center justify-end"
                   style={{ width: columnWidths.buyRate, height: 'auto' }}
                   onClick={() => handleCellClick(trade.id, 'buyRate', trade.buyRate)}>
                {editingCell?.id === trade.id && editingCell?.field === 'buyRate' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleCellSave}
                    onKeyDown={handleKeyPress}
                    className="w-full min-h-6 text-xs border-none outline-none bg-white text-right"
                    autoFocus
                    step="0.01"
                  />
                ) : (
                  `₹${trade.buyRate.toFixed(2)}`
                )}
              </div>
              {renderCell(trade, 'buyAmount', trade.buyAmount, false)}
              {renderCell(trade, 'brokerBank', trade.brokerBank)}
              {renderBucketCell(trade)}
              <div className="min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center justify-center" style={{ width: columnWidths.action, height: 'auto' }}>
                <button
                  onClick={() => onDeleteTrade(trade.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* ISIN Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5">ℹ️</div>
          <div className="text-xs text-blue-800">
            <div className="font-medium mb-1">ISIN Number Instructions:</div>
            <div className="mb-2">
              Enter the 12-character ISIN number for mutual funds (e.g., INF209KA12Z1). 
              The scheme name will be auto-populated once a valid ISIN is entered.
            </div>
            <div className="mb-2">
              <div className="font-medium mb-1">How to find your ISIN number:</div>
              <div className="mb-1">
                Use our simple lookup page to search for ISIN numbers by mutual fund name.
              </div>
              <div className="mb-2">
                All ISIN codes are listed with their corresponding schemes for your convenience.
              </div>
              <div className="mb-2">
                <a 
                  href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRxCnHMu-PJUT_yp_rOfESXJ-mf7wDu0kEhEcWqAOWF0er8zEEEp3AabmRy-1yJIT2d8h-2nSckaNiU/pubhtml?gid=634852302&single=true" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View Mutual Fund ISIN Numbers
                </a>
              </div>
            </div>
            <div>
              If you prefer, you can still use the official resource:
              <a 
                href="https://www.amfiindia.com/net-asset-value/nav-search" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                AMFI NAV Search (Official)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradesTable;