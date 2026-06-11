import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../constants/firebase';
import { ActivityIndicator, View } from 'react-native';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (mounted && userDoc.exists()) {
            setRole(userDoc.data().role);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6200ee' }}>
      {/* هاد التاب غايبان فقط للزبون (User) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'المهنيين',
          href: role === 'pro' ? null : '/explore', // هاد السطر هو اللي كيخفي التاب للمهني
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={28} color={color} />,
        }}
      />

      {/* هاد التاب (Dashboard) غايبان لكلشي ولكن بمحتوى مختلف */}
      <Tabs.Screen
        name="index"
        options={{
          title: role === 'pro' ? 'لوحة التحكم' : 'مواعيدي',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-check" size={28} color={color} />,
        }}
      />
      
      {/* تقدر تزيد هنا تاب "البروفايل" اللي غانصاوبوه */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-circle" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}