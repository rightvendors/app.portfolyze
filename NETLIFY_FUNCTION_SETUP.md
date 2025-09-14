# Netlify Function Setup for NAV API

## Overview
This project uses a Netlify Function to proxy NAV API calls, completely bypassing CORS issues by making server-side requests.

## Files Created

### 1. Netlify Function
- **File**: `netlify/functions/nav-api.js`
- **Purpose**: Server-side proxy for Google Apps Script NAV API
- **Features**:
  - Handles CORS headers automatically
  - Proxies all query parameters
  - Provides detailed logging
  - Error handling and fallbacks

### 2. Netlify Configuration
- **File**: `netlify.toml`
- **Purpose**: Configuration for Netlify deployment
- **Features**:
  - Sets build command and publish directory
  - Configures environment variables
  - Sets up redirects for API routes

### 3. Updated Services
- **Files**: `src/services/mutualFundApi.ts`, `src/services/navService.ts`
- **Changes**:
  - Production: Uses Netlify Function (`/api/nav`)
  - Development: Uses CORS proxy (`api.allorigins.win`)
  - Automatic environment detection

## How It Works

### Development Mode
```
React App → CORS Proxy → Google Apps Script API
```

### Production Mode
```
React App → Netlify Function → Google Apps Script API
```

## Environment Variables

### Required
- `VITE_NAV_API_BASE`: Your Google Apps Script deployment URL

### Example
```env
VITE_NAV_API_BASE=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Testing

### Local Development
1. **CORS Proxy Test** (Red) - Tests the CORS proxy service
2. **NAV API Test** (Blue) - Tests the full NAV API flow
3. **Netlify Function Test** (Green) - Tests the Netlify Function (will fail locally)

### Production Deployment
1. Deploy to Netlify
2. Set environment variable in Netlify dashboard
3. Test the Netlify Function (should work)

## Deployment Steps

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Set environment variable: `VITE_NAV_API_BASE`

3. **Verify deployment**:
   - Check that `/api/nav` endpoint is accessible
   - Test the NAV API functionality

## Benefits

- ✅ **No CORS issues** - Server-side requests bypass browser CORS
- ✅ **Reliable** - No dependency on third-party CORS proxies
- ✅ **Secure** - API key stays on server-side
- ✅ **Fast** - Direct server-to-server communication
- ✅ **Scalable** - Netlify Functions auto-scale

## Troubleshooting

### Function Not Working
1. Check Netlify Function logs in dashboard
2. Verify environment variable is set
3. Check that Google Apps Script URL is correct

### CORS Issues in Development
1. Use the CORS Proxy Test to verify proxy is working
2. Check browser console for detailed error messages
3. Verify environment variable is set correctly

### Production Issues
1. Check Netlify Function logs
2. Verify redirects are working (`/api/nav/*` → `/.netlify/functions/nav-api`)
3. Test the function directly: `https://your-site.netlify.app/api/nav?all=1`
