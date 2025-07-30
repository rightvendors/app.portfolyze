// Test script to verify NAV price lookup by ISIN
const { navService } = require('./src/services/navService.ts');

async function testNAVLookup() {
  console.log('Testing NAV lookup by ISIN...');
  
  // Test with a sample ISIN (you can replace this with a real ISIN from your CSV)
  const testISIN = 'INF200K01158'; // SBI Bluechip Fund Direct Growth
  
  try {
    const result = await navService.fetchNAVByISIN(testISIN);
    
    if (result.success && result.data) {
      console.log('✅ NAV lookup successful!');
      console.log('ISIN:', result.data.isin);
      console.log('Scheme Name:', result.data.schemeName);
      console.log('NAV:', result.data.nav);
      console.log('Date:', result.data.date);
    } else {
      console.log('❌ NAV lookup failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during NAV lookup:', error);
  }
}

// Run the test
testNAVLookup(); 