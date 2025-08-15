import AWS from 'aws-sdk';
import { CoupleProfile, User, PushNotification, NOTIFICATION_TIME } from '@cards-after-dark/shared';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

// Lambda function triggered by EventBridge at every hour
export const sendDailyNotifications = async (event: any) => {
  try {
    console.log('Starting daily notifications job');
    
    // Get all couples
    const couples = await getAllCouples();
    console.log(`Found ${couples.length} couples`);
    
    // Filter by timezone (7 PM local time)
    const currentHour = new Date().getUTCHours();
    const couplesForNotification: CoupleProfile[] = [];
    
    for (const couple of couples) {
      const shouldNotify = await shouldSendNotificationNow(couple, currentHour);
      if (shouldNotify) {
        couplesForNotification.push(couple);
      }
    }
    
    console.log(`Sending notifications to ${couplesForNotification.length} couples`);
    
    // Send notifications
    let successCount = 0;
    let errorCount = 0;
    
    for (const couple of couplesForNotification) {
      try {
        await sendCoupleNotification(couple);
        successCount++;
      } catch (error) {
        console.error(`Failed to notify couple ${couple.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Notifications sent: ${successCount} successful, ${errorCount} errors`);
    
    return { 
      success: true, 
      notificationsSent: successCount,
      errors: errorCount,
      totalCouples: couples.length 
    };
  } catch (error) {
    console.error('Daily notifications job failed:', error);
    throw error;
  }
};

const getAllCouples = async (): Promise<CoupleProfile[]> => {
  const tableName = `CardsAfterDark-Couples-${process.env.STAGE || 'dev'}`;
  
  const result = await dynamodb.scan({
    TableName: tableName,
  }).promise();
  
  if (!result.Items) return [];
  
  // Get users for each couple
  const couples: CoupleProfile[] = [];
  
  for (const coupleData of result.Items) {
    try {
      // Get users
      const users = await Promise.all(
        coupleData.userIds.map(async (userId: string) => {
          const userResult = await dynamodb.get({
            TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
            Key: { id: userId },
          }).promise();
          return userResult.Item as User;
        })
      );
      
      couples.push({
        ...coupleData,
        users: users.filter(Boolean),
      } as CoupleProfile);
    } catch (error) {
      console.error(`Error loading couple ${coupleData.id}:`, error);
    }
  }
  
  return couples;
};

const shouldSendNotificationNow = async (couple: CoupleProfile, currentHour: number): Promise<boolean> => {
  try {
    // Get notification time from preferences (default 7 PM)
    const notificationTime = couple.preferences?.notificationTime || NOTIFICATION_TIME;
    const [hours] = notificationTime.split(':').map(Number);
    
    // For now, assume UTC timezone (in production, would use user's timezone)
    // Check if it's the right hour
    if (currentHour !== hours) {
      return false;
    }
    
    // Check if we already sent notification today
    const today = new Date().toISOString().split('T')[0];
    const existingSession = await dynamodb.get({
      TableName: `CardsAfterDark-GameSessions-${process.env.STAGE || 'dev'}`,
      Key: { 
        coupleId: couple.id, 
        date: today 
      },
    }).promise();
    
    // Only send if no game session exists for today (first notification)
    return !existingSession.Item;
  } catch (error) {
    console.error('Error checking notification timing:', error);
    return false;
  }
};

const sendCoupleNotification = async (couple: CoupleProfile): Promise<void> => {
  const message: PushNotification = {
    title: "Time to play! 🔥",
    body: "Your personalized cards are ready for tonight",
    data: {
      type: 'daily_cards',
      coupleId: couple.id,
    }
  };
  
  // Send to both partners
  const notifications = couple.users.map(async (user) => {
    if (!user.fcmToken) {
      console.log(`No FCM token for user ${user.id}, skipping push notification`);
      return;
    }
    
    try {
      // For now, using SMS as fallback (in production, would use FCM)
      await sns.publish({
        PhoneNumber: user.phoneNumber,
        Message: `${message.title} ${message.body}. Open CardsAfterDark now!`,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'CardsAD'
          }
        }
      }).promise();
      
      console.log(`Notification sent to ${user.phoneNumber}`);
    } catch (error) {
      console.error(`Failed to send notification to ${user.phoneNumber}:`, error);
      throw error;
    }
  });
  
  await Promise.all(notifications);
};

// Function to send a push notification to a specific user
export const sendPushNotification = async (
  user: User, 
  notification: PushNotification
): Promise<void> => {
  if (!user.fcmToken) {
    console.log(`No FCM token for user ${user.id}, cannot send push notification`);
    return;
  }
  
  try {
    // In production, would use Firebase Admin SDK
    // For now, fallback to SMS
    await sns.publish({
      PhoneNumber: user.phoneNumber,
      Message: `${notification.title}: ${notification.body}`,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'CardsAD'
        }
      }
    }).promise();
    
    console.log(`Push notification sent to user ${user.id}`);
  } catch (error) {
    console.error(`Failed to send push notification to user ${user.id}:`, error);
    throw error;
  }
};

// Function to send notification when partner draws card
export const notifyPartnerCardDrawn = async (
  partnerId: string, 
  drawnCardTitle: string
): Promise<void> => {
  try {
    const partner = await dynamodb.get({
      TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
      Key: { id: partnerId },
    }).promise();
    
    if (!partner.Item) {
      console.error(`Partner ${partnerId} not found`);
      return;
    }
    
    const notification: PushNotification = {
      title: "Your partner drew a card! 💕",
      body: `They selected: "${drawnCardTitle}". Time to draw yours!`,
      data: {
        type: 'partner_action',
      }
    };
    
    await sendPushNotification(partner.Item as User, notification);
  } catch (error) {
    console.error('Failed to notify partner of card draw:', error);
  }
};

// Function to send notification when voting is complete
export const notifyVotingComplete = async (
  coupleId: string,
  selectedCardTitle: string
): Promise<void> => {
  try {
    const couple = await dynamodb.get({
      TableName: `CardsAfterDark-Couples-${process.env.STAGE || 'dev'}`,
      Key: { id: coupleId },
    }).promise();
    
    if (!couple.Item) {
      console.error(`Couple ${coupleId} not found`);
      return;
    }
    
    const users = await Promise.all(
      couple.Item.userIds.map(async (userId: string) => {
        const userResult = await dynamodb.get({
          TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
          Key: { id: userId },
        }).promise();
        return userResult.Item as User;
      })
    );
    
    const notification: PushNotification = {
      title: "Tonight's activity chosen! 🎉",
      body: `You'll be doing: "${selectedCardTitle}". Have fun!`,
      data: {
        type: 'voting_complete',
      }
    };
    
    await Promise.all(
      users.filter(Boolean).map(user => sendPushNotification(user, notification))
    );
  } catch (error) {
    console.error('Failed to notify voting complete:', error);
  }
};