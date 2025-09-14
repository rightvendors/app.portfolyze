// Netlify Function to proxy NAV API calls and bypass CORS
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Get the NAV API base URL from environment variable
    const navApiBase = process.env.VITE_NAV_API_BASE;
    
    if (!navApiBase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'VITE_NAV_API_BASE environment variable not set' 
        }),
      };
    }

    // Extract query parameters from the request
    const queryString = event.queryStringParameters || {};
    const queryParams = new URLSearchParams(queryString).toString();
    
    // Construct the target URL
    const targetUrl = navApiBase + (queryParams ? `?${queryParams}` : '');
    
    console.log('🌐 Netlify Function: Fetching from URL:', targetUrl);

    // Make the request to the Google Apps Script API
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Portfolyze-NAV-API/1.0',
      },
    });

    console.log('📡 Netlify Function: Response status:', response.status);

    if (!response.ok) {
      console.error('❌ Netlify Function: API request failed:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API request failed: ${response.status} ${response.statusText}` 
        }),
      };
    }

    // Parse the response
    const data = await response.json();
    console.log('📊 Netlify Function: Response data type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('📊 Netlify Function: Response length:', Array.isArray(data) ? data.length : 'N/A');

    // Return the data with CORS headers
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('❌ Netlify Function: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
    };
  }
};
