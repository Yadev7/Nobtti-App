import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Provider, RadioButton, Text, TextInput, Title } from 'react-native-paper';
import { auth, db } from '../../constants/firebase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('حلاق');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [role, setRole] = useState('pro');

  // اللستة الرسمية الموحدة للمهن فـ نوبتي
  const professions = ["حلاق", "طبيب", "محامي", "ميكانيكي", "خياط", "مصلح"];

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      Alert.alert("خطأ", "عفاك عمر كاع الخانات");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: fullName,
        email: email,
        profession: role === 'pro' ? profession : 'زبون',
        role: role,
        phone: '', // حقل فارغ أولي لتفادي الـ undefined
        location: '',
        locationCoords: null,
        averageRating: 0,
        reviewsCount: 0,
        createdAt: new Date().toISOString(),
      });

      setLoading(false);
      Alert.alert("مبروك 🎉", "تم إنشاء حسابك بنجاح");
      router.replace(role === 'pro' ? '/(tabs)' : '/(tabs)/explore');
    } catch (error: any) {
      setLoading(false);
      Alert.alert("خطأ ❌", error.message);
    }
  };

  return (
    <Provider>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>إنشاء حساب جديد ✨</Title>

        <TextInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} mode="flat" style={styles.input} />
        <TextInput label="الإيميل" value={email} onChangeText={setEmail} mode="flat" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput label="كلمة السر" value={password} onChangeText={setPassword} mode="flat" style={styles.input} secureTextEntry />

        <Text style={styles.label}>ساتسجل ك:</Text>
        <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
          <View style={styles.radioItem}><RadioButton value="pro" /><Text style={styles.radioText}>صاحب محل (مهني)</Text></View>
          <View style={styles.radioItem}><RadioButton value="user" /><Text style={styles.radioText}>زبون</Text></View>
        </RadioButton.Group>

        {role === 'pro' && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>حدد مجال عملك:</Text>
            <View style={styles.professionGrid}>
              {professions.map((p) => {
                const isSelected = profession === p;
                return (
                  <Card
                    key={p}
                    style={[styles.professionCard, isSelected && styles.selectedCard]}
                    onPress={() => setProfession(p)}
                  >
                    <Card.Content style={styles.cardContent}>
                      <Text style={[styles.professionText, isSelected && styles.selectedText]}>{p}</Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        <Button mode="contained" onPress={handleSignup} loading={loading} style={styles.button}>
          إنشاء الحساب
        </Button>

        <Button onPress={() => router.replace('login' as any)} style={styles.loginButton}>
          عندك حساب؟ دخل من هنا
        </Button>
      </ScrollView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, justifyContent: 'center', backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 20, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 12, textAlign: 'right' },
  label: { marginTop: 15, marginBottom: 5, fontWeight: 'bold', fontSize: 16, color: '#6200ee', textAlign: 'right' },
  radioItem: { flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 4, justifyContent: 'flex-end' },
  button: { marginTop: 25, paddingVertical: 5, backgroundColor: '#6200ee' },
  radioText: { color: '#6200ee', fontSize: 16, marginRight: 10 },
  loginButton: { marginTop: 15, paddingVertical: 5, color: '#6200ee' },
  professionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  professionCard: { width: '48%', marginBottom: 10, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', elevation: 0 },
  selectedCard: { borderColor: '#6200ee', backgroundColor: '#f3e5f5', borderWidth: 2 },
  cardContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  professionText: { fontSize: 16, color: '#333' },
  selectedText: { color: '#6200ee', fontWeight: 'bold' },
});