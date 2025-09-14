import React, { useState } from 'react';

const SimpleRequestTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testSimpleRequest = async () => {
    setIsLoading(true);
    setResult('Testing simple request...');
    
    try {
      // Test direct API call with simple GET (no custom headers)
      const apiUrl = 'https://script.google.com/macros/s/AKfycbxWBjnlhuy6vEGBdgcSeFdiGdofUiPJuT5B8w-m_J9NXFDrdci6TuD55cf_RdfTsmPt/exec?all=1';
      console.log('🧪 Testing simple GET request to:', apiUrl);
      
      // Simple GET request - no custom headers to avoid preflight
      const res = await fetch(apiUrl);
      console.log('🧪 Simple request response status:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🧪 Simple request response data:', data);
        setResult(`✅ Simple request successful! Status: ${res.status}, Data type: ${Array.isArray(data) ? 'Array' : typeof data}, Length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      } else {
        setResult(`❌ Simple request failed! Status: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error('🧪 Simple request error:', error);
      setResult(`❌ Simple request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#d1ecf1', margin: '10px', borderRadius: '8px' }}>
      <h3>Simple Request Test</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Tests a simple GET request (no custom headers) to avoid preflight OPTIONS
      </p>
      <button 
        onClick={testSimpleRequest} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#17a2b8', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Simple Request'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default SimpleRequestTest;
