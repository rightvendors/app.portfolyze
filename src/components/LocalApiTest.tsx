import React, { useState } from 'react';

const LocalApiTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testLocalApi = async () => {
    setIsLoading(true);
    setResult('Testing local API...');
    
    try {
      // Test the local API function directly
      const { localNavApi } = await import('../utils/localNavApi');
      
      console.log('🧪 Testing local API function...');
      const data = await localNavApi({ all: '1' });
      console.log('🧪 Local API response data:', data);
      
      const isArray = Array.isArray(data);
      const dataType = isArray ? 'Array' : typeof data;
      const length = isArray ? data.length : 'N/A';
      
      setResult(`✅ Local API successful! Data type: ${dataType}, Length: ${length}`);
    } catch (error) {
      console.error('🧪 Local API error:', error);
      setResult(`❌ Local API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#e2e3e5', margin: '10px', borderRadius: '8px' }}>
      <h3>Local API Test</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Tests the local API function that simulates the Netlify Function for development
      </p>
      <button 
        onClick={testLocalApi} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#6c757d', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Local API'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default LocalApiTest;
