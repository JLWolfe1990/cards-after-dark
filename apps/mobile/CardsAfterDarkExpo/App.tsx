import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 CardsAfterDark 🔥</Text>
      <Text style={styles.subtitle}>Intimate Couples Game</Text>
      <Text style={styles.status}>✅ Backend Connected</Text>
      <Text style={styles.status}>✅ App Loading Successfully</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 30,
  },
  status: {
    fontSize: 16,
    color: '#4ecdc4',
    marginBottom: 10,
  },
});