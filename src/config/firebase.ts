import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration keys:', missingKeys);
  console.error('Please check your .env file and ensure all required Firebase environment variables are set.');
  console.error('Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID');
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
}

// Verify Firebase configuration is not using placeholder values
const placeholderValues = ['your_actual_firebase_api_key_here', 'your_project.firebaseapp.com', 'your_actual_project_id'];
const hasPlaceholders = Object.values(firebaseConfig).some(value => 
  typeof value === 'string' && placeholderValues.some(placeholder => value.includes(placeholder))
);

if (hasPlaceholders) {
  console.error('⚠️  Firebase configuration contains placeholder values!');
  console.error('Please replace the placeholder values in your .env file with actual Firebase configuration values.');
  console.error('Get your config from: https://console.firebase.google.com/ → Project Settings → Your apps');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

auth.useDeviceLanguage();

export const authPersistencePromise = setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Initialize Firestore
export const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🧪 Connected to Firebase emulators');
  } catch (error) {
    console.warn('Firebase emulators already connected or unavailable');
  }
} else {
  console.log('🔥 Firebase initialized successfully');
  console.log('📱 Phone authentication ready');
}

// Export verification function
export const verifyFirebaseConfig = () => {
  const isConfigured = !missingKeys.length && !hasPlaceholders;
  return {
    isConfigured,
    missingKeys,
    hasPlaceholders,
    config: firebaseConfig
  };
};

export default app;