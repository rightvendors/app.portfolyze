import React from 'react';
import MobileAuthForm from '../components/MobileAuthForm';

const SignInPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
      <MobileAuthForm />
    </div>
  );
};

export default SignInPage;
