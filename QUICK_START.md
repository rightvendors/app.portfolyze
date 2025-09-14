# Portfolyze Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Run the interactive setup script:
```bash
npm run setup
```

Or manually create a `.env` file in the project root:
```env
# NAV API Base URL - Replace with your actual Apps Script deployment URL
VITE_NAV_API_BASE=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Firebase Configuration (if using Firebase)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### 3. Start Development Server
```bash
npm run dev
```

## 🔧 Configuration

### NAV API Setup
The app fetches mutual fund NAV data from a Google Apps Script API. To set this up:

1. **Create a Google Apps Script** that fetches NAV data
2. **Deploy it as a web app** with "Anyone" access
3. **Copy the deployment URL** and add it to your `.env` file as `VITE_NAV_API_BASE`

**Without NAV API**: The app will use mock data and show warnings in the console.

### Firebase Setup (Optional)
If you want to use Firebase for authentication and data storage:

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Get your config** from Project Settings → Your apps
3. **Add the config** to your `.env` file

**Without Firebase**: The app will work with local storage only.

## 📁 Project Structure

```
src/
├── components/          # React components
├── services/           # API services (NAV, Firebase, etc.)
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── config/             # Configuration files
```

## 🐛 Troubleshooting

### Holdings Table Shows Mock Data
- Check that `VITE_NAV_API_BASE` is set in your `.env` file
- Verify your Apps Script URL is correct and accessible
- Restart your development server after changing `.env`

### Firebase Errors
- Check that all Firebase environment variables are set
- Verify your Firebase project is properly configured
- Check the browser console for specific error messages

### Build Issues
- Make sure all environment variables are set for production
- Check that your Apps Script allows CORS requests
- Verify all API endpoints are accessible

## 📚 Additional Resources

- [NAV API Setup Guide](./NAV_API_SETUP.md) - Detailed NAV API configuration
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup) - Firebase configuration
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html) - Vite env var documentation
