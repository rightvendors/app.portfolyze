import React, { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { Smartphone, Shield, ArrowRight, RotateCcw, TrendingUp } from 'lucide-react';

interface MobileAuthFormProps {
  onAuthSuccess?: () => void;
  onClose?: () => void;
}

const MobileAuthForm: React.FC<MobileAuthFormProps> = ({ onAuthSuccess, onClose }) => {
  const {
    user,
    loading,
    error,
    isOtpSent,
    sendOtp,
    verifyOtp,
    resetOtpState,
    clearError,
    initializeRecaptcha
  } = useFirebaseAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Check URL parameters for auth mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authMode = urlParams.get('auth');
    if (authMode === 'signup') {
      setIsSignUpMode(true);
    }
    // Clear the URL parameter
    if (authMode) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    initializeRecaptcha();
  }, []);

  // Handle successful authentication
  useEffect(() => {
    if (user && onAuthSuccess) {
      onAuthSuccess();
    }
  }, [user, onAuthSuccess]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      await sendOtp(phoneNumber);
    } catch (error) {
      console.error('Error sending OTP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      await verifyOtp(otp, displayName.trim() || undefined);
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = () => {
    resetOtpState();
    setOtp('');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits for Indian mobile numbers
    const limited = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX
    if (limited.length >= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    } else if (limited.length >= 3) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    }
    
    return limited;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  if (user) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-auto">
        <Shield className="mx-auto mb-4 text-green-600" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Welcome to Portfolyze!
        </h3>
        <p className="text-gray-600 mb-4">
          Authentication successful. Loading your portfolio...
        </p>
        <p className="text-sm text-gray-500">
          Signed in as: {user.displayName || user.phoneNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
      
      {/* Header with Logo and Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <TrendingUp className="text-purple-600 mr-2" size={32} />
          <span className="text-purple-900 text-2xl font-bold">Portfolyze</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isOtpSent ? 'Verify Your Mobile' : isSignUpMode ? 'Create Your Account' : 'Sign In to Continue'}
        </h2>
        <p className="text-gray-600">
          {isOtpSent 
            ? `Enter the 6-digit code sent to +91-${phoneNumber}`
            : 'Start tracking your Indian investment portfolio'
          }
        </p>
      </div>

      {/* Auth Mode Toggle */}
      {!isOtpSent && (
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setIsSignUpMode(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isSignUpMode 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUpMode(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSignUpMode 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!isOtpSent ? (
        // Phone Number Form
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm font-medium">+91</span>
              </div>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="XXX-XXX-XXXX"
                className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                required
                maxLength={12} // XXX-XXX-XXXX format
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Enter your 10-digit Indian mobile number
            </p>
          </div>

          {isSignUpMode && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required={isSignUpMode}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length !== 10 || (isSignUpMode && !displayName.trim())}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Sending OTP...
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      ) : (
        // OTP Verification Form
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              maxLength={6}
              autoComplete="one-time-code"
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the 6-digit code sent to your mobile
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Verifying...
              </>
            ) : (
              <>
                <Shield size={20} />
                Verify & Continue
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium py-2 transition-colors"
          >
            <RotateCcw size={16} />
            Resend OTP
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="https://www.portfolyze.com" className="text-purple-600 hover:text-purple-700">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="https://www.portfolyze.com" className="text-purple-600 hover:text-purple-700">
            Privacy Policy
          </a>
        </p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          Back to Homepage
        </button>
      )}
    </div>
  );
};

export default MobileAuthForm;