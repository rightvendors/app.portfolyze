import { useState, useEffect } from 'react';
import { 
  User,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
    .then(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  })
  .catch((error) => {
      console.error("Error setting auth persistence:", error);
      setLoading(false);
    });
  }, []);

  // Initialize reCAPTCHA verifier
  const initializeRecaptcha = (containerId: string = 'recaptcha-container') => {
    if (!recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved successfully');
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired');
          setError('reCAPTCHA expired. Please try again.');
        }
      });
      
      // Pre-render the reCAPTCHA to make it ready
      verifier.render().catch((error) => {
        console.error('reCAPTCHA render error:', error);
      });
      
      setRecaptchaVerifier(verifier);
      return verifier;
    }
    return recaptchaVerifier;
  };

  // Send OTP to phone number
  const sendOtp = async (phoneNumber: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Ensure phone number is in international format
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
      
      // Initialize reCAPTCHA if not already done
      let verifier = recaptchaVerifier;
      if (!verifier) {
        console.log('Initializing reCAPTCHA...');
        verifier = initializeRecaptcha();
        // Small delay to let reCAPTCHA render
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Sending OTP to:', formattedPhone);
      
      // Add timeout for better user experience
      const otpPromise = signInWithPhoneNumber(auth, formattedPhone, verifier);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OTP sending timeout')), 15000); // 15 seconds
      });
      
      const confirmation = await Promise.race([otpPromise, timeoutPromise]);
      
      console.log('OTP sent successfully');
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      return confirmation;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      if (error.message === 'OTP sending timeout') {
        setError('OTP sending is taking longer than expected. Please try again.');
      } else {
        setError(getErrorMessage(error.code));
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and complete sign-in
  const verifyOtp = async (otp: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!confirmationResult) {
        throw new Error('No confirmation result available. Please request OTP first.');
      }
      
      const result = await confirmationResult.confirm(otp);
      
      // Update display name if provided
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      
      setIsOtpSent(false);
      setConfirmationResult(null);
      return result.user;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(getErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setIsOtpSent(false);
      setConfirmationResult(null);
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
      
      // Clear localStorage data to prevent conflicts
      try {
        localStorage.removeItem('portfolio_trades');
        localStorage.removeItem('portfolio_bucket_targets');
        localStorage.removeItem('portfolio_price_cache');
        localStorage.removeItem('portfolio_bucket_targets_purposes');
        console.log('Cleared localStorage data on sign out');
      } catch (localStorageError) {
        console.warn('Error clearing localStorage:', localStorageError);
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  // Reset OTP state (for resending OTP)
  const resetOtpState = () => {
    setIsOtpSent(false);
    setConfirmationResult(null);
    setError(null);
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      setRecaptchaVerifier(null);
    }
  };

  // Get user-friendly error messages
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone number. Please enter a valid Indian mobile number.';
      case 'auth/missing-phone-number':
        return 'Phone number is required.';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return 'Phone authentication is not enabled. Please contact support.';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check and try again.';
      case 'auth/invalid-verification-id':
        return 'Invalid verification ID. Please request a new OTP.';
      case 'auth/code-expired':
        return 'OTP has expired. Please request a new one.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  const clearError = () => setError(null);

  return {
    user,
    loading,
    error,
    isOtpSent,
    sendOtp,
    verifyOtp,
    signOut,
    resetOtpState,
    clearError,
    initializeRecaptcha
  };
};