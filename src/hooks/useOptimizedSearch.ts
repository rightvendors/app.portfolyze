import { useState, useEffect, useCallback, useMemo } from 'react';
import { backgroundDataService, CachedData } from '../services/backgroundDataService';

export interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'mutual_fund' | 'gold' | 'silver' | 'bond' | 'fixed_deposit' | 'nps' | 'etf';
  price: number;
  change: number;
  changePercent: number;
  description: string;
  risk: 'Low Risk' | 'Medium Risk' | 'High Risk';
  source: 'existing' | 'popular' | 'search' | 'cached';
}

export const useOptimizedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const searchTerm = query.toLowerCase();
      const results: SearchResult[] = [];

      // Search in cached data first (instant results)
      const cachedData = await backgroundDataService.getAllCachedData();
      
      // Search stocks
      const stockResults = cachedData.stocks
        .filter(stock => 
          stock.name.toLowerCase().includes(searchTerm) ||
          stock.symbol.toLowerCase().includes(searchTerm)
        )
        .map(stock => ({
          id: stock.id,
          name: stock.name,
          symbol: stock.symbol,
          type: stock.type as 'stock',
          price: stock.price,
          change: 0, // Will be calculated if needed
          changePercent: 0,
          description: `Stock from ${stock.source}`,
          risk: 'Medium Risk' as const,
          source: 'cached' as const
        }));

      // Search mutual funds
      const mutualFundResults = cachedData.mutualFunds
        .filter(fund => 
          fund.name.toLowerCase().includes(searchTerm) ||
          fund.symbol.toLowerCase().includes(searchTerm)
        )
        .map(fund => ({
          id: fund.id,
          name: fund.name,
          symbol: fund.symbol,
          type: fund.type as 'mutual_fund',
          price: fund.price,
          change: 0,
          changePercent: 0,
          description: `Mutual fund from ${fund.source}`,
          risk: 'Medium Risk' as const,
          source: 'cached' as const
        }));

      // Search commodities
      const commodityResults = cachedData.commodities
        .filter(commodity => 
          commodity.name.toLowerCase().includes(searchTerm) ||
          commodity.symbol.toLowerCase().includes(searchTerm)
        )
        .map(commodity => ({
          id: commodity.id,
          name: commodity.name,
          symbol: commodity.symbol,
          type: commodity.type as 'gold' | 'silver',
          price: commodity.price,
          change: 0,
          changePercent: 0,
          description: `${commodity.type} from ${commodity.source}`,
          risk: 'Low Risk' as const,
          source: 'cached' as const
        }));

      results.push(...stockResults, ...mutualFundResults, ...commodityResults);

      // Limit results to top 10
      setSearchResults(results.slice(0, 10));

    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(async (): Promise<SearchResult[]> => {
    try {
      const cachedData = await backgroundDataService.getAllCachedData();
      const suggestions: SearchResult[] = [];

      // Add popular stocks
      cachedData.stocks.slice(0, 5).forEach(stock => {
        suggestions.push({
          id: stock.id,
          name: stock.name,
          symbol: stock.symbol,
          type: stock.type as 'stock',
          price: stock.price,
          change: 0,
          changePercent: 0,
          description: `Stock from ${stock.source}`,
          risk: 'Medium Risk',
          source: 'cached'
        });
      });

      // Add popular mutual funds
      cachedData.mutualFunds.slice(0, 3).forEach(fund => {
        suggestions.push({
          id: fund.id,
          name: fund.name,
          symbol: fund.symbol,
          type: fund.type as 'mutual_fund',
          price: fund.price,
          change: 0,
          changePercent: 0,
          description: `Mutual fund from ${fund.source}`,
          risk: 'Medium Risk',
          source: 'cached'
        });
      });

      // Add commodities
      cachedData.commodities.forEach(commodity => {
        suggestions.push({
          id: commodity.id,
          name: commodity.name,
          symbol: commodity.symbol,
          type: commodity.type as 'gold' | 'silver',
          price: commodity.price,
          change: 0,
          changePercent: 0,
          description: `${commodity.type} from ${commodity.source}`,
          risk: 'Low Risk',
          source: 'cached'
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const getCacheStatus = useCallback(() => {
    return backgroundDataService.getCacheStatus();
  }, []);

  const forceRefreshCache = useCallback(async () => {
    try {
      await backgroundDataService.forceRefreshAll();
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    performSearch,
    getSuggestions,
    clearSearch,
    getCacheStatus,
    forceRefreshCache
  };
}; 