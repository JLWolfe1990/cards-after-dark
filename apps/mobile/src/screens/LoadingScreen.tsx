import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

export const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    loader: {
      marginTop: theme.spacing.lg,
    },
  });

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="loading-screen"
    >
      <View style={styles.content}>
        <Text style={styles.title}>Cards After Dark</Text>
        <Text style={styles.subtitle}>Loading your intimate experience...</Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
          testID="loading-indicator"
        />
      </View>
    </LinearGradient>
  );
};