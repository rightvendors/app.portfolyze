import React, { useState } from 'react';

const CorsProxyTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testCorsProxy = async () => {
    setIsLoading(true);
    setResult('Testing CORS proxy...');
    
    try {
      // Test the CORS proxy with your Apps Script URL
      const originalUrl = 'https://script.google.com/macros/s/AKfycbxWBjnlhuy6vEGBdgcSeFdiGdofUiPJuT5B8w-m_J9NXFDrdci6TuD55cf_RdfTsmPt/exec?all=1';
      const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      
      console.log('🧪 Testing CORS proxy with URL:', corsProxyUrl);
      console.log('🎯 Original URL:', originalUrl);
      
      const res = await fetch(corsProxyUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🧪 CORS proxy response status:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🧪 CORS proxy response data:', data);
        
        const isArray = Array.isArray(data);
        const dataType = isArray ? 'Array' : typeof data;
        const length = isArray ? data.length : 'N/A';
        
        setResult(`✅ CORS proxy successful! Status: ${res.status}, Data type: ${dataType}, Length: ${length}`);
      } else {
        setResult(`❌ CORS proxy failed! Status: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error('🧪 CORS proxy error:', error);
      setResult(`❌ CORS proxy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8d7da', margin: '10px', borderRadius: '8px' }}>
      <h3>CORS Proxy Test</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Tests the CORS proxy service (api.allorigins.win) with your Apps Script URL
      </p>
      <button 
        onClick={testCorsProxy} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test CORS Proxy'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default CorsProxyTest;
