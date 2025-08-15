import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PhoneInputScreen } from '@/screens/auth/PhoneInputScreen';
import { CodeVerificationScreen } from '@/screens/auth/CodeVerificationScreen';
import { UserDetailsScreen } from '@/screens/auth/UserDetailsScreen';
import { PartnerInvitationScreen } from '@/screens/auth/PartnerInvitationScreen';
import { InvitationAcceptScreen } from '@/screens/auth/InvitationAcceptScreen';

export type AuthStackParamList = {
  PhoneInput: undefined;
  CodeVerification: { 
    phoneNumber: string; 
    sessionId: string; 
    isNewUser: boolean; 
  };
  UserDetails: { 
    phoneNumber: string; 
    sessionId: string; 
    code: string; 
  };
  PartnerInvitation: undefined;
  InvitationAccept: { 
    invitationId: string; 
  };
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="PhoneInput" 
        component={PhoneInputScreen} 
      />
      <Stack.Screen 
        name="CodeVerification" 
        component={CodeVerificationScreen} 
      />
      <Stack.Screen 
        name="UserDetails" 
        component={UserDetailsScreen} 
      />
      <Stack.Screen 
        name="PartnerInvitation" 
        component={PartnerInvitationScreen} 
      />
      <Stack.Screen 
        name="InvitationAccept" 
        component={InvitationAcceptScreen} 
      />
    </Stack.Navigator>
  );
};