import * as Notifications from 'expo-notifications';
import { db } from '../constants/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * جلب الـ Push Token وحفظه في حساب المستخدم (مهني أو زبون) داخل كوليكشن users
 */
export const registerForPushNotificationsAsync = async (userId: string): Promise<string | undefined> => {
  let token: string;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('⚠️ فشل في جلب صلاحيات الإشعارات!');
    return;
  }

  try {
    // جلب الـ projectId أوتوماتيكياً من إعدادات Expo لتفادي الكراش
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("🚀 Expo Push Token Generated Successfully:", token);

    // تحديث التوكن في الفايربيس
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: token
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6200ee',
      });
    }

    return token;
  } catch (error) {
    console.error("❌ خطأ أثناء إعداد توكن الإشعارات:", error);
  }
};

/**
 * دالة موحدة واحترافية لإرسال الإشعارات عن طريق Expo API
 */
export const sendPushNotification = async (targetExpoToken: string, title: string, body: string): Promise<void> => {
  if (!targetExpoToken) return;

  const message = {
    to: targetExpoToken,
    sound: 'default',
    title: title,
    body: body,
    data: { screen: 'Appointments' }, 
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log("🔔 تم إرسال الإشعار بنجاح!");
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعار:", error);
  }
};