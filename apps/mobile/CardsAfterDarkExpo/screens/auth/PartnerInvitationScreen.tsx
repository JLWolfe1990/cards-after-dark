import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useLazyQuery, useMutation } from '@apollo/client';
import LinearGradient from 'react-native-linear-gradient';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { validatePhoneNumber } from '@/utils/validation';
import { GET_INVITATION_BY_PHONE } from '@/graphql/queries';
import { SEND_PARTNER_INVITATION } from '@/graphql/mutations';

type Props = StackScreenProps<AuthStackParamList, 'PartnerInvitation'>;

export const PartnerInvitationScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshAuth } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkInvitation] = useLazyQuery(GET_INVITATION_BY_PHONE);
  const [sendInvitation] = useMutation(SEND_PARTNER_INVITATION);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    form: {
      marginTop: theme.spacing.xl,
    },
    orSection: {
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
    },
    orText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    skipButton: {
      marginTop: theme.spacing.lg,
    },
  });

  // Check for existing invitations when component mounts
  useEffect(() => {
    checkForExistingInvitations();
  }, []);

  const checkForExistingInvitations = async () => {
    if (!user?.phoneNumber) return;

    try {
      const { data } = await checkInvitation({
        variables: { phoneNumber: user.phoneNumber },
      });

      if (data?.invitationByPhone?.status === 'sent') {
        navigation.navigate('InvitationAccept', {
          invitationId: data.invitationByPhone.id,
        });
      }
    } catch (error) {
      console.log('No existing invitations found');
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Apply formatting: (XXX) XXX-XXXX
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return cleaned;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    if (error) setError('');
  };

  const handleSendInvitation = async () => {
    setError('');

    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid phone number');
      return;
    }

    // Check if user is trying to invite themselves
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const userCleanedPhone = user?.phoneNumber.replace(/\D/g, '');
    if (cleanedPhone === userCleanedPhone) {
      setError('You cannot invite yourself');
      return;
    }

    setIsLoading(true);

    try {
      await sendInvitation({
        variables: { phoneNumber },
      });

      Alert.alert(
        'Invitation Sent!',
        `We've sent an invitation to ${phoneNumber}. They'll receive a text message with instructions to join you on Cards After Dark.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh auth to check if they've been paired
              refreshAuth();
            },
          },
        ]
      );

      setPhoneNumber('');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip Partner Invitation?',
      'You can always invite your partner later from the profile screen. The game experience is designed for couples, so some features may be limited.',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip For Now', 
          onPress: () => {
            // User will stay authenticated but without a partner
            // The main app will handle showing single-user experience
          }
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="partner-invitation-screen"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Invite Your Partner</Text>
              <Text style={styles.subtitle}>
                Cards After Dark is designed for couples. Invite your partner to join you 
                for intimate card games and shared experiences.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Partner's Phone Number"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={14}
                error={error}
                helperText="They'll receive a text message with an invitation link"
                testID="partner-phone-input"
              />

              <Button
                title="Send Invitation"
                onPress={handleSendInvitation}
                loading={isLoading}
                disabled={phoneNumber.length < 14}
                testID="send-invitation-button"
              />

              <View style={styles.orSection}>
                <Text style={styles.orText}>or</Text>
                
                <Button
                  title="Skip For Now"
                  variant="outline"
                  onPress={handleSkipForNow}
                  testID="skip-button"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};