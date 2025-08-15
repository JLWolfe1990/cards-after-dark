import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { validateVerificationCode } from '@/utils/validation';

type Props = StackScreenProps<AuthStackParamList, 'CodeVerification'>;

export const CodeVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phoneNumber, sessionId, isNewUser } = route.params;
  const { theme } = useTheme();
  const { verifyCode, sendVerificationCode } = useAuth();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef<(TextInput | null)[]>([]);

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
    phoneText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    codeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    codeInput: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
    },
    codeInputFocused: {
      borderColor: theme.colors.primary,
    },
    codeInputFilled: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontSize: 14,
    },
    resendContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    resendText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    resendButton: {
      marginTop: theme.spacing.sm,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleCodeChange = (text: string, index: number) => {
    if (error) setError('');

    // Only allow digits
    const digit = text.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (index === 5 && digit && newCode.every(c => c !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    setError('');
    const validation = validateVerificationCode(codeToVerify);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid verification code');
      return;
    }

    setIsLoading(true);

    try {
      if (isNewUser) {
        // Navigate to user details screen for new users
        navigation.navigate('UserDetails', {
          phoneNumber,
          sessionId,
          code: codeToVerify,
        });
      } else {
        // Verify existing user directly
        await verifyCode(sessionId, codeToVerify);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      // Clear the code inputs on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setCanResend(false);
    setCountdown(30);

    try {
      await sendVerificationCode(phoneNumber);
      Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend verification code');
      setCanResend(true);
      setCountdown(0);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isCodeComplete = code.every(digit => digit !== '');

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="code-verification-screen"
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
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.phoneText}>{phoneNumber}</Text>
              </Text>
            </View>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => inputRefs.current[index] = ref}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={text => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  testID={`code-input-${index}`}
                />
              ))}
            </View>

            {error && (
              <Text style={styles.errorText} testID="error-text">
                {error}
              </Text>
            )}

            <Button
              title={isNewUser ? "Continue" : "Verify"}
              onPress={() => handleVerify()}
              loading={isLoading}
              disabled={!isCodeComplete}
              testID="verify-button"
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                {canResend 
                  ? "Didn't receive the code?"
                  : `Resend code in ${countdown}s`
                }
              </Text>
              {canResend && (
                <Button
                  title="Resend Code"
                  variant="text"
                  onPress={handleResendCode}
                  style={styles.resendButton}
                  testID="resend-button"
                />
              )}
            </View>

            <Button
              title="← Back"
              variant="text"
              onPress={handleBack}
              style={styles.backButton}
              testID="back-button"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};