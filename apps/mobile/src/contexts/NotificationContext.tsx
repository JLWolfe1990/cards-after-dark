import React, { createContext, useContext, useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@apollo/client';
import { UPDATE_FCM_TOKEN } from '@/graphql/mutations';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  fcmToken: string | null;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  registerForNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const { user } = useAuth();
  
  const [updateFcmTokenMutation] = useMutation(UPDATE_FCM_TOKEN);

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (user && fcmToken) {
      updateFcmToken();
    }
  }, [user, fcmToken]);

  const initializeNotifications = async () => {
    try {
      // Check if we have permission
      const authStatus = await messaging().hasPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      setHasPermission(enabled);

      if (enabled) {
        await getFcmToken();
        setupMessageHandlers();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      // For Android, request POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // Request FCM permission
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      setHasPermission(enabled);

      if (enabled) {
        await getFcmToken();
        setupMessageHandlers();
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const getFcmToken = async () => {
    try {
      const token = await messaging().getToken();
      if (token) {
        setFcmToken(token);
        await AsyncStorage.setItem('fcm_token', token);
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };

  const updateFcmToken = async () => {
    if (!fcmToken || !user) return;

    try {
      await updateFcmTokenMutation({
        variables: { fcmToken },
      });
    } catch (error) {
      console.error('Error updating FCM token:', error);
    }
  };

  const setupMessageHandlers = () => {
    // Handle foreground messages
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Cards After Dark',
          remoteMessage.notification.body || '',
        );
      }
    });

    // Handle background/quit state messages
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage);
      // Handle navigation based on notification data
      handleNotificationNavigation(remoteMessage);
    });

    // Check if app was opened from a notification while quit
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from quit state notification:', remoteMessage);
          handleNotificationNavigation(remoteMessage);
        }
      });

    return unsubscribeForeground;
  };

  const handleNotificationNavigation = (remoteMessage: any) => {
    if (!remoteMessage?.data?.type) return;

    // This would integrate with your navigation system
    switch (remoteMessage.data.type) {
      case 'daily_cards':
        // Navigate to game screen
        break;
      case 'partner_action':
        // Navigate to game screen with couple context
        break;
      case 'invitation':
        // Navigate to invitation acceptance screen
        break;
      case 'voting_complete':
        // Navigate to results screen
        break;
    }
  };

  const registerForNotifications = async () => {
    if (hasPermission && fcmToken) {
      return;
    }
    
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in your device settings to receive daily card reminders and partner updates.',
        [{ text: 'OK' }]
      );
    }
  };

  const contextValue: NotificationContextType = {
    fcmToken,
    hasPermission,
    requestPermission,
    registerForNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};