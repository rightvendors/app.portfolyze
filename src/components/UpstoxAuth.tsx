import React, { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';

interface UpstoxAuthProps {
  onAuthSuccess: () => void;
}

const UpstoxAuth: React.FC<UpstoxAuthProps> = ({ onAuthSuccess }) => {
  useEffect(() => {
    // Auto-trigger success since we're not using Upstox for now
    onAuthSuccess();
  }, []);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Info className="text-yellow-600 mt-0.5" size={16} />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Price Data Information
          </h3>
          
          <p className="text-xs text-yellow-700 mb-3">
            Real-time stock prices are currently disabled due to Upstox sandbox limitations. 
            Mutual fund NAVs are fetched from Google Sheets. Stock prices use mock data for demonstration.
          </p>
          
          <div className="space-y-2 text-xs text-yellow-700">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Mutual Fund NAVs: Real data from Google Sheets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>Stock Prices: Mock data (Upstox LTP not available in sandbox)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Other Assets: Mock data for demonstration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpstoxAuth;