import React, { useState, useEffect } from 'react';
import { Trade } from '../types/portfolio';
import { X, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { getStockPriceService } from '../services/stockPriceService';
import { getMutualFundService } from '../services/mutualFundApi';
import { getGoldSilverPriceService } from '../services/goldPriceService';

interface EditInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
  trade: Trade | null;
  existingTrades: Trade[];
}

const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({
  isOpen,
  onClose,
  onUpdateTrade,
  trade,
  existingTrades
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeData, setTradeData] = useState({
    date: '',
    quantity: '',
    buyRate: '',
    transactionType: 'buy'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const stockService = getStockPriceService();
  const mutualFundService = getMutualFundService();
  const goldSilverService = getGoldSilverPriceService();

  const investmentTypes = [
    { value: 'stock', label: 'Stock' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
    { value: 'bond', label: 'Bond' },
    { value: 'fixed_deposit', label: 'Fixed Deposit' }
  ];

  const popularInvestments = [
    { name: 'Reliance Industries', type: 'stock', symbol: 'RELIANCE', currentPrice: 2450.50, change: 2.5 },
    { name: 'TCS', type: 'stock', symbol: 'TCS', currentPrice: 3850.75, change: -1.2 },
    { name: 'HDFC Bank', type: 'stock', symbol: 'HDFCBANK', currentPrice: 1650.25, change: 0.8 },
    { name: 'Axis Bluechip Fund', type: 'mutual_fund', symbol: 'AXISBLUECHIP', currentPrice: 45.20, change: 1.5 },
    { name: 'SBI Bluechip Fund', type: 'mutual_fund', symbol: 'SBIBLUECHIP', currentPrice: 52.80, change: -0.5 },
    { name: '24K Gold', type: 'gold', symbol: 'GOLD', currentPrice: 6250, change: 0.3 },
    { name: 'Silver', type: 'silver', symbol: 'SILVER', currentPrice: 75.50, change: -0.8 }
  ];

  useEffect(() => {
    if (isOpen && trade) {
      // Initialize with current trade data
      setTradeData({
        date: trade.date,
        quantity: trade.quantity.toString(),
        buyRate: trade.buyRate.toString(),
        transactionType: trade.transactionType
      });
      
      // Set selected investment based on current trade
      setSelectedInvestment({
        name: trade.name,
        type: trade.investmentType,
        symbol: trade.isin || trade.name,
        currentPrice: 0 // Will be fetched
      });
      
      setShowTradeForm(true);
      loadSuggestions();
    }
  }, [isOpen, trade]);

  const getTypeLabel = (type: string) => {
    return investmentTypes.find(t => t.value === type)?.label || type;
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'stock': return 'text-red-600';
      case 'mutual_fund': return 'text-blue-600';
      case 'gold': return 'text-yellow-600';
      case 'silver': return 'text-gray-600';
      case 'bond': return 'text-green-600';
      case 'fixed_deposit': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Your Portfolio': return '📊';
      case 'Popular': return '⭐';
      case 'Search Result': return '🔍';
      default: return '📈';
    }
  };

  const getSourceLabel = (source: string) => {
    return source;
  };

  const getExistingInvestments = () => {
    const uniqueInvestments = new Map();
    existingTrades.forEach(trade => {
      const key = `${trade.investmentType}-${trade.name}`;
      if (!uniqueInvestments.has(key)) {
        uniqueInvestments.set(key, {
          name: trade.name,
          type: trade.investmentType,
          symbol: trade.isin || trade.name,
          source: 'Your Portfolio'
        });
      }
    });
    return Array.from(uniqueInvestments.values());
  };

  const searchInvestments = async (query: string) => {
    if (!query.trim()) return [];

    setIsLoading(true);
    try {
      let results = [];

      // Search stocks
      const stockResults = await stockService.getStockSuggestions(query);
      results.push(...stockResults.map((stock: any) => ({
        ...stock,
        type: 'stock',
        source: 'Search Result'
      })));

      // Search mutual funds
      const fundResults = await mutualFundService.getFundSuggestions(query);
      results.push(...fundResults.map((fund: any) => ({
        ...fund,
        type: 'mutual_fund',
        source: 'Search Result'
      })));

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPrices = async (investments: any[]) => {
    const updatedInvestments = await Promise.all(
      investments.map(async (investment) => {
        try {
          let currentPrice = 0;
          let change = 0;

          switch (investment.type) {
            case 'stock':
              const stockPrice = await stockService.getCurrentPrice(investment.symbol);
              currentPrice = stockPrice.price;
              change = stockPrice.change || 0;
              break;
            case 'mutual_fund':
              const fundPrice = await mutualFundService.getCurrentNAV(investment.symbol);
              currentPrice = fundPrice.nav;
              change = fundPrice.change || 0;
              break;
            case 'gold':
              const goldPrice = await goldSilverService.getCurrentGoldPrice();
              currentPrice = goldPrice.price;
              change = goldPrice.change || 0;
              break;
            case 'silver':
              const silverPrice = await goldSilverService.getCurrentSilverPrice();
              currentPrice = silverPrice.price;
              change = silverPrice.change || 0;
              break;
          }

          return { ...investment, currentPrice, change };
        } catch (error) {
          console.error(`Error fetching price for ${investment.name}:`, error);
          return investment;
        }
      })
    );

    return updatedInvestments;
  };

  const loadSuggestions = async () => {
    const existing = getExistingInvestments();
    const popular = popularInvestments.map(inv => ({ ...inv, source: 'Popular' }));
    
    const allSuggestions = [...existing, ...popular];
    const withPrices = await fetchCurrentPrices(allSuggestions);
    setSuggestions(withPrices);
  };

  const performSearch = async () => {
    if (searchQuery.trim()) {
      await searchInvestments(searchQuery);
    } else {
      setSearchResults([]);
    }
  };

  const handleInvestmentSelect = (investment: any) => {
    setSelectedInvestment(investment);
    setShowTradeForm(true);
  };

  const handleSave = () => {
    if (!trade || !selectedInvestment) return;

    const updates: Partial<Trade> = {
      date: tradeData.date,
      quantity: parseFloat(tradeData.quantity),
      buyRate: parseFloat(tradeData.buyRate),
      transactionType: tradeData.transactionType as 'buy' | 'sell',
      name: selectedInvestment.name,
      investmentType: selectedInvestment.type,
      isin: selectedInvestment.type === 'mutual_fund' ? selectedInvestment.symbol : undefined
    };

    onUpdateTrade(trade.id, updates);
    onClose();
  };

  const filteredSuggestions = suggestions.filter(inv => {
    if (selectedFilter === 'all') return true;
    return inv.type === selectedFilter;
  });

  const displayResults = searchQuery.trim() ? searchResults : filteredSuggestions;

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Investment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Investment Selection */}
          <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Investment</h3>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search investments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[{ value: 'all', label: 'All' }, ...investmentTypes].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedFilter(type.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedFilter === type.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Investment Cards */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Searching...</p>
                </div>
              ) : (
                displayResults.map((investment, index) => (
                  <div
                    key={`${investment.name}-${index}`}
                    onClick={() => handleInvestmentSelect(investment)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{getSourceIcon(investment.source)}</span>
                          <span className="text-xs text-gray-500">{getSourceLabel(investment.source)}</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{investment.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${getRiskColor(investment.type)}`}>
                            {getTypeLabel(investment.type)}
                          </span>
                          {investment.symbol && (
                            <span className="text-xs text-gray-500">{investment.symbol}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {investment.currentPrice > 0 && (
                          <>
                            <div className="font-medium text-gray-900">
                              ₹{investment.currentPrice.toLocaleString()}
                            </div>
                            <div className={`flex items-center gap-1 text-xs ${
                              investment.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {investment.change >= 0 ? (
                                <TrendingUp size={12} />
                              ) : (
                                <TrendingDown size={12} />
                              )}
                              {Math.abs(investment.change).toFixed(2)}%
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Trade Form */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {showTradeForm && selectedInvestment ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Trade Details</h3>
                
                {/* Selected Investment Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900">{selectedInvestment.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${getRiskColor(selectedInvestment.type)}`}>
                      {getTypeLabel(selectedInvestment.type)}
                    </span>
                    {selectedInvestment.currentPrice > 0 && (
                      <span className="text-sm text-gray-600">
                        Current: ₹{selectedInvestment.currentPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Trade Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={tradeData.date}
                      onChange={(e) => setTradeData({ ...tradeData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                    <select
                      value={tradeData.transactionType}
                      onChange={(e) => setTradeData({ ...tradeData, transactionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeData.quantity}
                      onChange={(e) => setTradeData({ ...tradeData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeData.buyRate}
                      onChange={(e) => setTradeData({ ...tradeData, buyRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total Amount Display */}
                  {tradeData.quantity && tradeData.buyRate && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="text-lg font-semibold text-blue-900">
                        ₹{(parseFloat(tradeData.quantity) * parseFloat(tradeData.buyRate)).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Update Trade
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Select an investment to edit the trade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditInvestmentModal; 