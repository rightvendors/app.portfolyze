import React, { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { Smartphone, Shield, ArrowRight, RotateCcw } from 'lucide-react';

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
      <div className="text-center py-8">
        <Shield className="mx-auto mb-4 text-green-600" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Authentication Successful
        </h3>
        <p className="text-gray-600 mb-4">
          Welcome, {user.displayName || 'User'}!
        </p>
        <p className="text-sm text-gray-500">
          Phone: {user.phoneNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
      
      <div className="text-center mb-6">
        <Smartphone className="mx-auto mb-4 text-purple-600" size={48} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isOtpSent ? 'Verify OTP' : 'Sign In with Mobile'}
        </h2>
        <p className="text-gray-600">
          {isOtpSent 
            ? `Enter the 6-digit code sent to +91-${phoneNumber}`
            : 'Enter your mobile number to receive an OTP'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!isOtpSent ? (
        // Phone Number Form
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">+91</span>
              </div>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="XXX-XXX-XXXX"
                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                maxLength={12} // XXX-XXX-XXXX format
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your 10-digit Indian mobile number
            </p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length !== 10}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Sending OTP...
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        // OTP Verification Form
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 text-center text-lg tracking-widest border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              maxLength={6}
              autoComplete="one-time-code"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code sent to your mobile
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Verifying...
              </>
            ) : (
              <>
                <Shield size={16} />
                Verify & Sign In
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

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          Cancel
        </button>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default MobileAuthForm;