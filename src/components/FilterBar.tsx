import React, { useState } from 'react';
import { FilterState } from '../types/portfolio';
import { Filter, Search } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterType: 'trades' | 'holdings' | 'summary';
  totalRecords?: number;
  filteredRecords?: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  filters, 
  onFiltersChange, 
  filterType,
  totalRecords = 0,
  filteredRecords = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const investmentTypes = [
    { value: '', label: 'All Types' },
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
    { value: '', label: 'All Buckets' },
    { value: 'bucket1a', label: 'Bucket 1A' },
    { value: 'bucket1b', label: 'Bucket 1B' },
    { value: 'bucket1c', label: 'Bucket 1C' },
    { value: 'bucket1d', label: 'Bucket 1D' },
    { value: 'bucket1e', label: 'Bucket 1E' },
    { value: 'bucket2', label: 'Bucket 2' },
    { value: 'bucket3', label: 'Bucket 3' }
  ];

  const transactionTypes = [
    { value: '', label: 'All Transactions' },
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header with Filters button and record count */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
        >
          <Filter size={14} className="text-orange-600" />
          Filters
        </button>
        
        {(filterType === 'trades' || filterType === 'holdings') && (
          <div className="text-xs text-gray-600">
            Showing {filteredRecords} of {totalRecords} records
          </div>
        )}
      </div>
      
      {/* Filter Controls */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="mt-4 space-y-4">
            {/* Search Bar - Full Width */}
            {(filterType === 'trades' || filterType === 'holdings') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={filterType === 'trades' ? "Search all fields..." : "Search holdings..."}
                    value={filters.search}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
            
            {/* Filter Dropdowns Grid */}
            <div className={`grid gap-4 ${
              filterType === 'trades' ? 'grid-cols-1 md:grid-cols-3' :
              filterType === 'holdings' ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-3'
            }`}>
              {/* Investment Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Investment Type</label>
                <select
                  value={filters.investmentType}
                  onChange={(e) => onFiltersChange({ ...filters, investmentType: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {investmentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Buckets */}
              {filterType !== 'summary' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Buckets</label>
                  <select
                    value={filters.buckets}
                    onChange={(e) => onFiltersChange({ ...filters, buckets: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {bucketOptions.map(bucket => (
                      <option key={bucket.value} value={bucket.value}>{bucket.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Transaction Type - Only for trades */}
              {filterType === 'trades' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={filters.transactionType}
                    onChange={(e) => onFiltersChange({ ...filters, transactionType: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {transactionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Date Filters - Only for summary */}
              {filterType === 'summary' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;