import { useState, useEffect, useCallback, useMemo } from 'react';
import { backgroundDataService, CachedData } from '../services/backgroundDataService';
import { getStockPriceService } from '../services/stockPriceService';
import { getMutualFundService } from '../services/mutualFundApi';

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
    if (debouncedQuery.length >= 3) {
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
      
      // Search stocks from cached data
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
          change: 0,
          changePercent: 0,
          description: `Stock from ${stock.source}`,
          risk: 'Medium Risk' as const,
          source: 'cached' as const
        }));

      // Search mutual funds from cached data
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

      // Search commodities from cached data
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

      // Always include cached results
      results.push(...stockResults, ...mutualFundResults, ...commodityResults);
      
      // Always fetch from CSV sources for comprehensive search
      const stockService = getStockPriceService();
      const mutualFundService = getMutualFundService();

      try {
        // Search stocks from CSV
        const stockSuggestions = await stockService.getStockSuggestions(query, 20);
        stockSuggestions.forEach(stock => {
          results.push({
            id: `stock-${stock.symbol}`,
            name: stock.name,
            symbol: stock.symbol,
            type: 'stock',
            price: 0, // Will be fetched separately if needed
            change: 0,
            changePercent: 0,
            description: 'Stock from Indian markets',
            risk: 'Medium Risk',
            source: 'search'
          });
        });

        // Search mutual funds from CSV
        const fundSuggestions = await mutualFundService.getFundSuggestions(query, 50);
        fundSuggestions.forEach(fund => {
          results.push({
            id: `mf-${fund.isin}`,
            name: fund.name,
            symbol: fund.isin, // Use ISIN as symbol for mutual funds
            type: 'mutual_fund',
            price: 0,
            change: 0,
            changePercent: 0,
            description: 'Mutual fund from AMFI database',
            risk: 'Medium Risk',
            source: 'search'
          });
        });
      } catch (error) {
        console.error('Error fetching from CSV sources:', error);
      }

      // Remove duplicates based on name and symbol
      const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => 
          r.name.toLowerCase() === result.name.toLowerCase() && 
          r.symbol.toLowerCase() === result.symbol.toLowerCase()
        )
      );

      // Log search results for debugging
      console.log(`Search for "${query}" found:`, {
        totalResults: results.length,
        uniqueResults: uniqueResults.length,
        mutualFundResults: results.filter(r => r.type === 'mutual_fund').length,
        stockResults: results.filter(r => r.type === 'stock').length,
        cachedResults: results.filter(r => r.source === 'cached').length,
        searchResults: results.filter(r => r.source === 'search').length
      });

      // Limit results to top 50
      setSearchResults(uniqueResults.slice(0, 50));

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