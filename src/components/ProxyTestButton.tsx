import React, { useState } from 'react';

const ProxyTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testProxy = async () => {
    setIsLoading(true);
    setResult('Testing proxy...');
    
    try {
      // Test the proxy endpoint directly
      const proxyUrl = '/api/nav?all=1';
      console.log('🧪 Testing proxy URL:', proxyUrl);
      
      const res = await fetch(proxyUrl);
      console.log('🧪 Proxy response status:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🧪 Proxy response data:', data);
        setResult(`✅ Proxy working! Status: ${res.status}, Data type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      } else {
        setResult(`❌ Proxy failed! Status: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error('🧪 Proxy test error:', error);
      setResult(`❌ Proxy test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff3cd', margin: '10px', borderRadius: '8px' }}>
      <h3>Proxy Test</h3>
      <button 
        onClick={testProxy} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#ffc107', 
          color: 'black', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Proxy'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default ProxyTestButton;
