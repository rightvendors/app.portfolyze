import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, Key, Info } from 'lucide-react';
import { getBreezeService } from '../services/breezeApi';

interface BreezeAuthProps {
  onAuthSuccess?: () => void;
}

const BreezeAuth: React.FC<BreezeAuthProps> = ({ onAuthSuccess }) => {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    hasConfig: false,
    hasSession: false
  });
  const [sessionToken, setSessionToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkConnectionStatus();
    
    // Try to load session token from localStorage
    const savedToken = localStorage.getItem('breeze_session_token');
    if (savedToken) {
      setSessionToken(savedToken);
      const breezeService = getBreezeService();
      breezeService.setSessionToken(savedToken);
      checkConnectionStatus();
    }
  }, []);

  const checkConnectionStatus = () => {
    const breezeService = getBreezeService();
    const status = breezeService.getConnectionStatus();
    setConnectionStatus(status);
  };

  const handleSessionTokenSubmit = async () => {
    if (!sessionToken.trim()) {
      setError('Please enter a session token');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const breezeService = getBreezeService();
      breezeService.setSessionToken(sessionToken.trim());
      
      // Test the connection by trying to fetch a quote
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      
      checkConnectionStatus();
      
      if (onAuthSuccess) {
        onAuthSuccess();
      }
      
      setError('');
    } catch (error) {
      console.error('Error setting session token:', error);
      setError('Failed to authenticate with session token. Please check the token and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = () => {
    const breezeService = getBreezeService();
    breezeService.logout();
    setSessionToken('');
    setError('');
    checkConnectionStatus();
  };

  const openSessionUrl = () => {
    try {
      const breezeService = getBreezeService();
      const sessionUrl = breezeService.getSessionUrl();
      window.open(sessionUrl, '_blank');
    } catch (error) {
      setError('Unable to generate session URL. Please check API configuration.');
    }
  };

  if (!connectionStatus.hasConfig) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              Breeze API Configuration Required
            </h3>
            
            <p className="text-xs text-yellow-700 mb-3">
              To fetch real-time stock prices, please configure your ICICI Direct Breeze API credentials.
            </p>
            
            <div className="space-y-2 text-xs text-yellow-700">
              <div>Add these environment variables to your <code className="bg-yellow-100 px-1 rounded">.env</code> file:</div>
              <div className="bg-yellow-100 p-2 rounded font-mono text-xs">
                <div>VITE_BREEZE_API_KEY=your_api_key</div>
                <div>VITE_BREEZE_API_SECRET=your_api_secret</div>
                <div>VITE_BREEZE_SESSION_TOKEN=your_session_token (optional)</div>
              </div>
              <div className="flex items-center gap-1">
                <ExternalLink size={12} />
                <a 
                  href="https://api.icicidirect.com/breezeapi/documents/index.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-600 hover:text-yellow-800 underline"
                >
                  Get API credentials from ICICI Direct
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5" size={16} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              Breeze API Connected
            </h3>
            
            <p className="text-xs text-green-700 mb-3">
              Successfully connected to ICICI Direct Breeze API. Real-time stock prices are now available.
            </p>
            
            <button
              onClick={handleLogout}
              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Key className="text-blue-600 mt-0.5" size={16} />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Breeze API Authentication
          </h3>
          
          <p className="text-xs text-blue-700 mb-3">
            Enter your session token to connect to ICICI Direct Breeze API for real-time stock prices.
          </p>

          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Session Token
              </label>
              <input
                type="text"
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                placeholder="Enter your Breeze API session token"
                className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleSessionTokenSubmit}
                disabled={isConnecting || !sessionToken.trim()}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  isConnecting || !sessionToken.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
              
              <button
                onClick={openSessionUrl}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                <ExternalLink size={12} />
                Get Session Token
              </button>
            </div>
          </div>

          <div className="mt-3 p-2 bg-blue-100 rounded">
            <div className="flex items-start gap-2">
              <Info size={12} className="text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <div className="font-medium mb-1">How to get session token:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Get Session Token" to open ICICI Direct login</li>
                  <li>Login with your ICICI Direct credentials</li>
                  <li>Copy the session token from the response</li>
                  <li>Paste it above and click "Connect"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreezeAuth;