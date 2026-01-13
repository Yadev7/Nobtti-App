import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { auth, db } from '../constants/firebase';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
  const authListener = onAuthStateChanged(auth, async (user) => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else {
      try {
        // كنحاولوا نجيبوا البيانات وبقاو نتسناو واحد شوية حيت الزبون الجديد كياخد وقت باش يتسجل فـ Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // التوجيه كيوقع فقط إلا كنا فـ صفحات التسجيل/الدخول
          if (inAuthGroup || segments.length === 0) {
            if (userData?.role === 'pro') {
              router.replace('/(tabs)');
            } else {
              router.replace('/(tabs)/explore' as any);
            }
          }
        } else {
          // إلا المستخدم كاين فـ Auth ولكن مازال ما كاينش فـ Firestore (زبون يلاه كيتسجل)
          // كنعطيوه وقت بسيط يعاود يحاول
          console.log("Waiting for user document...");
        }
      } catch (error) {
        console.error("Error redirecting user:", error);
      }
    }
  });

  return () => authListener();
}, [segments]);

  return (
    <PaperProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="booking" options={{ presentation: 'modal' }} />
    </Stack>
    </PaperProvider>
  );
}