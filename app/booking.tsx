import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ActivityIndicator, Avatar, Button, Card, Text, TextInput, Title } from 'react-native-paper';
import { auth, db } from '../constants/firebase'; // تأكد من صحة مسار ملف الفايربيس عندك
import { sendPushNotification } from '../services/notificationService'; // استدعاء الدالة الصحيحة من الـ Service

export default function BookingScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);

  const [proInfo, setProInfo] = useState<any>(null);

  const router = useRouter();
  const { adminId } = useLocalSearchParams(); // هاد الـ adminId كيمثل الـ professionalId

  useEffect(() => {
    const fetchAllData = async () => {
      const user = auth.currentUser;
      try {
        if (user) {
          // جلب بيانات الزبون الحالي من كوليكشن users
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setName(userDoc.data().fullName || '');
            setPhone(userDoc.data().phone || '');
          }
        }
        
        // جلب بيانات المهني من كوليكشن users
        const proDoc = await getDoc(doc(db, "users", adminId as string));
        if (proDoc.exists()) {
          setProInfo(proDoc.data());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFetchingUser(false);
      }
    };
    fetchAllData();
  }, [adminId]);

  const openGPS = () => {
    if (!proInfo?.locationCoords) {
      Alert.alert("تنبيه", "هاد المهني مازال ما حددش موقع المحل ديالو.");
      return;
    }
    const { latitude, longitude } = proInfo.locationCoords;
    const label = proInfo.fullName || "المحل";
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`
    });
    Linking.openURL(url!);
  };

  const handleBooking = async () => {
    if (!name || !phone || !service) {
      Alert.alert("تنبيه ⚠️", "عفاك عمر كاع المعلومات المطلوبة");
      return;
    }
    setLoading(true);
    try {
      // 1. حفظ الموعد في كوليكشن bookings
      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser?.uid,
        adminId: adminId, // ID ديال المهني
        customerName: name,
        phone: phone,
        service: service,
        appointmentDate: date.toISOString(),
        status: "pending",
        createdAt: serverTimestamp(),
        proName: proInfo?.fullName || '',
        proLocation: proInfo?.locationCoords || null
      });

      // 2. تفعيل الإشعار الفوري للمهني باستعمال الـ expoPushToken الصحيح
      if (proInfo?.expoPushToken) {
        // عيطنا لدالة الـ Service اللّي صاوبنا بـ بارامترات مطابقة
        await sendPushNotification(proInfo.expoPushToken, name);
      } else {
        console.log("المهني ما عندوش توكن مسجل، تم تجاوز الإشعار.");
      }

      setLoading(false);
      Alert.alert("تم بنجاح ✅", "الموعد تسجل بنجاح، وصصيفطنا إشعار فوري للمهني حالا.");
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
      Alert.alert("خطأ ❌", "وقع مشكل أثناء تأكيد الحجز، حاول مرة أخرى");
      setLoading(false);
    }
  };

  if (fetchingUser) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6200ee" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.proCard}>
        <Card.Content style={styles.proHeader}>
          <Avatar.Text size={50} label={proInfo?.fullName?.substring(0,1)} style={{ backgroundColor: '#6200ee' }} />
          <View style={{ marginLeft: 15, alignItems: 'flex-start' }}>
            <Title>{proInfo?.fullName}</Title>
            {/* مطابقة حقول التقييم الحقيقية: averageRating و reviewsCount */}
            <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>
              ⭐ {proInfo?.averageRating ? proInfo.averageRating.toFixed(1) : "جديد"} ({proInfo?.reviewsCount || 0} تقييم)
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Title style={styles.sectionTitle}>موقع المحل 📍</Title>
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: proInfo?.locationCoords?.latitude || 33.9716,
            longitude: proInfo?.locationCoords?.longitude || -6.8498,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
        >
          {proInfo?.locationCoords && <Marker coordinate={proInfo.locationCoords} title={proInfo.fullName} />}
        </MapView>
        <Button mode="contained" icon="navigation" onPress={openGPS} style={styles.gpsBtn}>
          وريني الطريق (GPS)
        </Button>
      </View>

      <Title style={styles.sectionTitle}>معلومات الحجز 📝</Title>
      
      <TextInput label="الاسم الكامل" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
      <TextInput label="رقم الهاتف" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} />
      <TextInput label="نوع الخدمة" value={service} onChangeText={setService} mode="outlined" style={styles.input} />

      <View style={styles.dateTimeContainer}>
        <Button mode="outlined" onPress={() => { setMode('date'); setShowPicker(true) }} icon="calendar" style={styles.dateTimeBtn}>
          {date.toLocaleDateString('ar-MA')}
        </Button>
        <Button mode="outlined" onPress={() => { setMode('time'); setShowPicker(true) }} icon="clock" style={styles.dateTimeBtn}>
          {date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
        </Button>
      </View>

      {showPicker && (
        <DateTimePicker value={date} mode={mode} is24Hour={true} minimumDate={new Date()} onChange={(e, d) => { setShowPicker(false); if (d) setDate(d) }} />
      )}

      <Button mode="contained" onPress={handleBooking} loading={loading} disabled={loading} style={styles.button}>
        تأكيد طلب الحجز
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa' },
  proCard: { marginBottom: 20, borderRadius: 15, backgroundColor: '#fff' },
  proHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#333', textAlign: 'right' },
  mapWrapper: { height: 200, borderRadius: 15, overflow: 'hidden', marginBottom: 20, elevation: 3 },
  map: { width: '100%', height: '100%' },
  gpsBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#6200ee' },
  input: { marginBottom: 12, backgroundColor: '#fff', textAlign: 'right' },
  dateTimeContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  dateTimeBtn: { flex: 1 },
  button: { paddingVertical: 5, borderRadius: 10, backgroundColor: '#6200ee' }
});