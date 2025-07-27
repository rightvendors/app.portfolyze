import { useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Setup listener + session persistence
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      })
      .catch((error) => {
        console.error('Error setting auth persistence:', error);
        setLoading(false);
      });
  }, []);

  const initializeRecaptcha = (containerId: string = 'recaptcha-container') => {
    if (!recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: string) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired. Please try again.');
        },
      });

      verifier.render().then((widgetId) => {
        console.log('reCAPTCHA widget ID:', widgetId);
      });

      setRecaptchaVerifier(verifier);
      return verifier;
    }

    return recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber: string, containerId = 'recaptcha-container') => {
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;

    return new Promise<ConfirmationResult>((resolve, reject) => {
      grecaptcha.enterprise.ready(async () => {
        try {
          const token = await grecaptcha.enterprise.execute('6Lej3YwrAAAAAJcmQEdR5iU2cCbu9hToRMZIgYyW', {
            action: 'send_otp',
          });

          const verifier = initializeRecaptcha(containerId);
          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
          setConfirmationResult(confirmation);
          resolve(confirmation);
        } catch (error) {
          console.error('Error sending OTP:', error);
          reject(error);
        }
      });
    });
  };

  const verifyOTP = async (otp: string, displayName?: string) => {
    if (!confirmationResult) {
      throw new Error('No confirmation result. Please send OTP first.');
    }

    try {
      const result = await confirmationResult.confirm(otp);
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      return result.user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setConfirmationResult(null);
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    sendOTP,
    verifyOTP,
    signOut,
    initializeRecaptcha,
  };
};
