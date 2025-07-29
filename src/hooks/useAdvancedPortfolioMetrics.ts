import { useMemo, useCallback } from 'react';
import { Holding, BucketSummary } from '../types/portfolio';
import {
  calculatePortfolioMetrics,
  calculateAssetAllocation,
  calculateRebalancingSuggestions,
  calculatePerformanceAttribution,
  calculateRiskMetrics,
  calculateBucketOptimizations,
  compareToIndex,
  calculateTaxImplications,
  PortfolioMetrics,
  AssetAllocation,
  RebalancingSuggestion,
  PerformanceAttribution,
  RiskMetrics,
  BucketOptimization
} from '../utils/portfolioCalculations';

interface AdvancedPortfolioMetricsOptions {
  benchmarkReturns?: number[];
  targetAllocations?: { [assetType: string]: number };
  taxRate?: number;
  riskFreeRate?: number;
}

export const useAdvancedPortfolioMetrics = (
  holdings: Holding[],
  buckets: BucketSummary[],
  options: AdvancedPortfolioMetricsOptions = {}
) => {
  const {
    benchmarkReturns,
    targetAllocations = {
      'stock': 60,
      'mutual_fund': 25,
      'bond': 10,
      'gold': 5
    },
    taxRate = 20,
    riskFreeRate = 6
  } = options;

  // Memoized portfolio metrics calculation
  const portfolioMetrics = useMemo((): PortfolioMetrics => {
    return calculatePortfolioMetrics(holdings, benchmarkReturns);
  }, [holdings, benchmarkReturns]);

  // Memoized asset allocation analysis
  const assetAllocation = useMemo((): AssetAllocation[] => {
    return calculateAssetAllocation(holdings);
  }, [holdings]);

  // Memoized rebalancing suggestions
  const rebalancingSuggestions = useMemo((): RebalancingSuggestion[] => {
    return calculateRebalancingSuggestions(holdings, targetAllocations);
  }, [holdings, targetAllocations]);

  // Memoized performance attribution
  const performanceAttribution = useMemo((): PerformanceAttribution[] => {
    return calculatePerformanceAttribution(holdings);
  }, [holdings]);

  // Memoized risk metrics
  const riskMetrics = useMemo((): RiskMetrics => {
    return calculateRiskMetrics(holdings);
  }, [holdings]);

  // Memoized bucket optimizations
  const bucketOptimizations = useMemo((): BucketOptimization[] => {
    return calculateBucketOptimizations(buckets);
  }, [buckets]);

  // Memoized tax implications
  const taxImplications = useMemo(() => {
    return calculateTaxImplications(holdings, taxRate);
  }, [holdings, taxRate]);

  // Top performers and underperformers
  const topPerformers = useMemo(() => {
    return holdings
      .filter(h => h.gainLossPercent > 0)
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);
  }, [holdings]);

  const underperformers = useMemo(() => {
    return holdings
      .filter(h => h.gainLossPercent < 0)
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);
  }, [holdings]);

  // Portfolio health score (0-100)
  const portfolioHealthScore = useMemo(() => {
    let score = 50; // Base score
    
    // Diversification bonus (0-20 points)
    const diversificationScore = Math.min(20, assetAllocation.length * 4);
    score += diversificationScore;
    
    // Performance bonus/penalty (-20 to +20 points)
    const performanceScore = Math.max(-20, Math.min(20, portfolioMetrics.totalGainLossPercent / 2));
    score += performanceScore;
    
    // Risk adjustment (-10 to +10 points)
    const riskScore = riskMetrics.concentrationRisk > 50 ? -10 : 
                     riskMetrics.concentrationRisk < 25 ? 10 : 0;
    score += riskScore;
    
    // Rebalancing penalty (0 to -10 points)
    const rebalancingPenalty = rebalancingSuggestions
      .filter(s => Math.abs(s.difference) > 10)
      .length * -2;
    score += Math.max(-10, rebalancingPenalty);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [assetAllocation, portfolioMetrics, riskMetrics, rebalancingSuggestions]);

  // Investment efficiency metrics
  const investmentEfficiency = useMemo(() => {
    const totalValue = portfolioMetrics.totalValue;
    const totalInvested = portfolioMetrics.totalInvested;
    
    if (totalInvested === 0) {
      return {
        capitalUtilization: 0,
        returnOnInvestment: 0,
        riskAdjustedReturn: 0,
        efficiencyRating: 'N/A'
      };
    }
    
    const capitalUtilization = (totalValue / totalInvested) * 100;
    const returnOnInvestment = portfolioMetrics.totalGainLossPercent;
    const riskAdjustedReturn = portfolioMetrics.sharpeRatio;
    
    let efficiencyRating = 'Poor';
    if (riskAdjustedReturn > 1.5) efficiencyRating = 'Excellent';
    else if (riskAdjustedReturn > 1.0) efficiencyRating = 'Good';
    else if (riskAdjustedReturn > 0.5) efficiencyRating = 'Average';
    else if (riskAdjustedReturn > 0) efficiencyRating = 'Below Average';
    
    return {
      capitalUtilization,
      returnOnInvestment,
      riskAdjustedReturn,
      efficiencyRating
    };
  }, [portfolioMetrics]);

  // Sector/Asset class insights
  const sectorInsights = useMemo(() => {
    const insights: string[] = [];
    
    assetAllocation.forEach(allocation => {
      if (allocation.percentage > 70) {
        insights.push(`High concentration in ${allocation.assetType} (${allocation.percentage.toFixed(1)}%) - consider diversification`);
      } else if (allocation.percentage < 5 && allocation.count > 0) {
        insights.push(`Low allocation to ${allocation.assetType} (${allocation.percentage.toFixed(1)}%) - consider increasing or removing`);
      }
    });
    
    if (assetAllocation.length < 3) {
      insights.push('Portfolio lacks diversification - consider adding more asset classes');
    }
    
    return insights;
  }, [assetAllocation]);

  // Goal achievement analysis
  const goalAchievementAnalysis = useMemo(() => {
    const analysis = buckets.map(bucket => {
      const monthsToGoal = bucket.targetAmount > bucket.currentValue && portfolioMetrics.xirr > 0 
        ? Math.log(bucket.targetAmount / bucket.currentValue) / Math.log(1 + portfolioMetrics.xirr / 1200)
        : Infinity;
      
      const yearsToGoal = monthsToGoal / 12;
      
      return {
        bucketName: bucket.bucketName,
        currentProgress: bucket.progressPercent,
        monthsToGoal: isFinite(monthsToGoal) ? Math.ceil(monthsToGoal) : null,
        yearsToGoal: isFinite(yearsToGoal) ? Math.ceil(yearsToGoal) : null,
        feasibility: bucket.progressPercent > 80 ? 'Highly Achievable' :
                    bucket.progressPercent > 50 ? 'Achievable' :
                    bucket.progressPercent > 25 ? 'Challenging' : 'Requires Action',
        recommendedMonthlyContribution: bucket.targetAmount > bucket.currentValue 
          ? Math.max(0, (bucket.targetAmount - bucket.currentValue) / 60) // Assume 5-year timeline
          : 0
      };
    });
    
    return analysis.sort((a, b) => b.currentProgress - a.currentProgress);
  }, [buckets, portfolioMetrics]);

  // Market comparison (if benchmark provided)
  const marketComparison = useMemo(() => {
    if (!benchmarkReturns || benchmarkReturns.length === 0) return null;
    
    const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    return compareToIndex(portfolioMetrics.totalGainLossPercent, benchmarkReturn);
  }, [portfolioMetrics, benchmarkReturns]);

  // Action items based on analysis
  const actionItems = useMemo(() => {
    const actions: { priority: 'high' | 'medium' | 'low'; action: string; reason: string }[] = [];
    
    // High priority actions
    if (riskMetrics.concentrationRisk > 50) {
      actions.push({
        priority: 'high',
        action: 'Reduce concentration risk',
        reason: `Portfolio is highly concentrated (${riskMetrics.concentrationRisk.toFixed(1)}% concentration index)`
      });
    }
    
    if (portfolioMetrics.totalGainLossPercent < -20) {
      actions.push({
        priority: 'high',
        action: 'Review underperforming investments',
        reason: `Portfolio is down ${Math.abs(portfolioMetrics.totalGainLossPercent).toFixed(1)}%`
      });
    }
    
    // Medium priority actions
    rebalancingSuggestions.forEach(suggestion => {
      if (Math.abs(suggestion.difference) > 15) {
        actions.push({
          priority: 'medium',
          action: `Rebalance ${suggestion.assetType}`,
          reason: `${suggestion.difference > 0 ? 'Under' : 'Over'}allocated by ${Math.abs(suggestion.difference).toFixed(1)}%`
        });
      }
    });
    
    // Low priority actions
    if (taxImplications.totalTax > taxImplications.netGainAfterTax * 0.3) {
      actions.push({
        priority: 'low',
        action: 'Consider tax optimization',
        reason: `High tax burden: ₹${taxImplications.totalTax.toFixed(0)} on gains`
      });
    }
    
    return actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [riskMetrics, portfolioMetrics, rebalancingSuggestions, taxImplications]);

  // Callback to get filtered holdings by criteria
  const getFilteredHoldings = useCallback((criteria: {
    minValue?: number;
    maxValue?: number;
    assetType?: string;
    performanceThreshold?: number;
  }) => {
    return holdings.filter(holding => {
      if (criteria.minValue && holding.currentValue < criteria.minValue) return false;
      if (criteria.maxValue && holding.currentValue > criteria.maxValue) return false;
      if (criteria.assetType && holding.investmentType !== criteria.assetType) return false;
      if (criteria.performanceThreshold && holding.gainLossPercent < criteria.performanceThreshold) return false;
      return true;
    });
  }, [holdings]);

  // Export comprehensive analytics
  return {
    // Core metrics
    portfolioMetrics,
    portfolioHealthScore,
    investmentEfficiency,
    
    // Analysis
    assetAllocation,
    rebalancingSuggestions,
    performanceAttribution,
    riskMetrics,
    bucketOptimizations,
    
    // Insights
    topPerformers,
    underperformers,
    sectorInsights,
    goalAchievementAnalysis,
    marketComparison,
    actionItems,
    
    // Tax and optimization
    taxImplications,
    
    // Utility functions
    getFilteredHoldings,
    
    // Summary statistics
    summary: {
      totalHoldings: holdings.length,
      totalBuckets: buckets.length,
      diversificationLevel: assetAllocation.length,
      rebalancingNeeded: rebalancingSuggestions.filter(s => s.suggestedAction !== 'hold').length,
      highRiskHoldings: holdings.filter(h => Math.abs(h.gainLossPercent) > 20).length,
      goalAchievementRate: buckets.filter(b => b.progressPercent > 75).length / Math.max(1, buckets.length) * 100
    }
  };
};