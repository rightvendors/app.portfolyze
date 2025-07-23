import { useState, useEffect } from 'react';
import { 
  User,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
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
  }, []);

  // Initialize reCAPTCHA verifier
  const initializeRecaptcha = (containerId: string = 'recaptcha-container') => {
    if (!recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        }
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
      
      const verifier = initializeRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      return confirmation;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(getErrorMessage(error.code));
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