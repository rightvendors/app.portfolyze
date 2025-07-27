import React, { useState, useEffect } from 'react';
import { X, Shield, Smartphone, ArrowRight, AlertCircle } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { ConfirmationResult } from 'firebase/auth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSwitchToSignUp }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const { sendOTP, verifyOTP } = useFirebaseAuth();

  useEffect(() => {
    // Reset form when modal closes
    if (!isOpen) {
      setStep('mobile');
      setOtp('');
      setError('');
      setConfirmationResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim() || mobile.length !== 10) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await sendOTP(mobile, 'recaptcha-container-signin');
      setConfirmationResult(result);
      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6 || !confirmationResult) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await verifyOTP(confirmationResult, otp);

// Redirect to app subdomain
window.location.href = 'https://app.portfolyze.com';
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: any) => {
    switch (error.code) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check and try again';
      case 'auth/code-expired':
        return 'OTP has expired. Please request a new one';
      default:
        return 'An error occurred. Please try again';
    }
  };

  const resetForm = () => {
    setMobile('');
    setOtp('');
    setStep('mobile');
    setError('');
    setConfirmationResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSwitchToSignUp = () => {
    resetForm();
    onClose();
    if (onSwitchToSignUp) {
      onSwitchToSignUp();
    }
  };

  const handleResendOTP = async () => {
    if (!mobile) return;
    
    setIsLoading(true);
    setError('');
    setOtp('');
    
    try {
      const result = await sendOTP(mobile, 'recaptcha-container-signin');
      setConfirmationResult(result);
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="relative p-8 pb-6">
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">
              {step === 'mobile' 
                ? 'Enter your mobile number to sign in'
                : 'Enter the OTP sent to your mobile'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {step === 'mobile' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg"
                    maxLength={10}
                    required
                  />
                </div>
                {mobile.length > 0 && mobile.length < 10 && (
                  <p className="text-red-500 text-xs mt-2">Please enter a valid 10-digit mobile number</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || mobile.length !== 10}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-gray-500 text-sm">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToSignUp}
                    className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  required
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  OTP sent to +91 {mobile}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Verify & Sign In</span>
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-purple-600 hover:text-purple-700 font-medium transition-colors disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container-signin"></div>
      </div>
    </div>
  );
};

export default SignInModal;