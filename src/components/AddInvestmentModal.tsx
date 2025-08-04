import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ArrowLeft, TrendingUp, TrendingDown, Plus } from 'lucide-react';

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
}

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrade: (trade: Omit<any, 'id' | 'buyAmount'>) => void;
}

const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  isOpen,
  onClose,
  onAddTrade
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeData, setTradeData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    buyRate: '',
    transactionType: 'buy' as 'buy' | 'sell',
    brokerBank: '',
    bucketAllocation: 'bucket1a'
  });
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock investment data - in real app, this would come from API
  const mockInvestments: Investment[] = [
    {
      id: '1',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      type: 'stock',
      price: 175.50,
      change: 2.30,
      changePercent: 1.33,
      description: 'Technology company specializing in consumer electronics.',
      risk: 'Medium Risk'
    },
    {
      id: '2',
      name: 'Microsoft Corporation',
      symbol: 'MSFT',
      type: 'stock',
      price: 412.20,
      change: -5.80,
      changePercent: -1.39,
      description: 'Multinational technology corporation.',
      risk: 'Medium Risk'
    },
    {
      id: '3',
      name: 'Reliance Industries',
      symbol: 'RELI',
      type: 'stock',
      price: 2850.75,
      change: 45.20,
      changePercent: 1.61,
      description: 'Indian multinational conglomerate.',
      risk: 'Medium Risk'
    },
    {
      id: '4',
      name: 'HDFC Bank',
      symbol: 'HDFCBANK',
      type: 'stock',
      price: 1650.30,
      change: 12.50,
      changePercent: 0.76,
      description: 'Leading private sector bank in India.',
      risk: 'Medium Risk'
    },
    {
      id: '5',
      name: 'Axis Bluechip Fund',
      symbol: 'AXISBLUECHIP',
      type: 'mutual_fund',
      price: 45.67,
      change: 0.23,
      changePercent: 0.51,
      description: 'Large-cap equity mutual fund.',
      risk: 'Medium Risk'
    },
    {
      id: '6',
      name: 'SBI Gold ETF',
      symbol: 'SBIGOLD',
      type: 'etf',
      price: 52.40,
      change: -0.15,
      changePercent: -0.29,
      description: 'Gold exchange traded fund.',
      risk: 'Low Risk'
    },
    {
      id: '7',
      name: '24 Carat Gold',
      symbol: 'GOLD',
      type: 'gold',
      price: 6250.00,
      change: 25.00,
      changePercent: 0.40,
      description: 'Physical gold investment.',
      risk: 'Low Risk'
    },
    {
      id: '8',
      name: 'Silver',
      symbol: 'SILVER',
      type: 'silver',
      price: 75.50,
      change: -0.30,
      changePercent: -0.40,
      description: 'Physical silver investment.',
      risk: 'Medium Risk'
    },
    {
      id: '9',
      name: 'Government of India Bond',
      symbol: 'GOIBOND',
      type: 'bond',
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      description: 'Government securities with fixed interest.',
      risk: 'Low Risk'
    },
    {
      id: '10',
      name: 'Fixed Deposit',
      symbol: 'FD',
      type: 'fixed_deposit',
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      description: 'Bank fixed deposit with guaranteed returns.',
      risk: 'Low Risk'
    },
    {
      id: '11',
      name: 'National Pension System',
      symbol: 'NPS',
      type: 'nps',
      price: 100.00,
      change: 0.50,
      changePercent: 0.50,
      description: 'Government pension scheme.',
      risk: 'Medium Risk'
    },
    {
      id: '12',
      name: 'ICICI Prudential Technology Fund',
      symbol: 'ICICITECH',
      type: 'mutual_fund',
      price: 78.90,
      change: 1.20,
      changePercent: 1.54,
      description: 'Technology sector mutual fund.',
      risk: 'High Risk'
    },
    {
      id: '13',
      name: 'Tata Consultancy Services',
      symbol: 'TCS',
      type: 'stock',
      price: 3850.00,
      change: -45.00,
      changePercent: -1.15,
      description: 'IT services and consulting company.',
      risk: 'Medium Risk'
    }
  ];

  const filters = ['All', 'Stock', 'Mutual Fund', 'Gold', 'Silver', 'Bond', 'Fixed Deposit', 'NPS'];

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

  const filteredInvestments = mockInvestments.filter(investment => {
    const matchesSearch = investment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investment.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investment.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'All' || getTypeLabel(investment.type) === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleInvestmentSelect = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowTradeForm(true);
  };

  const handleAddTrade = () => {
    if (!selectedInvestment) return;

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
      interestRate: 0
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
      bucketAllocation: 'bucket1a'
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
                      onClick={() => setSelectedFilter(filter)}
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
                  <h2 className="text-lg font-semibold text-gray-900">All Investments</h2>
                  <p className="text-sm text-gray-600">{filteredInvestments.length} investments found</p>
                </div>

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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvestmentSelect(investment);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          + Add
                        </button>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1">{investment.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{investment.symbol}</p>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold text-gray-900">₹{investment.price.toLocaleString()}</span>
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
                      </div>

                      <p className="text-sm text-gray-600">{investment.description}</p>
                    </div>
                  ))}
                </div>

                {filteredInvestments.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No investments found</h3>
                    <p className="text-gray-600">Try adjusting your search or filters</p>
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
                      <p className="font-semibold text-gray-900">₹{selectedInvestment.price.toLocaleString()}</p>
                      <p className={`text-sm ${
                        selectedInvestment.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedInvestment.changePercent >= 0 ? '+' : ''}{selectedInvestment.changePercent.toFixed(2)}%
                      </p>
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
                        <option value="bucket1a">Bucket 1A</option>
                        <option value="bucket1b">Bucket 1B</option>
                        <option value="bucket1c">Bucket 1C</option>
                        <option value="bucket1d">Bucket 1D</option>
                        <option value="bucket1e">Bucket 1E</option>
                        <option value="bucket2">Bucket 2</option>
                        <option value="bucket3">Bucket 3</option>
                      </select>
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
                      disabled={!tradeData.quantity || !tradeData.buyRate}
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