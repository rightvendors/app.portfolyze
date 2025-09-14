import React, { useState } from 'react';
import { getMutualFundService } from '../services/mutualFundApi';

const NAVTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testNAVAPI = async () => {
    setIsLoading(true);
    setResult('Testing NAV API...');
    
    try {
      const service = getMutualFundService();
      
      // Clear cache first
      console.log('🧪 Clearing NAV cache...');
      service.clearCache();
      
      // Test 1: Get all NAVs
      console.log('🧪 Testing getAllNAVs()...');
      const allNAVs = await service.getAllNAVs();
      console.log('🧪 getAllNAVs result:', allNAVs);
      
      // Test 2: Search by ISIN (using a test ISIN)
      console.log('🧪 Testing searchByISIN()...');
      const testISIN = 'INF179K01UT0'; // From your console logs
      const navByISIN = await service.searchByISIN(testISIN);
      console.log('🧪 searchByISIN result:', navByISIN);
      
      // Check if we got real data or mock data
      const isMockData = allNAVs.length > 0 && allNAVs[0].scheme_name.includes('SBI Bluechip');
      const dataSource = isMockData ? 'Mock Data' : 'Real API Data';
      
      setResult(`✅ Test completed! Found ${allNAVs.length} NAVs. ISIN search: ${navByISIN ? 'Found' : 'Not found'}. Data source: ${dataSource}`);
    } catch (error) {
      console.error('🧪 Test error:', error);
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#e0f2fe', margin: '10px', borderRadius: '8px' }}>
      <h3>NAV API Test</h3>
      <button 
        onClick={testNAVAPI} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: isLoading ? '#ccc' : '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test NAV API'}
      </button>
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default NAVTestButton;
