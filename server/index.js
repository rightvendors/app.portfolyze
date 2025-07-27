import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Upstox API configuration
const UPSTOX_BASE_URL = 'https://api.upstox.com/v2';
const ACCESS_TOKEN = process.env.VITE_UPSTOX_ACCESS_TOKEN;

// Helper function to get headers
const getUpstoxHeaders = () => ({
  'Accept': 'application/json',
  'Authorization': `Bearer ${ACCESS_TOKEN}`
});

// Get Last Traded Price (LTP) for single instrument
app.get('/api/upstox/ltp/:instrumentKey', async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const url = `${UPSTOX_BASE_URL}/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentKey)}`;
    
    console.log(`Fetching LTP for: ${instrumentKey}`);
    
    const response = await axios.get(url, { headers: getUpstoxHeaders() });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching LTP:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Get multiple LTPs
app.post('/api/upstox/ltp/batch', async (req, res) => {
  try {
    const { instrumentKeys } = req.body;
    
    if (!Array.isArray(instrumentKeys) || instrumentKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'instrumentKeys array is required'
      });
    }
    
    console.log(`Fetching batch LTP for: ${instrumentKeys.join(', ')}`);
    
    // Upstox allows multiple instrument keys in a single request
    const instrumentParam = instrumentKeys.join(',');
    const url = `${UPSTOX_BASE_URL}/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentParam)}`;
    
    const response = await axios.get(url, { headers: getUpstoxHeaders() });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching batch LTP:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Search instruments
app.get('/api/upstox/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const url = `${UPSTOX_BASE_URL}/search/instruments?query=${encodeURIComponent(query)}`;
    
    console.log(`Searching instruments for: ${query}`);
    
    const response = await axios.get(url, { headers: getUpstoxHeaders() });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error searching instruments:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Get user profile
app.get('/api/upstox/profile', async (req, res) => {
  try {
    const url = `${UPSTOX_BASE_URL}/user/profile`;
    
    console.log('Fetching user profile');
    
    if (!ACCESS_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Access token not configured'
      });
    }
    
    const response = await axios.get(url, { headers: getUpstoxHeaders() });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching profile:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Upstox API server is running',
    timestamp: new Date().toISOString(),
    hasAccessToken: !!ACCESS_TOKEN
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Upstox API server running on port ${PORT}`);
  console.log(`Access token configured: ${!!ACCESS_TOKEN}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});