import * as Location from 'expo-location'; // مكتبة الموقع
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Text, TextInput, Title } from 'react-native-paper';
import { auth, db } from '../../constants/firebase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [locating, setLocating] = useState(false); // حالة جلب الموقع
  const [role, setRole] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<any>(null); // حفظ الإحداثيات

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
          setRole(data.role || 'user');
          setProfession(data.profession || '');
          setLocation(data.location || '');
          setLocationCoords(data.locationCoords || null); // جلب الموقع المحفوظ
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // دالة جلب إحداثيات المحل (GPS)
  const handleGetLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("تنبيه", "خاصك تعطي إذن الوصول للموقع باش نحدد بلاصة المحل.");
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
      };
      
      setLocationCoords(coords);
      Alert.alert("تم بنجاح ✅", "لقينا إحداثيات المحل ديالك، ما تنساش تبرك على حفظ التغييرات.");
    } catch (_) {
      Alert.alert("خطأ", "ما قدرناش نجيبو الموقع، تأكد من GPS.");
    } finally {
      setLocating(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const updateData: any = { fullName, phone };

        if (role === 'pro') {
          updateData.profession = profession;
          updateData.location = location;
          updateData.locationCoords = locationCoords; // حفظ الإحداثيات فـ Firestore
        }

        await updateDoc(userRef, updateData);
        Alert.alert("تم بنجاح ✅", "تم تحديث معلوماتك الشخصية");
      }
    } catch (_) {
      Alert.alert("خطأ", "وقع مشكل أثناء التحديث");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("خروج", "واش بغيتي تخرج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={fullName.substring(0, 1)}
          style={{ backgroundColor: '#6200ee' }}
        />
        <Title style={styles.nameText}>{fullName}</Title>
        <Text style={styles.roleTag}>
          {role === 'pro' ? "حساب مهني" : "حساب زبون"}
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Card.Content>
          <TextInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} />
          <TextInput label="رقم الهاتف (WhatsApp)" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} />

          {role === 'pro' && (
            <>
              <TextInput label="المهنة (مثلاً: حلاق...)" value={profession} onChangeText={setProfession} mode="outlined" style={styles.input} />
              <TextInput label="العنوان (كتابةً)" value={location} onChangeText={setLocation} mode="outlined" style={styles.input} />
              
              {/* جزء تحديد الموقع الجغرافي */}
              <View style={styles.locationSection}>
                <Text style={styles.locationTitle}>موقع المحل على الخريطة 🗺️</Text>
                <Button 
                  mode="outlined" 
                  icon="map-marker-radius" 
                  onPress={handleGetLocation}
                  loading={locating}
                  style={styles.locationBtn}
                >
                  {locationCoords ? "تحديث إحداثيات الموقع" : "تحديد موقع المحل حالياً"}
                </Button>
                {locationCoords && (
                  <Text style={styles.locationStatus}>✅ الموقع مسجل بنجاح</Text>
                )}
              </View>
            </>
          )}

          <Button mode="contained" onPress={handleUpdate} loading={updating} disabled={updating} style={styles.saveBtn}>
            حفظ التغييرات
          </Button>

          <Button mode="outlined" onPress={handleLogout} textColor="red" style={styles.logoutBtn}>
            تسجيل الخروج
          </Button>
        </Card.Content>
      </Card>

      <Text style={styles.footerText}>نوبتي v1.0.0 - جميع الحقوق محفوظة</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  nameText: { marginTop: 10, fontSize: 22, fontWeight: 'bold', color: '#6200ee' },
  roleTag: { color: '#6200ee', fontWeight: 'bold', fontSize: 14, backgroundColor: '#eaddff', paddingHorizontal: 15, paddingVertical: 4, borderRadius: 20 },
  formCard: { marginHorizontal: 15, borderRadius: 15, elevation: 3 },
  input: { marginBottom: 15 },
  saveBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 5 },
  logoutBtn: { marginTop: 15, borderRadius: 8, borderColor: 'red' },
  footerText: { textAlign: 'center', marginTop: 30, color: '#999', fontSize: 12 },
  locationSection: { marginBottom: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed' },
  locationTitle: { fontSize: 14, marginBottom: 10, fontWeight: 'bold' },
  locationBtn: { borderRadius: 8 },
  locationStatus: { color: 'green', fontSize: 12, marginTop: 5, textAlign: 'center', fontWeight: 'bold' }
});