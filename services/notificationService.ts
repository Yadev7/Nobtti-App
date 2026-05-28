import * as Notifications from 'expo-notifications';
import { db } from '../constants/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * جلب الـ Push Token وحفظه في حساب المهني داخل كوليكشن users
 */
export const registerForPushNotificationsAsync = async (professionalId: string): Promise<string | undefined> => {
  let token: string;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('فشل في جلب صلاحيات الإشعارات!');
    return;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token Generated:", token);

    // تحديث التوكن في كوليكشن users العامة
    const professionalRef = doc(db, 'users', professionalId);
    await updateDoc(professionalRef, {
      expoPushToken: token
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error("خطأ أثناء إعداد توكن الإشعارات:", error);
  }
};

/**
 * إرسال إشعار فوري للمهني عند قيام زبون بحجز موعد
 */
export const sendPushNotification = async (targetExpoToken: string, customerName: string): Promise<void> => {
  if (!targetExpoToken) return;

  const message = {
    to: targetExpoToken,
    sound: 'default',
    title: '🔔 موعد جديد معلّق!',
    body: `قام الزبون ${customerName} بحجز موعد جديد عندك، يرجى المراجعة والقبول.`,
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
    console.log("تم إرسال الإشعار بنجاح! 🚀");
  } catch (error) {
    console.error("خطأ في إرسال الإشعار:", error);
  }
};