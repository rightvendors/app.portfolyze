import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Holding } from '../types/portfolio';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getStockPriceService } from '../services/stockPriceService';

interface CurrentHoldingsTableProps {
  holdings: Holding[];
  onRefreshPrices?: () => void;
  isLoadingPrices?: boolean;
  isRefreshingPrices?: boolean;
  lastRefreshTime?: number;
}

// Tooltip component for large annual yield values
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-1">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

const CurrentHoldingsTable: React.FC<CurrentHoldingsTableProps> = ({ 
  holdings, 
  onRefreshPrices, 
  isLoadingPrices, 
  isRefreshingPrices = false,
  lastRefreshTime = 0 
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [snapshotHoldings, setSnapshotHoldings] = useState<Holding[]>([]);
  const [usingSnapshot, setUsingSnapshot] = useState<boolean>(false);
  const [columnWidths, setColumnWidths] = useState({
    name: 180,
    netQuantity: 120,
    averageBuyPrice: 140,
    investedAmount: 140,
    currentPrice: 120,
    currentValue: 140,
    gainLossAmount: 140,
    gainLossPercent: 120,
    annualYield: 120,
    xirr: 100
  });

  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Function to determine if a price is live (fetched from external sources)
  const isLivePrice = (holding: Holding): boolean => {
    // For mutual funds, check if there's any difference (even small) from buy price
    // For other investments, check if the current price is significantly different
    const priceDifference = Math.abs(holding.currentPrice - holding.averageBuyPrice);
    const priceRatio = priceDifference / holding.averageBuyPrice;
    
    // For mutual funds: any difference indicates live price
    // For others: more than 1% difference indicates live price
    const threshold = holding.name.toLowerCase().includes('fund') ? 0.001 : 0.01;
    
    return priceRatio > threshold && holding.currentPrice !== holding.averageBuyPrice;
  };

  const renderHeaderCell = (label: string, field: string) => (
    <div 
      className="relative h-10 px-3 text-xs font-semibold text-gray-700 bg-gray-100 border-r border-gray-300 flex items-center"
      style={{ width: columnWidths[field as keyof typeof columnWidths] }}
    >
      {label}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
        onMouseDown={(e) => handleMouseDown(e, field)}
      />
    </div>
  );

  // Choose data source for display: live holdings or cached snapshot (for instant first paint)
  const liveOrSnapshot = (holdings && holdings.length > 0) ? holdings : snapshotHoldings;

  const totals = useMemo(() => liveOrSnapshot.reduce((acc, holding) => ({
    investedAmount: acc.investedAmount + holding.investedAmount,
    currentValue: acc.currentValue + holding.currentValue,
    gainLossAmount: acc.gainLossAmount + holding.gainLossAmount,
    annualYield: acc.annualYield + (holding.annualYield * holding.investedAmount),
    xirr: acc.xirr + (holding.xirr * holding.investedAmount)
  }), { investedAmount: 0, currentValue: 0, gainLossAmount: 0, annualYield: 0, xirr: 0 }), [liveOrSnapshot]);

  const totalGainLossPercent = totals.investedAmount > 0 ? 
    (totals.gainLossAmount / totals.investedAmount) * 100 : 0;
  
  const averageAnnualYield = totals.investedAmount > 0 ? 
    totals.annualYield / totals.investedAmount : 0;
  
  const averageXIRR = totals.investedAmount > 0 ? 
    totals.xirr / totals.investedAmount : 0;

  const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
  const totalPages = Math.max(1, Math.ceil(liveOrSnapshot.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const pageHoldings = useMemo(() => liveOrSnapshot.slice(pageStart, pageStart + pageSize), [liveOrSnapshot, pageStart, pageSize]);

  // Persist last successful data to localStorage and hydrate on mount (SWR: stale-while-revalidate)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('holdingsSnapshot');
      if (saved) {
        const parsed = JSON.parse(saved) as { data: Holding[]; savedAt: number };
        if (parsed && Array.isArray(parsed.data)) {
          setSnapshotHoldings(parsed.data);
          setUsingSnapshot((holdings?.length || 0) === 0);
        }
      }
    } catch {}
    // Trigger background refresh immediately on mount if available
    if (onRefreshPrices) {
      try { onRefreshPrices(); } catch {}
    }
  }, []);

  React.useEffect(() => {
    // When fresh holdings arrive, save snapshot and stop using snapshot
    if (holdings && holdings.length > 0) {
      try {
        localStorage.setItem('holdingsSnapshot', JSON.stringify({ data: holdings, savedAt: Date.now() }));
      } catch {}
      if (usingSnapshot) setUsingSnapshot(false);
    }
  }, [holdings]);

  return (
    <div className="p-4 bg-white relative">
      {/* Loading overlay when refreshing prices */}
      {isRefreshingPrices && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Refreshing prices...</p>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-semibold text-gray-800">Current Holdings{usingSnapshot ? ' (cached)' : ''}</h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-600">
            {liveOrSnapshot.length} holdings
          </div>
          
          {onRefreshPrices && (
            <div className="flex items-center gap-2">
              {lastRefreshTime > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}
                  </span>
                  {/* Show cache status indicator */}
                  {(() => {
                    const now = Date.now();
                    const timeSinceRefresh = now - lastRefreshTime;
                    const isFresh = timeSinceRefresh < 10 * 60 * 1000; // 10 minutes
                    return (
                      <div className={`w-2 h-2 rounded-full ${isFresh ? 'bg-green-500' : 'bg-yellow-500'}`} 
                           title={isFresh ? 'Cache is fresh' : 'Cache may be stale'}>
                      </div>
                    );
                  })()}
                </div>
              )}
              <button
                onClick={onRefreshPrices}
                disabled={isRefreshingPrices}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  isRefreshingPrices
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <RefreshCw 
                  size={12} 
                  className={isRefreshingPrices ? 'animate-spin' : ''} 
                />
                {isRefreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="mb-3 p-2 bg-blue-50 rounded border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="font-medium text-gray-700 text-xs">Total Invested: </span>
            <span className="text-blue-600 font-bold text-xs">{formatCurrency(totals.investedAmount)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 text-xs">Current Value: </span>
            <span className="text-green-600 font-bold text-xs">{formatCurrency(totals.currentValue)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 text-xs">Total Gain/Loss: </span>
            <span className={`font-bold text-xs ${totals.gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.gainLossAmount)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 text-xs">Overall Return: </span>
            <span className={`font-bold text-xs ${totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(totalGainLossPercent)}
            </span>
          </div>
        </div>
        

      </div>

      {/* Excel-like Table */}
      <div className="border border-gray-300 rounded overflow-auto bg-white" style={{ maxHeight: '70vh' }} ref={tableRef}>
        <div style={{ width: `${tableWidth}px`, minWidth: '100%' }}>
          {/* Header */}
          <div className="flex bg-gray-100 border-b-2 border-gray-300 sticky top-0">
            {renderHeaderCell('Name', 'name')}
            {renderHeaderCell('Net Qty', 'netQuantity')}
            {renderHeaderCell('Avg Buy Price', 'averageBuyPrice')}
            {renderHeaderCell('Invested Amount', 'investedAmount')}
            {renderHeaderCell('Current Price', 'currentPrice')}
            {renderHeaderCell('Current Value', 'currentValue')}
            {renderHeaderCell('Gain/Loss ₹', 'gainLossAmount')}
            {renderHeaderCell('Gain/Loss %', 'gainLossPercent')}
            {renderHeaderCell('Annual Yield', 'annualYield')}
            {renderHeaderCell('XIRR', 'xirr')}
          </div>

          {/* Totals Row */}
          <div className="flex bg-blue-50 border-b-2 border-gray-300 sticky top-10">
            <div className="h-8 px-3 text-xs font-bold text-gray-700 border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.name + columnWidths.netQuantity + columnWidths.averageBuyPrice }}>
              TOTALS
            </div>
            <div className="h-8 px-3 text-xs font-bold text-blue-600 border-r border-gray-300 flex items-center justify-end" 
                 style={{ width: columnWidths.investedAmount }}>
              {formatCurrency(totals.investedAmount)}
            </div>
            <div className="h-8 px-3 text-xs border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.currentPrice }}>
            </div>
            <div className="h-8 px-3 text-xs font-bold text-green-600 border-r border-gray-300 flex items-center justify-end" 
                 style={{ width: columnWidths.currentValue }}>
              {formatCurrency(totals.currentValue)}
            </div>
            <div className={`h-8 px-3 text-xs font-bold border-r border-gray-300 flex items-center justify-end ${
              totals.gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ width: columnWidths.gainLossAmount }}>
              {formatCurrency(totals.gainLossAmount)}
            </div>
            <div className={`h-8 px-3 text-xs font-bold border-r border-gray-300 flex items-center justify-end ${
              totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ width: columnWidths.gainLossPercent }}>
              {formatPercent(totalGainLossPercent)}
            </div>
            <div className={`h-8 px-3 text-xs font-bold border-r border-gray-300 flex items-center justify-end ${
              averageAnnualYield >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ width: columnWidths.annualYield }}>
              {averageAnnualYield > 1000 ? (
                <Tooltip content={`${formatPercent(averageAnnualYield)}`}>
                  <span className="cursor-help">…</span>
                </Tooltip>
              ) : (
                formatPercent(averageAnnualYield)
              )}
            </div>
            <div className={`h-8 px-3 text-xs font-bold border-r border-gray-300 flex items-center justify-end ${
              averageXIRR >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ width: columnWidths.xirr }}>
              {averageXIRR > 1000 ? (
                <Tooltip content={`${formatPercent(averageXIRR)}`}>
                  <span className="cursor-help">…</span>
                </Tooltip>
              ) : (
                formatPercent(averageXIRR)
              )}
            </div>
          </div>

          {/* Data Rows */}
          {pageHoldings.map((holding, index) => (
            <div key={`${holding.name}-${index}`} className="flex hover:bg-gray-50 border-b border-gray-200">
              {/* Name */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center font-medium"
                   style={{ width: columnWidths.name, height: 'auto' }}>
                {holding.name}
              </div>
              
              {/* Net Quantity */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end"
                   style={{ width: columnWidths.netQuantity, height: 'auto' }}>
                {holding.netQuantity.toFixed(2)}
              </div>
              
              {/* Average Buy Price */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end"
                   style={{ width: columnWidths.averageBuyPrice, height: 'auto' }}>
                {formatCurrency(holding.averageBuyPrice)}
              </div>
              
              {/* Invested Amount */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end"
                   style={{ width: columnWidths.investedAmount, height: 'auto' }}>
                {formatCurrency(holding.investedAmount)}
              </div>
              
              {/* Current Price */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end ${
                isLivePrice(holding) ? 'text-blue-600 font-medium' : ''
              }`} style={{ width: columnWidths.currentPrice, height: 'auto' }}>
                {formatCurrency(holding.currentPrice)}
              </div>
              
              {/* Current Value */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end"
                   style={{ width: columnWidths.currentValue, height: 'auto' }}>
                {formatCurrency(holding.currentValue)}
              </div>
              
              {/* Gain/Loss Amount */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end font-medium ${
                holding.gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.gainLossAmount, height: 'auto' }}>
                <div className="flex items-center gap-1">
                  {holding.gainLossAmount >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatCurrency(holding.gainLossAmount)}
                </div>
              </div>
              
              {/* Gain/Loss Percent */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end font-medium ${
                holding.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.gainLossPercent, height: 'auto' }}>
                {formatPercent(holding.gainLossPercent)}
              </div>
              
              {/* Annual Yield */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end ${
                holding.annualYield >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.annualYield, height: 'auto' }}>
                {holding.annualYield > 1000 ? (
                  <Tooltip content={`${formatPercent(holding.annualYield)}`}>
                    <span className="cursor-help">…</span>
                  </Tooltip>
                ) : (
                  formatPercent(holding.annualYield)
                )}
              </div>
              
              {/* XIRR */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end ${
                holding.xirr >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.xirr, height: 'auto' }}>
                {formatPercent(holding.xirr)}
              </div>
            </div>
          ))}
          
          {liveOrSnapshot.length === 0 && (
            <div className="h-20 flex items-center justify-center text-gray-500 text-sm bg-gray-50">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">No holdings to display</p>
                <p className="text-xs text-gray-500">
                  Add trades with stock names in the Trades tab to see holdings here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-2 bg-white mt-2">
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span>
            {holdings.length === 0 ? '0' : `${pageStart + 1}-${Math.min(pageStart + pageSize, holdings.length)}`} of {holdings.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPageSafe === 1}
            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            « First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPageSafe - 1))}
            disabled={currentPageSafe === 1}
            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            ‹ Prev
          </button>
          <span className="px-2 text-xs text-gray-700">Page {currentPageSafe} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPageSafe + 1))}
            disabled={currentPageSafe === totalPages}
            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            Next ›
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPageSafe === totalPages}
            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            Last »
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrentHoldingsTable;