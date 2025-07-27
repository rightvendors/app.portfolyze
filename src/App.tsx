import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import SignInPage from './pages/SignInPage';

function Dashboard() {
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
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'trades' ? <FileText size={12} /> :
                     tab === 'holdings' ? <TrendingUp size={12} /> : <Target size={12} />}
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your portfolio...</p>
              </div>
            </div>
          ) : (
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
              ) : (
                <ErrorBoundary>
                  <InvestmentBucketsTable 
                    buckets={buckets} 
                    onUpdateBucketTarget={updateBucketTarget}
                    onUpdateBucketPurpose={updateBucketPurpose}
                  />
                </ErrorBoundary>
              )}
            </main>
          )}
        </div>

        <Footer />
      </div>
    </AuthGuard>
  );
}

function AppWrapper() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
                  <Route path="/*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default AppWrapper;
