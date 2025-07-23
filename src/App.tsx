import React, { useState } from 'react';
import { useFirestorePortfolio } from './hooks/useFirestorePortfolio';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import Footer from './components/Footer';
import TradesTable from './components/TradesTable';
import CurrentHoldingsTable from './components/CurrentHoldingsTable';
import InvestmentBucketsTable from './components/InvestmentBucketsTable';
import FilterBar from './components/FilterBar';
import { FileText, TrendingUp, Target } from 'lucide-react';

function App() {
  const { user } = useFirebaseAuth();
  const {
    trades,
    filteredTrades,
    holdings,
    buckets,
    filters,
    loading,
    error,
    isLoadingPrices,
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateBucketTarget,
    updateBucketPurpose,
    updateAllPrices
  } = useFirestorePortfolio();

  const [activeTab, setActiveTab] = useState<'trades' | 'holdings' | 'buckets'>('trades');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showAuthButtons={false} />

        <div className="flex-1">
          {/* App Title */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-600" size={32} />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Portfolio Manager</h1>
                    <p className="text-xs text-gray-600">Indian Financial Portfolio Tracker</p>
                  </div>
                </div>
                {user && (
                  <div className="text-sm text-gray-600">
                    Welcome, {user.displayName || user.phoneNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs ${
                    activeTab === 'trades'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText size={12} />
                  Trades
                </button>
                <button
                  onClick={() => setActiveTab('holdings')}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs ${
                    activeTab === 'holdings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp size={12} />
                  Current Holdings
                </button>
                <button
                  onClick={() => setActiveTab('buckets')}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs ${
                    activeTab === 'buckets'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Target size={12} />
                  Investment Buckets
                </button>
              </div>
            </div>
          </nav>

          {/* Filters */}
          {activeTab === 'trades' && (
            <FilterBar
              filters={filters}
              onFiltersChange={setFilters}
              filterType="trades"
              totalRecords={trades.length}
              filteredRecords={filteredTrades.length}
            />
          )}
          
          {activeTab === 'holdings' && (
            <FilterBar
              filters={filters}
              onFiltersChange={setFilters}
              filterType="holdings"
            />
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your portfolio...</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && (
            <main className="max-w-7xl mx-auto">
              {activeTab === 'trades' ? (
                <ErrorBoundary>
                  <TradesTable
                    trades={filteredTrades}
                    onAddTrade={addTrade}
                    onUpdateTrade={updateTrade}
                    onDeleteTrade={deleteTrade}
                  />
                </ErrorBoundary>
              ) : activeTab === 'holdings' ? (
                <ErrorBoundary>
                  <CurrentHoldingsTable 
                    holdings={holdings} 
                    onRefreshPrices={updateAllPrices}
                    isLoadingPrices={isLoadingPrices}
                  />
                </ErrorBoundary>
              ) : activeTab === 'buckets' ? (
                <ErrorBoundary>
                  <InvestmentBucketsTable 
                    buckets={buckets} 
                    onUpdateBucketTarget={updateBucketTarget}
                    onUpdateBucketPurpose={updateBucketPurpose}
                  />
                </ErrorBoundary>
              ) : null}
            </main>
          )}
        </div>
        
        <Footer />
      </div>
    </AuthGuard>
  );
}

export default App;