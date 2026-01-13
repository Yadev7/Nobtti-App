import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, TextInput, Title } from 'react-native-paper';
import { auth, db } from '../constants/firebase';
// 1. استيراد المكتبة (تأكد انك درتي ليها npx expo install @react-native-community/datetimepicker)
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BookingScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  
  // 2. حالات (States) جديدة للتاريخ والوقت
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);

  const router = useRouter();
  const { adminId } = useLocalSearchParams();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setName(userData.fullName || '');
            setPhone(userData.phone || ''); 
          }
        } catch (error) {
          console.error("Error fetching user info:", error);
        } finally {
          setFetchingUser(false);
        }
      }
    };
    fetchUserData();
  }, []);

  // 3. دالة التحكم في اختيار التاريخ والوقت
  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(false); // كنسدوه فاش كيختار
    setDate(currentDate);
  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  const handleBooking = async () => {
    if (!name || !phone || !service) {
      Alert.alert("تنبيه", "عفاك عمر كاع المعلومات المطلوبة");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser?.uid,
        adminId: adminId,
        customerName: name,
        phone: phone,
        service: service,
        // 4. حفظ التاريخ كـ ISO String باش يسهل ترتيبه لاحقاً
        appointmentDate: date.toISOString(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      Alert.alert("تم بنجاح ✅", "الموعد ديالك تسجل، غيتواصل معاك المهني قريباً", [
        { text: "موافق", onPress: () => router.replace('/(tabs)') }
      ]);
    } catch {
      setLoading(false);
      Alert.alert("خطأ", "وقع مشكل، حاول مرة أخرى");
    }
  };

  if (fetchingUser) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>حجز موعد جديد 📝</Title>

      <TextInput
        label="شنو سميتك؟"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="account" />}
      />

      <TextInput
        label="رقم الهاتف"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        keyboardType="phone-pad"
        style={styles.input}
        placeholder="0612345678"
        left={<TextInput.Icon icon="phone" />}
      />

      <TextInput
        label="نوع الخدمة"
        value={service}
        onChangeText={setService}
        mode="outlined"
        style={styles.input}
        placeholder="مثلاً: حلاقة، فحص طبي..."
        left={<TextInput.Icon icon="briefcase" />}
      />

      {/* 5. واجهة اختيار التاريخ والوقت عوض الكنابة اليدوية */}
      <View style={styles.dateTimeContainer}>
        <Button 
          mode="outlined" 
          onPress={() => showMode('date')} 
          icon="calendar" 
          style={styles.dateTimeBtn}
        >
          {date.toLocaleDateString('ar-MA')}
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => showMode('time')} 
          icon="clock" 
          style={styles.dateTimeBtn}
        >
          {date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
        </Button>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode={mode}
          is24Hour={true}
          minimumDate={new Date()} // ممنوع يختار تاريخ قديم
          onChange={onChange}
        />
      )}

      <HelperText type="info" style={styles.helperText}>راجع معلوماتك قبل تأكيد الطلب</HelperText>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleBooking}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ height: 50 }}
        >
          تأكيد طلب الحجز
        </Button>

        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={loading}
          contentStyle={{ height: 50 }}
        >
          رجوع
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 30, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 15 },
  dateTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
  dateTimeBtn: { flex: 1, borderColor: '#6200ee' },
  buttonContainer: { marginTop: 20, gap: 10 },
  button: { borderRadius: 8, backgroundColor: '#6200ee' },
  backButton: { borderRadius: 8, borderColor: '#6200ee' },
  helperText: { textAlign: 'center', marginBottom: 10, color: '#6200ee', fontSize: 12, fontWeight: 'bold' },
});