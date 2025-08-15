import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

export const HistoryScreen: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      textAlign: 'center',
    },
  });

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="history-screen"
    >
      <Text style={styles.title}>History Screen Coming Soon</Text>
    </LinearGradient>
  );
};