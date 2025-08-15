import React, { useState } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { validatePhoneNumber } from '@/utils/validation';

type Props = StackScreenProps<AuthStackParamList, 'PhoneInput'>;

export const PhoneInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { sendVerificationCode } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      ...theme.typography.h1,
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
    disclaimer: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      lineHeight: 18,
    },
  });

  const handleContinue = async () => {
    setError('');

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendVerificationCode(phoneNumber);
      
      navigation.navigate('CodeVerification', {
        phoneNumber,
        sessionId: result.sessionId,
        isNewUser: result.message.includes('new'),
      });
    } catch (err: any) {
      Alert.alert(
        'Verification Failed',
        err.message || 'Unable to send verification code. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="phone-input-screen"
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
              <Text style={styles.title}>Cards After Dark</Text>
              <Text style={styles.subtitle}>
                Enter your phone number to get started with intimate card games designed for couples.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Phone Number"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={14}
                error={error}
                testID="phone-input"
              />

              <Button
                title="Continue"
                onPress={handleContinue}
                loading={isLoading}
                disabled={phoneNumber.length < 14}
                testID="continue-button"
              />

              <Text style={styles.disclaimer}>
                By continuing, you agree to receive SMS messages for verification. 
                Standard message and data rates may apply.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};