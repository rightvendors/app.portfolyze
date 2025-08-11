import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ArrowLeft, TrendingUp, TrendingDown, Plus, Clock, Star } from 'lucide-react';
import { Trade } from '../types/portfolio';
import { useOptimizedSearch, SearchResult } from '../hooks/useOptimizedSearch';

interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'nps' | 'etf';
  price: number;
  change: number;
  changePercent: number;
  description: string;
  risk: 'Low Risk' | 'Medium Risk' | 'High Risk';
  source: 'existing' | 'popular' | 'search' | 'cached';
}

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrade: (trade: Omit<any, 'id' | 'buyAmount'>) => void;
  existingTrades: Trade[];
}

const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  isOpen,
  onClose,
  onAddTrade,
  existingTrades
}) => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeData, setTradeData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    buyRate: '',
    transactionType: 'buy' as 'buy' | 'sell',
    brokerBank: '',
    bucketAllocation: '',
    interestRate: ''
  });
  const [suggestions, setSuggestions] = useState<Investment[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Optimized search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults: optimizedSearchResults,
    isLoading,
    getSuggestions,
    clearSearch
  } = useOptimizedSearch();

  // Popular Indian market investments
  const popularInvestments: Investment[] = [
    {
      id: 'reliance',
      name: 'Reliance Industries',
      symbol: 'RELIANCE',
      type: 'stock',
      price: 2850.75,
      change: 45.20,
      changePercent: 1.61,
      description: 'Indian multinational conglomerate',
      risk: 'Medium Risk',
      source: 'popular'
    },
    {
      id: 'tcs',
      name: 'Tata Consultancy Services',
      symbol: 'TCS',
      type: 'stock',
      price: 3850.00,
      change: -45.00,
      changePercent: -1.15,
      description: 'IT services and consulting company',
      risk: 'Medium Risk',
      source: 'popular'
    },
    {
      id: 'hdfc-bank',
      name: 'HDFC Bank',
      symbol: 'HDFCBANK',
      type: 'stock',
      price: 1650.30,
      change: 12.50,
      changePercent: 0.76,
      description: 'Leading private sector bank in India',
      risk: 'Medium Risk',
      source: 'popular'
    },
    {
      id: 'infosys',
      name: 'Infosys',
      symbol: 'INFY',
      type: 'stock',
      price: 1450.80,
      change: 25.30,
      changePercent: 1.78,
      description: 'Global technology consulting company',
      risk: 'Medium Risk',
      source: 'popular'
    },
    {
      id: 'axis-bluechip',
      name: 'Axis Bluechip Fund',
      symbol: 'AXISBLUECHIP',
      type: 'mutual_fund',
      price: 45.67,
      change: 0.23,
      changePercent: 0.51,
      description: 'Large-cap equity mutual fund',
      risk: 'Medium Risk',
      source: 'popular'
    },
    {
      id: 'sbi-gold-etf',
      name: 'SBI Gold ETF',
      symbol: 'SBIGOLD',
      type: 'etf',
      price: 52.40,
      change: -0.15,
      changePercent: -0.29,
      description: 'Gold exchange traded fund',
      risk: 'Low Risk',
      source: 'popular'
    },
    {
      id: 'gold-physical',
      name: '24 Carat Gold',
      symbol: 'GOLD',
      type: 'gold',
      price: 6250.00,
      change: 25.00,
      changePercent: 0.40,
      description: 'Physical gold investment',
      risk: 'Low Risk',
      source: 'popular'
    },
    {
      id: 'silver-physical',
      name: 'Silver',
      symbol: 'SILVER',
      type: 'silver',
      price: 75.50,
      change: -0.30,
      changePercent: -0.40,
      description: 'Physical silver investment',
      risk: 'Medium Risk',
      source: 'popular'
    }
  ];

  const filters = ['All', 'Stock', 'Mutual Fund', 'Gold', 'Silver', 'Bond', 'Fixed Deposit', 'NPS', 'ETF'];

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'stock': 'Stock',
      'mutual_fund': 'Mutual Fund',
      'bond': 'Bond',
      'fixed_deposit': 'Fixed Deposit',
      'gold': 'Gold',
      'silver': 'Silver',
      'nps': 'NPS',
      'etf': 'ETF'
    };
    return typeMap[type] || type;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low Risk': return 'bg-green-100 text-green-800';
      case 'Medium Risk': return 'bg-yellow-100 text-yellow-800';
      case 'High Risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'existing': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'popular': return <Star className="w-4 h-4 text-yellow-600" />;
      case 'search': return <Search className="w-4 h-4 text-green-600" />;
      case 'cached': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default: return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'existing': return 'Your Portfolio';
      case 'popular': return 'Popular';
      case 'search': return 'Search Result';
      case 'cached': return 'Live Data';
      default: return '';
    }
  };

  // Extract unique investments from existing trades
  const getExistingInvestments = (): Investment[] => {
    const uniqueInvestments = new Map<string, Investment>();
    
    existingTrades.forEach(trade => {
      const key = `${trade.investmentType}-${trade.name}-${trade.isin}`;
      if (!uniqueInvestments.has(key)) {
        uniqueInvestments.set(key, {
          id: key,
          name: trade.name,
          symbol: trade.isin || trade.name,
          type: trade.investmentType,
          price: trade.buyRate,
          change: 0,
          changePercent: 0,
          description: `${getTypeLabel(trade.investmentType)} from your portfolio`,
          risk: 'Medium Risk',
          source: 'existing'
        });
      }
    });

    return Array.from(uniqueInvestments.values());
  };



  // Load suggestions on component mount
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, existingTrades]);

  const loadSuggestions = async () => {
    try {
      const existingInvestments = getExistingInvestments();
      const cachedSuggestions = await getSuggestions();
      
      // Convert SearchResult to Investment format
      const convertedSuggestions: Investment[] = cachedSuggestions.map(result => ({
        id: result.id,
        name: result.name,
        symbol: result.symbol,
        type: result.type,
        price: result.price,
        change: result.change,
        changePercent: result.changePercent,
        description: result.description,
        risk: result.risk,
        source: result.source
      }));
      
      const allSuggestions = [...existingInvestments, ...convertedSuggestions];
      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  // Apply filter to suggestions
  const getFilteredSuggestions = () => {
    if (selectedFilter === 'All') {
      return suggestions;
    }
    
    const filterMap: { [key: string]: string } = {
      'Stock': 'stock',
      'Mutual Fund': 'mutual_fund',
      'Gold': 'gold',
      'Silver': 'silver',
      'Bond': 'bond',
      'Fixed Deposit': 'fixed_deposit',
      'NPS': 'nps',
      'ETF': 'etf'
    };
    
    const filterType = filterMap[selectedFilter];
    if (!filterType) return suggestions;
    
    return suggestions.filter(investment => investment.type === filterType);
  };

  const filteredInvestments = searchQuery.length >= 2 ? 
    optimizedSearchResults.map(result => ({
      id: result.id,
      name: result.name,
      symbol: result.symbol,
      type: result.type,
      price: result.price,
      change: result.change,
      changePercent: result.changePercent,
      description: result.description,
      risk: result.risk,
      source: result.source
    })) : getFilteredSuggestions();

  const handleInvestmentSelect = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowTradeForm(true);
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    
    // For Bond, Fixed deposit, NPS, ETF - directly show trade form
    if (['Bond', 'Fixed Deposit', 'NPS', 'ETF'].includes(filter)) {
      // Create a placeholder investment for the selected type
      const typeMap: { [key: string]: string } = {
        'Bond': 'bond',
        'Fixed Deposit': 'fixed_deposit',
        'NPS': 'nps',
        'ETF': 'etf'
      };
      
      const placeholderInvestment: Investment = {
        id: `placeholder-${typeMap[filter]}`,
        name: `New ${filter}`,
        symbol: '',
        type: typeMap[filter] as 'bond' | 'fixed_deposit' | 'nps' | 'etf',
        price: 0,
        change: 0,
        changePercent: 0,
        description: `Add new ${filter.toLowerCase()} investment`,
        risk: 'Medium Risk',
        source: 'search'
      };
      
      setSelectedInvestment(placeholderInvestment);
      setShowTradeForm(true);
    }
  };

  const handleAddTrade = () => {
    if (!selectedInvestment) return;

    // Validate that mutual funds have an ISIN
    if (selectedInvestment.type === 'mutual_fund' && !selectedInvestment.symbol) {
      alert('Error: Mutual fund must have an ISIN number. Please select a valid mutual fund from the suggestions.');
      return;
    }

    const newTrade = {
      date: tradeData.date,
      investmentType: selectedInvestment.type,
      name: selectedInvestment.name,
      isin: selectedInvestment.symbol,
      transactionType: tradeData.transactionType,
      quantity: parseFloat(tradeData.quantity) || 0,
      buyRate: parseFloat(tradeData.buyRate) || 0,
      buyAmount: (parseFloat(tradeData.quantity) || 0) * (parseFloat(tradeData.buyRate) || 0),
      brokerBank: tradeData.brokerBank,
      bucketAllocation: tradeData.bucketAllocation,
      interestRate: parseFloat(tradeData.interestRate) || 0
    };

    onAddTrade(newTrade);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSelectedInvestment(null);
    setShowTradeForm(false);
    setTradeData({
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      buyRate: '',
      transactionType: 'buy',
      brokerBank: '',
      bucketAllocation: 'bucket1a',
      interestRate: ''
    });
  };

  const handleBack = () => {
    if (showTradeForm) {
      setShowTradeForm(false);
      setSelectedInvestment(null);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Add New Investment</h1>
              <p className="text-sm text-gray-600">Search and add investments to your portfolio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-6 py-3 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">
              {showTradeForm ? 'Back to Search' : 'Back to Portfolio'}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {!showTradeForm ? (
            /* Search and Investment List */
            <div className="h-full flex flex-col">
              {/* Search Bar */}
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search stocks, mutual funds, bonds, and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex gap-2 overflow-x-auto">
                                     {filters.map((filter) => (
                     <button
                       key={filter}
                       onClick={() => handleFilterSelect(filter)}
                       className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                         selectedFilter === filter
                           ? 'bg-blue-600 text-white'
                           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                       }`}
                     >
                       {filter}
                     </button>
                   ))}
                </div>
              </div>

              {/* Investment List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {searchQuery.length >= 2 ? 'Search Results' : 'Suggested Investments'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isLoading ? 'Loading...' : `${filteredInvestments.length} investments found`}
                  </p>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading investments...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInvestments.map((investment) => (
                      <div
                        key={investment.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {getTypeLabel(investment.type)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(investment.risk)}`}>
                              {investment.risk}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getSourceIcon(investment.source)}
                            <span className="text-xs text-gray-500">{getSourceLabel(investment.source)}</span>
                          </div>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-1">{investment.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{investment.symbol}</p>
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold text-gray-900">
                            ₹{investment.price > 0 ? investment.price.toLocaleString() : 'N/A'}
                          </span>
                          {investment.changePercent !== 0 && (
                            <div className={`flex items-center gap-1 text-sm ${
                              investment.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {investment.changePercent >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {investment.changePercent >= 0 ? '+' : ''}{investment.changePercent.toFixed(2)}%
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{investment.description}</p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvestmentSelect(investment);
                          }}
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          + Add Investment
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && filteredInvestments.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No investments found</h3>
                    <p className="text-gray-600">
                      {searchQuery.length >= 2 
                        ? 'Try adjusting your search terms' 
                        : 'Start typing to search for investments'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Trade Form */
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Add Trade</h2>
                {selectedInvestment && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{selectedInvestment.name}</h3>
                      <p className="text-sm text-gray-600">{selectedInvestment.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{selectedInvestment.price > 0 ? selectedInvestment.price.toLocaleString() : 'N/A'}
                      </p>
                      {selectedInvestment.changePercent !== 0 && (
                        <p className={`text-sm ${
                          selectedInvestment.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedInvestment.changePercent >= 0 ? '+' : ''}{selectedInvestment.changePercent.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                       <input
                         type="date"
                         value={tradeData.date}
                         onChange={(e) => setTradeData({ ...tradeData, date: e.target.value })}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Investment Name</label>
                       <input
                         type="text"
                         value={selectedInvestment?.name || ''}
                         onChange={(e) => {
                           if (selectedInvestment) {
                             setSelectedInvestment({
                               ...selectedInvestment,
                               name: e.target.value
                             });
                           }
                         }}
                         placeholder="Enter investment name"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       />
                     </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                      <select
                        value={tradeData.transactionType}
                        onChange={(e) => setTradeData({ ...tradeData, transactionType: e.target.value as 'buy' | 'sell' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeData.quantity}
                        onChange={(e) => setTradeData({ ...tradeData, quantity: e.target.value })}
                        placeholder="Enter quantity"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price per Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeData.buyRate}
                        onChange={(e) => setTradeData({ ...tradeData, buyRate: e.target.value })}
                        placeholder="Enter price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Broker/Bank</label>
                      <input
                        type="text"
                        value={tradeData.brokerBank}
                        onChange={(e) => setTradeData({ ...tradeData, brokerBank: e.target.value })}
                        placeholder="Enter broker or bank name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Allocation</label>
                      <select
                        value={tradeData.bucketAllocation}
                        onChange={(e) => setTradeData({ ...tradeData, bucketAllocation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">No Allocation</option>
                        <option value="bucket1a">Bucket 1A</option>
                        <option value="bucket1b">Bucket 1B</option>
                        <option value="bucket1c">Bucket 1C</option>
                        <option value="bucket1d">Bucket 1D</option>
                        <option value="bucket1e">Bucket 1E</option>
                        <option value="bucket2">Bucket 2</option>
                        <option value="bucket3">Bucket 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interest Rate %
                        {['bond', 'fixed_deposit', 'nps', 'etf'].includes(selectedInvestment?.type || '') && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeData.interestRate}
                        onChange={(e) => setTradeData({ ...tradeData, interestRate: e.target.value })}
                        placeholder="Enter interest rate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Total Amount Display */}
                  {tradeData.quantity && tradeData.buyRate && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                        <span className="text-lg font-bold text-blue-600">
                          ₹{(parseFloat(tradeData.quantity) * parseFloat(tradeData.buyRate)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <button
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                                         <button
                       onClick={handleAddTrade}
                       disabled={
                         !tradeData.quantity || 
                         !tradeData.buyRate || 
                         !selectedInvestment?.name ||
                         (['bond', 'fixed_deposit', 'nps', 'etf'].includes(selectedInvestment?.type || '') && !tradeData.interestRate)
                       }
                       className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                     >
                       Add Trade
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddInvestmentModal; 