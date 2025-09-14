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
    
    console.log('🔍 Netlify Function: Environment check:', {
      hasNavApiBase: !!navApiBase,
      navApiBase: navApiBase ? navApiBase.substring(0, 50) + '...' : 'undefined',
      eventPath: event.path,
      eventQueryString: event.queryStringParameters,
      eventHttpMethod: event.httpMethod
    });
    
    if (!navApiBase) {
      console.error('❌ Netlify Function: VITE_NAV_API_BASE not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'VITE_NAV_API_BASE environment variable not set',
          debug: {
            hasNavApiBase: false,
            availableEnvVars: Object.keys(process.env).filter(key => key.includes('NAV') || key.includes('API'))
          }
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
    console.log('📡 Netlify Function: Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Netlify Function: API request failed:', response.status, response.statusText);
      console.error('❌ Netlify Function: Error response body:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API request failed: ${response.status} ${response.statusText}`,
          responseBody: errorText.substring(0, 500) // Truncate for logging
        }),
      };
    }

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    console.log('📊 Netlify Function: Response text length:', responseText.length);
    console.log('📊 Netlify Function: Response text preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Netlify Function: JSON parse error:', parseError);
      console.error('❌ Netlify Function: Response text:', responseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON response from API',
          parseError: parseError.message,
          responseText: responseText.substring(0, 500)
        }),
      };
    }

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
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
    };
  }
};
