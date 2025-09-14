# NAV API Setup Guide

## Problem
The holdings table is not able to fetch NAV data from the API because the `VITE_NAV_API_BASE` environment variable is not configured.

## Solution

### Step 1: Create Environment File
Create a `.env` file in your project root directory with the following content:

```env
# NAV API Base URL - Replace with your actual Apps Script deployment URL
VITE_NAV_API_BASE=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Step 2: Get Your Apps Script URL
1. Go to [Google Apps Script](https://script.google.com/)
2. Open your project that contains the NAV data
3. Click on "Deploy" → "New deployment"
4. Choose "Web app" as the type
5. Set "Execute as" to "Me"
6. Set "Who has access" to "Anyone"
7. Click "Deploy"
8. Copy the web app URL (it should look like: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

### Step 3: Update Environment File
Replace `YOUR_SCRIPT_ID` in the `.env` file with your actual Apps Script deployment ID.

### Step 4: Restart Development Server
After creating/updating the `.env` file, restart your development server:

```bash
npm run dev
# or
yarn dev
```

### Step 5: Verify Setup
1. Open your browser's developer console
2. Look for any warnings about `VITE_NAV_API_BASE`
3. Check if the holdings table now shows real NAV data instead of mock data

## Current Behavior
- **Without environment variable**: The app uses mock NAV data (hardcoded sample data)
- **With environment variable**: The app fetches real NAV data from your Apps Script API

## Troubleshooting

### Still seeing mock data?
1. Check that your `.env` file is in the project root (same level as `package.json`)
2. Verify the URL format is correct (should end with `/exec`)
3. Make sure you restarted the development server after creating the `.env` file
4. Check the browser console for any error messages

### API not responding?
1. Verify your Apps Script is deployed as a web app
2. Check that the deployment has "Anyone" access
3. Test the URL directly in your browser - it should return JSON data
4. Make sure your Apps Script code is working correctly

## Example .env file
```env
# NAV API Base URL
VITE_NAV_API_BASE=https://script.google.com/macros/s/1ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ567890/exec

# Other environment variables (if needed)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```
