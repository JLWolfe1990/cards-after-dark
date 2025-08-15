import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQuery } from '@apollo/client';
import LinearGradient from 'react-native-linear-gradient';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { GET_ME } from '@/graphql/queries';
import { ACCEPT_INVITATION } from '@/graphql/mutations';

type Props = StackScreenProps<AuthStackParamList, 'InvitationAccept'>;

export const InvitationAcceptScreen: React.FC<Props> = ({ navigation, route }) => {
  const { invitationId } = route.params;
  const { theme } = useTheme();
  const { refreshAuth } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [invitingUser, setInvitingUser] = useState<{ firstName: string; lastName: string } | null>(null);

  const { data: userData } = useQuery(GET_ME);
  const [acceptInvitation] = useMutation(ACCEPT_INVITATION);

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
    inviterName: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    actionContainer: {
      marginTop: theme.spacing.xl,
    },
    declineButton: {
      marginTop: theme.spacing.md,
    },
    disclaimer: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      lineHeight: 18,
    },
  });

  useEffect(() => {
    // In a real implementation, you would fetch the invitation details
    // including the inviting user's name from the backend
    // For now, we'll use a placeholder
    setInvitingUser({ firstName: 'Your', lastName: 'Partner' });
  }, []);

  const handleAcceptInvitation = async () => {
    setIsLoading(true);

    try {
      const { data } = await acceptInvitation({
        variables: { invitationId },
      });

      if (data?.acceptInvitation) {
        Alert.alert(
          'Partnership Created!',
          'You and your partner are now connected. You can start playing Cards After Dark together!',
          [
            {
              text: 'Let\'s Play!',
              onPress: async () => {
                await refreshAuth();
                // Navigation will be handled automatically when couple is detected
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Unable to Accept Invitation',
        err.message || 'Something went wrong while accepting the invitation. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvitation = () => {
    Alert.alert(
      'Decline Invitation?',
      'Are you sure you want to decline this partnership invitation? You can always connect with your partner later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('PartnerInvitation');
          },
        },
      ]
    );
  };

  if (!userData?.me || !invitingUser) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="invitation-accept-screen"
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>You're Invited!</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.inviterName}>
                {invitingUser.firstName} {invitingUser.lastName}
              </Text>
              {' '}has invited you to be their partner on Cards After Dark.{'\n\n'}
              Accept to start your intimate card game journey together.
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <Button
              title="Accept Invitation"
              onPress={handleAcceptInvitation}
              loading={isLoading}
              testID="accept-invitation-button"
            />

            <Button
              title="Decline"
              variant="outline"
              onPress={handleDeclineInvitation}
              style={styles.declineButton}
              testID="decline-invitation-button"
            />

            <Text style={styles.disclaimer}>
              By accepting this invitation, you confirm that you are 18+ years old and 
              consent to participating in intimate card games with this partner.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};