import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Trade } from '../types/portfolio';
import { Trash2, Plus, Download, Upload, FileText, Edit } from 'lucide-react';
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
  // State management
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 40,
    date: 120,
    investmentType: 140,
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
  const tableRef = useRef<HTMLDivElement>(null);

  // Investment types for display
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
    { value: 'bucket1a', label: 'Bucket 1A' },
    { value: 'bucket1b', label: 'Bucket 1B' },
    { value: 'bucket1c', label: 'Bucket 1C' },
    { value: 'bucket1d', label: 'Bucket 1D' },
    { value: 'bucket1e', label: 'Bucket 1E' },
    { value: 'bucket2', label: 'Bucket 2' },
    { value: 'bucket3', label: 'Bucket 3' }
  ];

  // Column resizing handlers
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
    const newWidth = Math.max(80, resizing.startWidth + diff);
    
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

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBucketDisplayValue = (value: string) => {
    if (!value) return '';
    const bucket = bucketOptions.find(opt => opt.value === value);
    return bucket?.label || value;
  };

  // Sorting function
  const sortTrades = useCallback((trades: Trade[]) => {
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
  }, [sortField, sortDirection]);

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox selection functions
  const handleSelectAll = () => {
    if (selectedTrades.size === trades.length && trades.length > 0) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(trades.map(t => t.id)));
    }
  };

  const handleSelectTrade = (tradeId: string) => {
    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  // Clear selected trades when trades array changes (only if trades are actually removed)
  useEffect(() => {
    const currentTradeIds = new Set(trades.map(t => t.id));
    const validSelectedIds = Array.from(selectedTrades).filter(id => currentTradeIds.has(id));
    
    // Only update if we actually lost some selected trades
    if (validSelectedIds.length < selectedTrades.size) {
      setSelectedTrades(new Set(validSelectedIds));
    }
  }, [trades]);

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedTrades.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTrades.size} selected trade(s)?`)) {
      for (const tradeId of selectedTrades) {
        await onDeleteTrade(tradeId);
      }
      setSelectedTrades(new Set());
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

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await onDeleteTrade(tradeId);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return trades.reduce((acc, trade) => {
      const amount = trade.buyAmount;
      if (trade.transactionType === 'buy') {
        return { buyAmount: acc.buyAmount + amount };
      } else {
        return { buyAmount: acc.buyAmount - amount };
      }
    }, { buyAmount: 0 });
  }, [trades]);

  // Export functionality
  const exportData = () => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio Trades');
    const fileName = `portfolio-trades-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Template download
  const downloadTemplate = () => {
    const templateData = [
      {
        'Date': '01-01-2024',
        'Investment Type': 'Stock',
        'ISIN Number': '',
        'Name': 'Example Stock',
        'Interest %': '',
        'Buy/Sell': 'BUY',
        'Quantity': 100,
        'Buy Rate': 1000,
        'Buy Amount': 100000,
        'Broker/Bank': 'Example Broker',
        'Bucket Allocation': 'Bucket 1A'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    const colWidths = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'portfolio-trades-template.xlsx');
  };

  // Import functionality
  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        cellDates: true, 
        raw: false, 
        dateNF: 'yyyy-mm-dd' 
      });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const validTrades: any[] = [];
      
      for (const row of jsonData) {
        const rowData = row as any;
        
        // Enhanced date parsing
        let dateValue = rowData['Date'];
        if (dateValue) {
          if (typeof dateValue === 'number') {
            // Excel numeric date
            const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
            dateValue = excelDate.toISOString().split('T')[0];
          } else if (dateValue instanceof Date) {
            // JavaScript Date object
            dateValue = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string') {
            // String date - try multiple formats
            const dateStr = dateValue.toString();
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  // yyyy-mm-dd format
                  dateValue = dateStr;
                } else {
                  // dd-mm-yyyy format
                  dateValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
            } else if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  // yyyy/mm/dd format
                  dateValue = dateStr.replace(/\//g, '-');
                } else {
                  // dd/mm/yyyy format
                  dateValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
            }
          }
        }

        // Transaction type mapping
        const transactionTypeMap: { [key: string]: string } = {
          'BUY': 'buy', 'SELL': 'sell', 'Buy': 'buy', 'Sell': 'sell',
          'buy': 'buy', 'sell': 'sell'
        };

        const tradeData = {
          date: dateValue || new Date().toISOString().split('T')[0],
          investmentType: rowData['Investment Type']?.toLowerCase().replace(/\s+/g, '_') || 'stock',
          isin: rowData['ISIN Number'] || '',
          name: rowData['Name'] || '',
          interestRate: parseFloat(rowData['Interest %']) || 0,
          transactionType: transactionTypeMap[rowData['Buy/Sell']] || 'buy',
          quantity: parseFloat(rowData['Quantity']) || 0,
          buyRate: parseFloat(rowData['Buy Rate']) || 0,
          brokerBank: rowData['Broker/Bank'] || '',
          bucketAllocation: rowData['Bucket Allocation'] || 'bucket1a'
        };

        if (tradeData.name && tradeData.quantity > 0 && tradeData.buyRate > 0) {
          validTrades.push(tradeData);
        }
      }

      if (validTrades.length > 0) {
        let successfulImports = 0;
        for (const tradeData of validTrades) {
          try {
            await onAddTrade(tradeData);
            successfulImports++;
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error('Error importing trade:', error);
          }
        }
        
        if (successfulImports > 0) {
          alert(`Successfully imported ${successfulImports} out of ${validTrades.length} trades!`);
        } else {
          alert('Failed to import any trades. Please check the data format and try again.');
        }
      } else {
        alert('No valid trades found in the file. Please check the data format.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing file. Please check the file format and try again.');
    }

    // Reset file input
    event.target.value = '';
  };

  // Render functions
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
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
        onMouseDown={(e) => handleMouseDown(e, field)}
      />
    </div>
  );

  const renderCell = (trade: Trade, field: string, value: any) => {
    const readOnlyClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center";

    if (field === 'date') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          {new Date(value).toLocaleDateString('en-GB')}
        </div>
      );
    }

    if (field === 'investmentType') {
      const typeLabel = investmentTypes.find(type => type.value === value)?.label || value;
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          {typeLabel}
        </div>
      );
    }

    if (field === 'name') {
      const isMutualFund = trade.investmentType === 'mutual_fund';
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          <span className={isMutualFund ? 'text-blue-600' : ''}>{value || ''}</span>
        </div>
      );
    }

    if (field === 'buyAmount') {
      const isSell = trade.transactionType === 'sell';
      const textColor = isSell ? 'text-red-600' : 'text-gray-900';
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          <span className={textColor}>{formatCurrency(value)}</span>
        </div>
      );
    }

    if (field === 'transactionType') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          <span className={`capitalize ${trade.transactionType === 'sell' ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </span>
        </div>
      );
    }

    if (field === 'interestRate') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          {value ? `${value}%` : ''}
        </div>
      );
    }

    if (field === 'buyRate') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          {formatCurrency(value)}
        </div>
      );
    }

    if (field === 'quantity') {
      return (
        <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
          {value.toFixed(2)}
        </div>
      );
    }

    // Default case for other fields
    return (
      <div className={readOnlyClass} style={{ width: columnWidths[field as keyof typeof columnWidths] }}>
        {value || ''}
      </div>
    );
  };

  const renderBucketCell = (trade: Trade) => {
    const readOnlyClass = "min-h-8 px-2 py-1 text-xs border-r border-b border-gray-300 bg-white flex items-center";
    
    return (
      <div 
        className={readOnlyClass}
        style={{ width: columnWidths.bucketAllocation }}
      >
        {getBucketDisplayValue(trade.bucketAllocation)}
      </div>
    );
  };

  const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  return (
    <div className="p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-semibold text-gray-800">Portfolio Trades</h2>
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
                   style={{ width: columnWidths.date + columnWidths.investmentType + columnWidths.name + columnWidths.interestRate + columnWidths.transactionType + columnWidths.quantity + columnWidths.buyRate }}>
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
            {sortTrades(trades).map((trade: Trade) => (
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
                {renderCell(trade, 'name', trade.name)}
                {renderCell(trade, 'interestRate', trade.interestRate || 0)}
                {renderCell(trade, 'transactionType', trade.transactionType)}
                {renderCell(trade, 'quantity', trade.quantity)}
                {renderCell(trade, 'buyRate', trade.buyRate)}
                {renderCell(trade, 'buyAmount', trade.buyAmount)}
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