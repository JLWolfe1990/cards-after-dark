import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { GET_CURRENT_GAME_SESSION, GET_MY_COUPLE } from '@/graphql/queries';
import { DRAW_CARD } from '@/graphql/mutations';
import { PARTNER_CARD_DRAWN, PARTNER_VOTE } from '@/graphql/subscriptions';
import { GameSession, Card, DrawnCard } from '@cards-after-dark/shared';

export const GameScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user, couple } = useAuth();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessionData, loading: sessionLoading, refetch: refetchSession } = useQuery(GET_CURRENT_GAME_SESSION);
  const { data: coupleData } = useQuery(GET_MY_COUPLE);
  
  const [drawCard] = useMutation(DRAW_CARD);

  const gameSession: GameSession | null = sessionData?.currentGameSession || null;
  const currentCouple = coupleData?.myCouple || couple;

  // Subscribe to partner's card draws
  useSubscription(PARTNER_CARD_DRAWN, {
    variables: { coupleId: currentCouple?.id },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.partnerCardDrawn) {
        refetchSession();
      }
    },
    skip: !currentCouple?.id,
  });

  // Subscribe to partner votes
  useSubscription(PARTNER_VOTE, {
    variables: { coupleId: currentCouple?.id },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.partnerVote) {
        refetchSession();
      }
    },
    skip: !currentCouple?.id,
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    statusTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    statusText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    cardTitle: {
      ...theme.typography.h3,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    cardDescription: {
      ...theme.typography.body,
      color: theme.colors.text,
      lineHeight: 22,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    kinkFactor: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    actionSection: {
      marginTop: theme.spacing.lg,
    },
    partnersCard: {
      borderColor: theme.colors.accent,
      borderWidth: 1,
    },
  });

  const handleDrawCard = async () => {
    setIsDrawing(true);
    
    try {
      await drawCard();
      refetchSession();
    } catch (error: any) {
      Alert.alert(
        'Unable to Draw Card',
        error.message || 'Something went wrong while drawing your card. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDrawing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchSession();
    } finally {
      setRefreshing(false);
    }
  };

  const getUserCard = (): DrawnCard | null => {
    return gameSession?.userCards.find(card => card.userId === user?.id) || null;
  };

  const getPartnerCard = (): DrawnCard | null => {
    return gameSession?.userCards.find(card => card.userId !== user?.id) || null;
  };

  const renderCard = (drawnCard: DrawnCard, isPartner: boolean = false) => (
    <View key={drawnCard.card.id} style={[styles.cardContainer, isPartner && styles.partnersCard]}>
      <Text style={styles.cardTitle}>
        {isPartner ? "Partner's Card" : "Your Card"}
      </Text>
      <Text style={styles.cardTitle}>{drawnCard.card.title}</Text>
      <Text style={styles.cardDescription}>{drawnCard.card.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.kinkFactor}>
          Spice Level: {'🌶️'.repeat(drawnCard.card.kinkFactor)}
        </Text>
        <Text style={styles.kinkFactor}>
          {drawnCard.card.category}
        </Text>
      </View>
    </View>
  );

  const renderGameStatus = () => {
    if (!gameSession) {
      return (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Ready to Play?</Text>
          <Text style={styles.statusText}>
            Start today's card game by drawing your first card. 
            You and your partner will each draw a card, then vote on which one to try together.
          </Text>
        </View>
      );
    }

    const userCard = getUserCard();
    const partnerCard = getPartnerCard();

    switch (gameSession.status) {
      case 'waiting':
        if (!userCard) {
          return (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Your Turn</Text>
              <Text style={styles.statusText}>
                Draw your card for today's game. Your partner will also draw a card, 
                then you'll both vote on which activity to try together.
              </Text>
            </View>
          );
        } else if (!partnerCard) {
          return (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Waiting for Partner</Text>
              <Text style={styles.statusText}>
                You've drawn your card! Now waiting for your partner to draw theirs. 
                Once both cards are drawn, you can start voting.
              </Text>
            </View>
          );
        }
        break;

      case 'drawn':
        return (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Time to Vote!</Text>
            <Text style={styles.statusText}>
              Both cards are drawn. Review the options below and vote for 
              the activity you'd prefer to try together tonight.
            </Text>
          </View>
        );

      case 'voting':
        return (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Voting in Progress</Text>
            <Text style={styles.statusText}>
              Voting is underway. Make sure both you and your partner have cast your votes.
            </Text>
          </View>
        );

      case 'selected':
        return (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Activity Selected!</Text>
            <Text style={styles.statusText}>
              You've chosen tonight's activity. Enjoy your intimate time together 
              and don't forget to rate the experience when you're done!
            </Text>
          </View>
        );

      case 'completed':
        return (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Game Complete!</Text>
            <Text style={styles.statusText}>
              Great job completing today's activity! Come back tomorrow for new cards 
              and continue building your intimate connection.
            </Text>
          </View>
        );
    }

    return null;
  };

  if (sessionLoading) {
    return <LoadingScreen />;
  }

  if (!currentCouple) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.background}
        style={styles.container}
      >
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Find Your Partner</Text>
            <Text style={styles.subtitle}>
              Cards After Dark is designed for couples. Invite your partner to unlock the full experience.
            </Text>
          </View>
          
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Single Player Mode</Text>
            <Text style={styles.statusText}>
              While you can browse cards solo, the magic happens when you play with your partner. 
              Visit your profile to send an invitation and start your intimate journey together.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  const userCard = getUserCard();
  const partnerCard = getPartnerCard();

  return (
    <LinearGradient
      colors={theme.colors.gradient.background}
      style={styles.container}
      testID="game-screen"
    >
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Today's Cards</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {renderGameStatus()}

        {userCard && renderCard(userCard)}
        {partnerCard && renderCard(partnerCard, true)}

        <View style={styles.actionSection}>
          {!userCard && (
            <Button
              title="Draw Your Card"
              onPress={handleDrawCard}
              loading={isDrawing}
              testID="draw-card-button"
            />
          )}

          {gameSession?.status === 'drawn' && (
            <Button
              title="Start Voting"
              onPress={() => {
                // Navigation to voting screen would go here
                // navigation.navigate('Voting');
              }}
              testID="start-voting-button"
            />
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};