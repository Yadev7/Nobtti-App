import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Text, TextInput, Title } from 'react-native-paper';
import { auth, db } from '../../constants/firebase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [role, setRole] = useState('');

  // معلومات الحساب
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');

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
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const updateData: any = { fullName, phone };

        // إذا كان مهني، كنزيدو هاد المعلومات
        if (role === 'pro') {
          updateData.profession = profession;
          updateData.location = location;
        }

        await updateDoc(userRef, updateData);
        Alert.alert("تم بنجاح ✅", "تم تحديث معلوماتك الشخصية");
      }
    } catch (error) {
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
      {/* رأس الصفحة */}
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
          <TextInput
            label="الاسم الكامل"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="رقم الهاتف (WhatsApp)"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          {/* خانات خاصة بالمهني فقط */}
          {role === 'pro' && (
            <>
              <TextInput
                label="المهنة (مثلاً: حلاق، طبيب...)"
                value={profession}
                onChangeText={setProfession}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="العنوان / المدينة"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
              />
            </>
          )}

          <Button
            mode="contained"
            onPress={handleUpdate}
            loading={updating}
            disabled={updating}
            style={styles.saveBtn}
          >
            حفظ التغييرات
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            textColor="red"
            style={styles.logoutBtn}
          >
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
  nameText: { marginTop: 10, fontSize: 22, fontWeight: 'bold', color: '#6200ee', bottom: 10 },
  roleTag: { color: '#6200ee', fontWeight: 'bold', fontSize: 14, backgroundColor: '#eaddff', paddingHorizontal: 15, paddingVertical: 4, borderRadius: 20 },
  formCard: { marginHorizontal: 15, borderRadius: 15, elevation: 3 },
  input: { marginBottom: 15 },
  saveBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 5 },
  logoutBtn: { marginTop: 15, borderRadius: 8, borderColor: 'red' },
  footerText: { textAlign: 'center', marginTop: 30, color: '#999', fontSize: 12 }
});