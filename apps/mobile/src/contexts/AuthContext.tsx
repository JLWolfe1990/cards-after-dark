import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@apollo/client';
import { User, CoupleProfile, AuthResponse } from '@cards-after-dark/shared';
import { SEND_VERIFICATION_CODE, VERIFY_CODE, LOGOUT } from '@/graphql/mutations';

interface AuthContextType {
  user: User | null;
  couple: CoupleProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendVerificationCode: (phoneNumber: string) => Promise<{ sessionId: string; message: string }>;
  verifyCode: (sessionId: string, code: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<CoupleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sendVerificationCodeMutation] = useMutation(SEND_VERIFICATION_CODE);
  const [verifyCodeMutation] = useMutation(VERIFY_CODE);
  const [logoutMutation] = useMutation(LOGOUT);

  const isAuthenticated = !!user;

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser, storedCouple] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_data'),
        AsyncStorage.getItem('couple_data'),
      ]);

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        if (storedCouple) {
          setCouple(JSON.parse(storedCouple));
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const storeAuthData = async (authData: AuthResponse) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('auth_token', authData.token),
        AsyncStorage.setItem('user_data', JSON.stringify(authData.user)),
        authData.couple 
          ? AsyncStorage.setItem('couple_data', JSON.stringify(authData.couple))
          : AsyncStorage.removeItem('couple_data'),
      ]);

      setUser(authData.user);
      setCouple(authData.couple || null);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };

  const clearAuthData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('auth_token'),
        AsyncStorage.removeItem('user_data'),
        AsyncStorage.removeItem('couple_data'),
      ]);

      setUser(null);
      setCouple(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const sendVerificationCode = useCallback(async (phoneNumber: string) => {
    try {
      const { data } = await sendVerificationCodeMutation({
        variables: { phoneNumber },
      });

      if (data?.sendVerificationCode) {
        return data.sendVerificationCode;
      }
      
      throw new Error('Failed to send verification code');
    } catch (error: any) {
      console.error('Send verification code error:', error);
      throw new Error(error.message || 'Failed to send verification code');
    }
  }, [sendVerificationCodeMutation]);

  const verifyCode = useCallback(async (
    sessionId: string, 
    code: string, 
    firstName?: string, 
    lastName?: string
  ) => {
    try {
      const { data } = await verifyCodeMutation({
        variables: { 
          sessionId, 
          code, 
          firstName, 
          lastName 
        },
      });

      if (data?.verifyCode) {
        await storeAuthData(data.verifyCode);
        return;
      }

      throw new Error('Invalid verification code');
    } catch (error: any) {
      console.error('Verify code error:', error);
      throw new Error(error.message || 'Invalid verification code');
    }
  }, [verifyCodeMutation]);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await logoutMutation();
      }
    } catch (error) {
      console.error('Logout mutation error:', error);
    } finally {
      await clearAuthData();
    }
  }, [logoutMutation, user]);

  const refreshAuth = useCallback(async () => {
    await loadStoredAuth();
  }, []);

  const contextValue: AuthContextType = {
    user,
    couple,
    isLoading,
    isAuthenticated,
    sendVerificationCode,
    verifyCode,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};