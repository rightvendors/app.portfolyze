// Advanced portfolio calculation utilities
import { Trade, Holding, BucketSummary } from '../types/portfolio';

// Enhanced XIRR calculation using Newton-Raphson method
export interface CashFlow {
  date: Date;
  amount: number;
}

export const calculateXIRR = (cashFlows: CashFlow[], guess: number = 0.1): number => {
  if (cashFlows.length < 2) return 0;
  
  // Sort cash flows by date
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sortedFlows[0].date;
  
  // Convert dates to years from first date
  const flows = sortedFlows.map(flow => ({
    years: (flow.date.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    amount: flow.amount
  }));
  
  // Newton-Raphson method
  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    
    flows.forEach(flow => {
      const factor = Math.pow(1 + rate, flow.years);
      npv += flow.amount / factor;
      dnpv -= flow.amount * flow.years / (factor * (1 + rate));
    });
    
    if (Math.abs(npv) < tolerance) {
      return rate * 100; // Convert to percentage
    }
    
    if (Math.abs(dnpv) < tolerance) {
      break; // Avoid division by zero
    }
    
    rate = rate - npv / dnpv;
    
    // Prevent extreme values
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }
  
  return isFinite(rate) ? rate * 100 : 0;
};

// Calculate Sharpe Ratio
export const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 6): number => {
  if (returns.length < 2) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (avgReturn - riskFreeRate) / stdDev;
};

// Calculate Maximum Drawdown
export const calculateMaxDrawdown = (values: number[]): { maxDrawdown: number; peak: number; trough: number } => {
  if (values.length < 2) return { maxDrawdown: 0, peak: 0, trough: 0 };
  
  let peak = values[0];
  let maxDrawdown = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  
  values.forEach((value, index) => {
    if (value > peak) {
      peak = value;
      peakIndex = index;
    }
    
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughIndex = index;
    }
  });
  
  return {
    maxDrawdown: maxDrawdown * 100,
    peak: peakIndex,
    trough: troughIndex
  };
};

// Advanced portfolio metrics
export interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  xirr: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  diversificationRatio: number;
}

export const calculatePortfolioMetrics = (
  holdings: Holding[],
  benchmarkReturns?: number[]
): PortfolioMetrics => {
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      xirr: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      beta: 0,
      alpha: 0,
      diversificationRatio: 0
    };
  }
  
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  
  // Calculate weighted XIRR
  const weightedXirr = totalValue > 0 
    ? holdings.reduce((sum, h) => sum + (h.xirr * h.currentValue / totalValue), 0)
    : 0;
  
  // Calculate portfolio returns for advanced metrics
  const returns = holdings.map(h => h.gainLossPercent);
  const weights = holdings.map(h => h.currentValue / totalValue);
  
  // Volatility (standard deviation of returns)
  const avgReturn = returns.reduce((sum, r, i) => sum + r * weights[i], 0);
  const variance = returns.reduce((sum, r, i) => sum + Math.pow(r - avgReturn, 2) * weights[i], 0);
  const volatility = Math.sqrt(variance);
  
  // Diversification ratio (simplified)
  const weightedVolatility = holdings.reduce((sum, h, i) => {
    const individualVol = Math.abs(h.gainLossPercent - avgReturn);
    return sum + individualVol * weights[i];
  }, 0);
  const diversificationRatio = weightedVolatility > 0 ? volatility / weightedVolatility : 1;
  
  // Beta and Alpha (if benchmark provided)
  let beta = 1;
  let alpha = 0;
  if (benchmarkReturns && benchmarkReturns.length === returns.length) {
    const benchmarkAvg = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    const covariance = returns.reduce((sum, r, i) => 
      sum + (r - avgReturn) * (benchmarkReturns[i] - benchmarkAvg), 0) / (returns.length - 1);
    const benchmarkVariance = benchmarkReturns.reduce((sum, r) => 
      sum + Math.pow(r - benchmarkAvg, 2), 0) / (benchmarkReturns.length - 1);
    
    beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
    alpha = avgReturn - (6 + beta * (benchmarkAvg - 6)); // Assuming 6% risk-free rate
  }
  
  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercent,
    xirr: isFinite(weightedXirr) ? weightedXirr : 0,
    sharpeRatio: calculateSharpeRatio(returns),
    maxDrawdown: calculateMaxDrawdown(holdings.map(h => h.currentValue)).maxDrawdown,
    volatility: isFinite(volatility) ? volatility : 0,
    beta: isFinite(beta) ? beta : 1,
    alpha: isFinite(alpha) ? alpha : 0,
    diversificationRatio: isFinite(diversificationRatio) ? diversificationRatio : 1
  };
};

// Asset allocation analysis
export interface AssetAllocation {
  assetType: string;
  value: number;
  percentage: number;
  count: number;
}

export const calculateAssetAllocation = (holdings: Holding[]): AssetAllocation[] => {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const allocationMap = new Map<string, { value: number; count: number }>();
  
  holdings.forEach(holding => {
    const existing = allocationMap.get(holding.investmentType) || { value: 0, count: 0 };
    existing.value += holding.currentValue;
    existing.count += 1;
    allocationMap.set(holding.investmentType, existing);
  });
  
  return Array.from(allocationMap.entries()).map(([assetType, data]) => ({
    assetType,
    value: data.value,
    percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    count: data.count
  })).sort((a, b) => b.value - a.value);
};

// Rebalancing suggestions
export interface RebalancingSuggestion {
  assetType: string;
  currentPercentage: number;
  targetPercentage: number;
  difference: number;
  suggestedAction: 'buy' | 'sell' | 'hold';
  amount: number;
}

export const calculateRebalancingSuggestions = (
  holdings: Holding[],
  targetAllocations: { [assetType: string]: number }
): RebalancingSuggestion[] => {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const currentAllocations = calculateAssetAllocation(holdings);
  
  return Object.entries(targetAllocations).map(([assetType, targetPercentage]) => {
    const current = currentAllocations.find(a => a.assetType === assetType);
    const currentPercentage = current?.percentage || 0;
    const difference = targetPercentage - currentPercentage;
    const amount = Math.abs(difference) * totalValue / 100;
    
    return {
      assetType,
      currentPercentage,
      targetPercentage,
      difference,
      suggestedAction: Math.abs(difference) < 5 ? 'hold' : (difference > 0 ? 'buy' : 'sell'),
      amount
    };
  }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
};

// Performance attribution analysis
export interface PerformanceAttribution {
  holding: string;
  contribution: number;
  weight: number;
  return: number;
  attributionPercent: number;
}

export const calculatePerformanceAttribution = (holdings: Holding[]): PerformanceAttribution[] => {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLossAmount, 0);
  
  return holdings.map(holding => {
    const weight = totalValue > 0 ? holding.currentValue / totalValue : 0;
    const contribution = holding.gainLossAmount;
    const attributionPercent = totalGainLoss !== 0 ? (contribution / totalGainLoss) * 100 : 0;
    
    return {
      holding: holding.name,
      contribution,
      weight: weight * 100,
      return: holding.gainLossPercent,
      attributionPercent
    };
  }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
};

// Risk metrics
export interface RiskMetrics {
  valueAtRisk95: number; // 95% VaR
  valueAtRisk99: number; // 99% VaR
  conditionalVaR95: number; // Expected Shortfall at 95%
  concentrationRisk: number; // Herfindahl index
  correlationRisk: number; // Average correlation
}

export const calculateRiskMetrics = (holdings: Holding[]): RiskMetrics => {
  if (holdings.length === 0) {
    return {
      valueAtRisk95: 0,
      valueAtRisk99: 0,
      conditionalVaR95: 0,
      concentrationRisk: 0,
      correlationRisk: 0
    };
  }
  
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const returns = holdings.map(h => h.gainLossPercent);
  const weights = holdings.map(h => h.currentValue / totalValue);
  
  // Sort returns for VaR calculation
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  // Value at Risk (simplified using historical simulation)
  const var95Index = Math.floor(returns.length * 0.05);
  const var99Index = Math.floor(returns.length * 0.01);
  const valueAtRisk95 = sortedReturns[var95Index] || 0;
  const valueAtRisk99 = sortedReturns[var99Index] || 0;
  
  // Conditional VaR (Expected Shortfall)
  const conditionalVaR95 = var95Index > 0 
    ? sortedReturns.slice(0, var95Index).reduce((sum, r) => sum + r, 0) / var95Index
    : valueAtRisk95;
  
  // Concentration risk (Herfindahl index)
  const concentrationRisk = weights.reduce((sum, w) => sum + w * w, 0) * 100;
  
  // Simplified correlation risk (average pairwise correlation approximation)
  const avgReturn = returns.reduce((sum, r, i) => sum + r * weights[i], 0);
  const correlationRisk = returns.length > 1 
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    : 0;
  
  return {
    valueAtRisk95: Math.abs(valueAtRisk95),
    valueAtRisk99: Math.abs(valueAtRisk99),
    conditionalVaR95: Math.abs(conditionalVaR95),
    concentrationRisk,
    correlationRisk: Math.sqrt(correlationRisk)
  };
};

// Bucket optimization suggestions
export interface BucketOptimization {
  bucketName: string;
  currentAllocation: number;
  suggestedAllocation: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  suggestions: string[];
}

export const calculateBucketOptimizations = (buckets: BucketSummary[]): BucketOptimization[] => {
  return buckets.map(bucket => {
    const progressPercent = bucket.progressPercent;
    const riskLevel = bucket.xirr > 15 ? 'high' : bucket.xirr > 8 ? 'medium' : 'low';
    const timeHorizon = bucket.targetAmount > 500000 ? 'long' : bucket.targetAmount > 200000 ? 'medium' : 'short';
    
    const suggestions: string[] = [];
    
    if (progressPercent < 25) {
      suggestions.push('Consider increasing monthly contributions');
      suggestions.push('Review asset allocation for better returns');
    } else if (progressPercent > 90) {
      suggestions.push('Consider reducing risk as goal approaches');
      suggestions.push('Start planning for goal achievement');
    }
    
    if (bucket.xirr < 8 && riskLevel === 'low') {
      suggestions.push('Consider adding growth assets for better returns');
    } else if (bucket.xirr > 20 && riskLevel === 'high') {
      suggestions.push('Consider reducing risk through diversification');
    }
    
    return {
      bucketName: bucket.bucketName,
      currentAllocation: bucket.currentValue,
      suggestedAllocation: bucket.targetAmount,
      riskLevel,
      timeHorizon,
      suggestions
    };
  });
};

// Performance comparison utilities
export const compareToIndex = (portfolioReturn: number, indexReturn: number) => {
  const outperformance = portfolioReturn - indexReturn;
  const relativePerformance = indexReturn !== 0 ? (outperformance / Math.abs(indexReturn)) * 100 : 0;
  
  return {
    outperformance,
    relativePerformance,
    status: outperformance > 0 ? 'outperforming' : outperformance < 0 ? 'underperforming' : 'matching'
  };
};

// Tax optimization helpers
export const calculateTaxImplications = (holdings: Holding[], taxRate: number = 20) => {
  const shortTermGains = holdings.filter(h => h.gainLossAmount > 0 && h.xirr > 15);
  const longTermGains = holdings.filter(h => h.gainLossAmount > 0 && h.xirr <= 15);
  const losses = holdings.filter(h => h.gainLossAmount < 0);
  
  const shortTermTax = shortTermGains.reduce((sum, h) => sum + h.gainLossAmount * (taxRate / 100), 0);
  const longTermTax = longTermGains.reduce((sum, h) => sum + h.gainLossAmount * (taxRate / 200), 0); // 50% discount
  const taxLossHarvesting = losses.reduce((sum, h) => sum + Math.abs(h.gainLossAmount), 0);
  
  return {
    shortTermTax,
    longTermTax,
    totalTax: shortTermTax + longTermTax,
    taxLossHarvesting,
    netGainAfterTax: holdings.reduce((sum, h) => sum + h.gainLossAmount, 0) - shortTermTax - longTermTax
  };
};