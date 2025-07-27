import React, { useState } from 'react';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useFirestorePortfolio } from './hooks/useFirestorePortfolio';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import Footer from './components/Footer';
import TradesTable from './components/TradesTable';
import CurrentHoldingsTable from './components/CurrentHoldingsTable';
import InvestmentBucketsTable from './components/InvestmentBucketsTable';
import FilterBar from './components/FilterBar';
import { FileText, TrendingUp, Target } from 'lucide-react';

function Dashboard() {
  const { user } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<'trades' | 'holdings' | 'buckets'>('trades');
  
  const {
    trades,
    filteredTrades,
    holdings,
    buckets,
    filters,
    loading,
    loadingStates,
    hasLoadedInitialData,
    error,
    isLoadingPrices,
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateBucketTarget,
    updateBucketPurpose,
    updateAllPrices,
    loadTabData
  } = useFirestorePortfolio({ 
    enableLazyLoading: true, 
    initialTab: activeTab 
  });

  // Load data when tab changes (lazy loading)
  const handleTabChange = (tab: 'trades' | 'holdings' | 'buckets') => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showAuthButtons={true} />

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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Navigation Tabs */}
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                {['trades', 'holdings', 'buckets'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab as any)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    disabled={loadingStates[tab as keyof typeof loadingStates]}
                                      >
                      {loadingStates[tab as keyof typeof loadingStates] ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      ) : (
                        tab === 'trades' ? <FileText size={12} /> :
                        tab === 'holdings' ? <TrendingUp size={12} /> : <Target size={12} />
                      )}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
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

          {/* Main Content */}
          {loading && !hasLoadedInitialData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Setting up your portfolio...</p>
              </div>
            </div>
          ) : (
            <main className="max-w-7xl mx-auto">
              <div className="relative">
                {/* Subtle loading indicator for active tab */}
                {loadingStates[activeTab] && (
                  <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="h-1 bg-blue-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 text-center">
                      <p className="text-blue-700 text-sm">Loading {activeTab} data...</p>
                    </div>
                  </div>
                )}
                
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
                ) : (
                  <ErrorBoundary>
                    <InvestmentBucketsTable 
                      buckets={buckets} 
                      onUpdateBucketTarget={updateBucketTarget}
                      onUpdateBucketPurpose={updateBucketPurpose}
                    />
                  </ErrorBoundary>
                )}
              </div>
            </main>
          )}
        </div>

        <Footer />
      </div>
    </AuthGuard>
  );
}

export default Dashboard;
