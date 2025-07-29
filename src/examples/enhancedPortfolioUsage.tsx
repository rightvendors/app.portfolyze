// Enhanced Portfolio Usage Example
import React, { useState, useEffect } from 'react';
import { useFirestorePortfolio } from '../hooks/useFirestorePortfolio';
import { useAdvancedPortfolioMetrics } from '../hooks/useAdvancedPortfolioMetrics';

const EnhancedPortfolioDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trades' | 'holdings' | 'buckets'>('trades');
  
  // Enhanced portfolio hook with all optimizations
  const {
    // Data
    trades,
    filteredTrades,
    holdings,
    buckets,
    uniqueInvestments,
    
    // State
    loading,
    loadingStates,
    error,
    isLoadingPrices,
    filters,
    priceCache,
    
    // Actions
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    updateAllPrices,
    loadTabData,
    
    // Enhanced functions
    getHoldingsByAssetType,
    cleanupZeroHoldings,
    persistCalculatedData,
    
    // Utils
    clearError,
    clearPriceCache,
    
    // Performance metrics
    performanceMetrics
  } = useFirestorePortfolio({
    enableLazyLoading: true,
    initialTab: activeTab
  });

  // Advanced analytics hook
  const analytics = useAdvancedPortfolioMetrics(holdings, buckets, {
    benchmarkReturns: [12, 15, 8, 20, -5, 18, 10], // Sample Nifty returns
    targetAllocations: {
      'stock': 60,
      'mutual_fund': 25,
      'bond': 10,
      'gold': 5
    },
    taxRate: 20
  });

  // Example: Enhanced filtering
  const handleAdvancedFilter = () => {
    setFilters({
      ...filters,
      assetType: 'stock',
      minValue: 10000,
      maxValue: 100000
    });
  };

  // Example: Asset type analysis
  const handleAssetTypeAnalysis = (assetType: string) => {
    const assetHoldings = getHoldingsByAssetType(assetType);
    console.log(`${assetType} holdings:`, assetHoldings);
  };

  // Example: Portfolio optimization
  const handlePortfolioOptimization = async () => {
    try {
      // Cleanup zero holdings
      await cleanupZeroHoldings();
      
      // Update all prices
      await updateAllPrices();
      
      // Persist calculated data
      if (holdings.length > 0) {
        await persistCalculatedData('user-id', holdings, buckets);
      }
      
      console.log('Portfolio optimization completed!');
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  return (
    <div className="portfolio-dashboard">
      {/* Performance Overview */}
      <div className="performance-overview">
        <h2>Portfolio Performance</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Portfolio Health Score</h3>
            <div className={`health-score ${analytics.portfolioHealthScore > 70 ? 'good' : 'needs-attention'}`}>
              {analytics.portfolioHealthScore}/100
            </div>
          </div>
          
          <div className="metric-card">
            <h3>Total Value</h3>
            <p>₹{analytics.portfolioMetrics.totalValue.toLocaleString()}</p>
          </div>
          
          <div className="metric-card">
            <h3>XIRR</h3>
            <p>{analytics.portfolioMetrics.xirr.toFixed(2)}%</p>
          </div>
          
          <div className="metric-card">
            <h3>Sharpe Ratio</h3>
            <p>{analytics.portfolioMetrics.sharpeRatio.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="analytics-section">
        <h2>Advanced Analytics</h2>
        
        {/* Asset Allocation */}
        <div className="asset-allocation">
          <h3>Asset Allocation</h3>
          {analytics.assetAllocation.map(allocation => (
            <div key={allocation.assetType} className="allocation-bar">
              <span>{allocation.assetType}</span>
              <div className="bar">
                <div 
                  className="fill" 
                  style={{ width: `${allocation.percentage}%` }}
                />
              </div>
              <span>{allocation.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Rebalancing Suggestions */}
        <div className="rebalancing-suggestions">
          <h3>Rebalancing Suggestions</h3>
          {analytics.rebalancingSuggestions.map(suggestion => (
            <div key={suggestion.assetType} className={`suggestion ${suggestion.suggestedAction}`}>
              <span>{suggestion.assetType}</span>
              <span>{suggestion.suggestedAction.toUpperCase()}</span>
              <span>{Math.abs(suggestion.difference).toFixed(1)}%</span>
              <span>₹{suggestion.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Risk Metrics */}
        <div className="risk-metrics">
          <h3>Risk Analysis</h3>
          <div className="risk-grid">
            <div>VaR (95%): {analytics.riskMetrics.valueAtRisk95.toFixed(2)}%</div>
            <div>Max Drawdown: {analytics.portfolioMetrics.maxDrawdown.toFixed(2)}%</div>
            <div>Concentration Risk: {analytics.riskMetrics.concentrationRisk.toFixed(1)}%</div>
            <div>Volatility: {analytics.portfolioMetrics.volatility.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="action-items">
        <h2>Recommended Actions</h2>
        {analytics.actionItems.map((item, index) => (
          <div key={index} className={`action-item priority-${item.priority}`}>
            <div className="priority-badge">{item.priority.toUpperCase()}</div>
            <div>
              <h4>{item.action}</h4>
              <p>{item.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Goal Achievement Analysis */}
      <div className="goal-analysis">
        <h2>Goal Achievement</h2>
        {analytics.goalAchievementAnalysis.map(goal => (
          <div key={goal.bucketName} className="goal-card">
            <h4>{goal.bucketName}</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(goal.currentProgress, 100)}%` }}
              />
            </div>
            <div className="goal-details">
              <span>Progress: {goal.currentProgress.toFixed(1)}%</span>
              <span>Feasibility: {goal.feasibility}</span>
              {goal.yearsToGoal && (
                <span>Time to Goal: {goal.yearsToGoal} years</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      <div className="performers">
        <div className="top-performers">
          <h3>Top Performers</h3>
          {analytics.topPerformers.map(holding => (
            <div key={holding.name} className="performer-item green">
              <span>{holding.name}</span>
              <span>+{holding.gainLossPercent.toFixed(2)}%</span>
              <span>₹{holding.gainLossAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="underperformers">
          <h3>Underperformers</h3>
          {analytics.underperformers.map(holding => (
            <div key={holding.name} className="performer-item red">
              <span>{holding.name}</span>
              <span>{holding.gainLossPercent.toFixed(2)}%</span>
              <span>₹{holding.gainLossAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Optimization */}
      <div className="tax-optimization">
        <h2>Tax Analysis</h2>
        <div className="tax-grid">
          <div>Short-term Tax: ₹{analytics.taxImplications.shortTermTax.toLocaleString()}</div>
          <div>Long-term Tax: ₹{analytics.taxImplications.longTermTax.toLocaleString()}</div>
          <div>Total Tax: ₹{analytics.taxImplications.totalTax.toLocaleString()}</div>
          <div>Tax Loss Harvesting: ₹{analytics.taxImplications.taxLossHarvesting.toLocaleString()}</div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="enhanced-controls">
        <h2>Portfolio Management</h2>
        
        <div className="control-buttons">
          <button 
            onClick={handleAdvancedFilter}
            className="btn-secondary"
          >
            Apply Advanced Filters
          </button>
          
          <button 
            onClick={() => handleAssetTypeAnalysis('stock')}
            className="btn-secondary"
          >
            Analyze Stocks
          </button>
          
          <button 
            onClick={handlePortfolioOptimization}
            className="btn-primary"
            disabled={isLoadingPrices}
          >
            {isLoadingPrices ? 'Optimizing...' : 'Optimize Portfolio'}
          </button>
          
          <button 
            onClick={clearPriceCache}
            className="btn-secondary"
          >
            Clear Price Cache
          </button>
        </div>

        {/* Performance Debug Info */}
        <div className="debug-info">
          <h3>Performance Metrics</h3>
          <div className="debug-grid">
            <div>Trades: {performanceMetrics.tradesCount}</div>
            <div>Holdings: {performanceMetrics.holdingsCount}</div>
            <div>Cached Prices: {performanceMetrics.cachedPricesCount}</div>
            <div>Unique Investments: {performanceMetrics.uniqueInvestmentsCount}</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="enhanced-filters">
        <h3>Advanced Filters</h3>
        <div className="filter-row">
          <select 
            value={filters.assetType || ''} 
            onChange={(e) => setFilters({...filters, assetType: e.target.value as any})}
          >
            <option value="">All Asset Types</option>
            <option value="stock">Stocks</option>
            <option value="mutual_fund">Mutual Funds</option>
            <option value="bond">Bonds</option>
            <option value="gold">Gold</option>
          </select>
          
          <input
            type="number"
            placeholder="Min Value"
            value={filters.minValue || ''}
            onChange={(e) => setFilters({...filters, minValue: e.target.value ? Number(e.target.value) : undefined})}
          />
          
          <input
            type="number"
            placeholder="Max Value"
            value={filters.maxValue || ''}
            onChange={(e) => setFilters({...filters, maxValue: e.target.value ? Number(e.target.value) : undefined})}
          />
        </div>
      </div>

      {/* Loading States */}
      {Object.entries(loadingStates).map(([key, isLoading]) => (
        isLoading && (
          <div key={key} className="loading-indicator">
            Loading {key}...
          </div>
        )
      ))}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}
    </div>
  );
};

export default EnhancedPortfolioDashboard;

// CSS Styles (would typically be in a separate file)
export const portfolioStyles = `
.portfolio-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.health-score {
  font-size: 2em;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
}

.health-score.good {
  background: #4CAF50;
  color: white;
}

.health-score.needs-attention {
  background: #FF9800;
  color: white;
}

.allocation-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}

.bar {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.3s ease;
}

.suggestion {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px;
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
}

.suggestion.buy {
  background: #E8F5E8;
  border-left: 4px solid #4CAF50;
}

.suggestion.sell {
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
}

.action-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  border-left: 4px solid;
}

.priority-high {
  background: #FFEBEE;
  border-color: #F44336;
}

.priority-medium {
  background: #FFF3E0;
  border-color: #FF9800;
}

.priority-low {
  background: #E8F5E8;
  border-color: #4CAF50;
}

.goal-card {
  background: white;
  padding: 20px;
  margin: 10px 0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.3s ease;
}

.performer-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
}

.performer-item.green {
  background: #E8F5E8;
}

.performer-item.red {
  background: #FFEBEE;
}

.control-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.btn-primary {
  background: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.debug-info {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.filter-row {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

.filter-row select,
.filter-row input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.loading-indicator {
  background: #E3F2FD;
  color: #1976D2;
  padding: 10px;
  border-radius: 4px;
  margin: 5px 0;
}

.error-message {
  background: #FFEBEE;
  color: #C62828;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
`;