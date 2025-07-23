import React from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { Loader2, Smartphone } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-purple-600" size={48} />
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Smartphone className="mx-auto mb-4 text-purple-600" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Mobile Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in with your mobile number from the homepage to access your portfolio.
          </p>
          <a
            href="https://www.portfolyze.com"
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;