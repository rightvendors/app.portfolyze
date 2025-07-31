import React, { useState, useEffect, useRef } from 'react';
import { getStockPriceService, StockSuggestion } from '../services/stockPriceService';
import { ChevronDown, Search } from 'lucide-react';

interface StockSuggestionDropdownProps {
  query: string;
  isVisible: boolean;
  onSelect: (suggestion: StockSuggestion) => void;
  onClose: () => void;
}

const StockSuggestionDropdown: React.FC<StockSuggestionDropdownProps> = ({
  query,
  isVisible,
  onSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stockService = getStockPriceService();

  useEffect(() => {
    if (!isVisible || !query || query.length < 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const results = await stockService.getStockSuggestions(query, 8);
        setSuggestions(results);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching stock suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query, isVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: StockSuggestion) => {
    onSelect(suggestion);
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {isLoading ? (
        <div className="p-3 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Searching stocks...
          </div>
        </div>
      ) : (
        <>
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Search size={12} />
              <span>Stock suggestions for "{query}"</span>
            </div>
          </div>
          
          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.symbol}-${index}`}
                className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 transition-colors ${
                  index === selectedIndex ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium text-gray-900">
                  {suggestion.symbol}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {suggestion.name}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Use ↑↓ to navigate, Enter to select</span>
              <span>{suggestions.length} results</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockSuggestionDropdown; 