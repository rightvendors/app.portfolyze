export interface Trade {
  id: string;
  date: string;
  investmentType: 'stock' | 'mutual_fund' | 'bond' | 'fixed_deposit' | 'gold' | 'silver' | 'index_fund' | 'etf';
  name: string;
  isin?: string;
  interestRate?: number;
  transactionType: 'buy' | 'sell';
  quantity: number;
  buyRate: number;
  sellRate?: number;
  buyAmount: number;
  sellAmount?: number;
  brokerBank: string;
  bucketAllocation: string;
}

export interface Summary {
  totalInvestment: number;
  currentValue: number;
  totalProfit: number;
  totalProfitPercent: number;
  totalAnnualizedReturn: number;
  xirr: number;
  assetAllocation: { [key: string]: number };
  topPerformers: Trade[];
  bottomPerformers: Trade[];
}

export interface FilterState {
  investmentType: string;
  buckets: string;
  transactionType: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}
export interface Holding {
  name: string;
  investmentType: string;
  netQuantity: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  gainLossAmount: number;
  gainLossPercent: number;
  annualYield: number;
  xirr: number;
  bucketAllocation?: string;
}

export interface BucketSummary {
  bucketName: string;
  purpose: string;
  targetAmount: number;
  currentValue: number;
  investedAmount: number;
  gainLossAmount: number;
  gainLossPercent: number;
  progressPercent: number;
  holdingsCount: number;
  annualYield: number;
  xirr: number;
}