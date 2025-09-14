import React, { useState } from 'react';

const NetlifyFunctionTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testNetlifyFunction = async () => {
    setIsLoading(true);
    setResult('Testing Netlify Function...');
    
    try {
      // Test the Netlify Function
      const functionUrl = '/api/nav?all=1';
      console.log('🧪 Testing Netlify Function with URL:', functionUrl);
      
      const res = await fetch(functionUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🧪 Netlify Function response status:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🧪 Netlify Function response data:', data);
        
        const isArray = Array.isArray(data);
        const dataType = isArray ? 'Array' : typeof data;
        const length = isArray ? data.length : 'N/A';
        
        setResult(`✅ Netlify Function successful! Status: ${res.status}, Data type: ${dataType}, Length: ${length}`);
      } else {
        const errorText = await res.text();
        console.error('🧪 Netlify Function error response:', errorText);
        setResult(`❌ Netlify Function failed! Status: ${res.status} ${res.statusText}. Error: ${errorText}`);
      }
    } catch (error) {
      console.error('🧪 Netlify Function error:', error);
      setResult(`❌ Netlify Function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#d4edda', margin: '10px', borderRadius: '8px' }}>
      <h3>Netlify Function Test</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Tests the Netlify Function that proxies NAV API calls (server-side, no CORS issues)
      </p>
      <button 
        onClick={testNetlifyFunction} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#28a745', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Netlify Function'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default NetlifyFunctionTest;
