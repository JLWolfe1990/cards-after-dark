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
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { validateName } from '@/utils/validation';

type Props = StackScreenProps<AuthStackParamList, 'UserDetails'>;

export const UserDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phoneNumber, sessionId, code } = route.params;
  const { theme } = useTheme();
  const { verifyCode } = useAuth();
  const { registerForNotifications } = useNotifications();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ firstName: '', lastName: '' });

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
      marginTop: theme.spacing.lg,
    },
    disclaimer: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      lineHeight: 18,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });

  const validateForm = () => {
    const firstNameValidation = validateName(firstName, 'First name');
    const lastNameValidation = validateName(lastName, 'Last name');

    setErrors({
      firstName: firstNameValidation.isValid ? '' : firstNameValidation.error || '',
      lastName: lastNameValidation.isValid ? '' : lastNameValidation.error || '',
    });

    return firstNameValidation.isValid && lastNameValidation.isValid;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Verify code with user details
      await verifyCode(sessionId, code, firstName.trim(), lastName.trim());
      
      // Register for notifications
      await registerForNotifications();

      // Navigation will be handled by AuthContext when authentication succeeds
    } catch (err: any) {
      Alert.alert(
        'Account Creation Failed',
        err.message || 'Unable to create your account. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleFirstNameChange = (text: string) => {
    setFirstName(text);
    if (errors.firstName) {
      setErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (text: string) => {
    setLastName(text);
    if (errors.lastName) {
      setErrors(prev => ({ ...prev, lastName: '' }));
    }
  };

  const isFormValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="user-details-screen"
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
              <Text style={styles.title}>Tell Us About Yourself</Text>
              <Text style={styles.subtitle}>
                Help us personalize your Cards After Dark experience with some basic information.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={handleFirstNameChange}
                placeholder="Enter your first name"
                autoComplete="given-name"
                autoCapitalize="words"
                error={errors.firstName}
                testID="first-name-input"
              />

              <Input
                label="Last Name"
                value={lastName}
                onChangeText={handleLastNameChange}
                placeholder="Enter your last name"
                autoComplete="family-name"
                autoCapitalize="words"
                error={errors.lastName}
                testID="last-name-input"
              />

              <Button
                title="Create Account"
                onPress={handleContinue}
                loading={isLoading}
                disabled={!isFormValid}
                testID="create-account-button"
              />

              <Text style={styles.disclaimer}>
                By creating an account, you confirm that you are 18+ years old and 
                agree to use this app responsibly with your consenting partner.
              </Text>
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