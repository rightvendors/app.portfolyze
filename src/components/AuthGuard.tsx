import React from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { Loader2 } from 'lucide-react';
import MobileAuthForm from './MobileAuthForm';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { user, loading } = useFirebaseAuth();

  // TEMPORARY: Bypass authentication for development
  // Remove this block when authentication is needed again
  return <>{children}</>;

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="w-full max-w-md">
          <MobileAuthForm onAuthSuccess={() => {
            // Auth success will be handled by the useFirebaseAuth hook
            // which will update the user state and re-render this component
          }} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;