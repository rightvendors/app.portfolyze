// Local development version of the NAV API function
// This simulates the Netlify Function for local testing

/**
 * @param {Record<string, string>} queryParams - Query parameters to send to the API
 * @returns {Promise<any>} - The API response data
 */
export const localNavApi = async (queryParams = {}) => {
  try {
    // Get the NAV API base URL from environment variable
    const navApiBase = import.meta.env.VITE_NAV_API_BASE;
    
    console.log('🔍 Local NAV API: Environment check:', {
      hasNavApiBase: !!navApiBase,
      navApiBase: navApiBase ? navApiBase.substring(0, 50) + '...' : 'undefined',
      queryParams
    });
    
    if (!navApiBase) {
      throw new Error('VITE_NAV_API_BASE environment variable not set');
    }

    // Construct the target URL
    const queryString = new URLSearchParams(queryParams).toString();
    const targetUrl = navApiBase + (queryString ? `?${queryString}` : '');
    
    console.log('🌐 Local NAV API: Fetching from URL:', targetUrl);

    // Make the request to the Google Apps Script API
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Portfolyze-NAV-API/1.0',
      },
    });

    console.log('📡 Local NAV API: Response status:', response.status);
    console.log('📡 Local NAV API: Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Local NAV API: API request failed:', response.status, response.statusText);
      console.error('❌ Local NAV API: Error response body:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    console.log('📊 Local NAV API: Response text length:', responseText.length);
    console.log('📊 Local NAV API: Response text preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Local NAV API: JSON parse error:', parseError);
      console.error('❌ Local NAV API: Response text:', responseText);
      throw new Error(`Invalid JSON response from API: ${parseError.message}`);
    }

    console.log('📊 Local NAV API: Response data type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('📊 Local NAV API: Response length:', Array.isArray(data) ? data.length : 'N/A');

    return data;

  } catch (error) {
    console.error('❌ Local NAV API: Error:', error);
    throw error;
  }
};
