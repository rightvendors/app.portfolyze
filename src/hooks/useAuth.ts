import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session
    const savedUser = localStorage.getItem('portfolyze_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('portfolyze_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock authentication - replace with real auth
    const mockUser: User = {
      id: '1',
      email,
      displayName: email.split('@')[0]
    };
    
    setUser(mockUser);
    localStorage.setItem('portfolyze_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('portfolyze_user');
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    // Mock sign up - replace with real auth
    const mockUser: User = {
      id: '1',
      email,
      displayName
    };
    
    setUser(mockUser);
    localStorage.setItem('portfolyze_user', JSON.stringify(mockUser));
    return mockUser;
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    signUp
  };
};