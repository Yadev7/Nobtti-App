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
  const [phone, setPhone] = useState(''); // ✨ تعديل: ستايت جديد لرقم الهاتف إجباري ف الـ Signup
  const [profession, setProfession] = useState('حلاق');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('pro');
  const router = useRouter();

  const professions = ["حلاق", "طبيب", "محامي", "ميكانيكي", "خياط", "مصلح"];

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim() || !phone.trim()) {
      Alert.alert("خطأ ⚠️", "عفاك عمر كاع الخانات بما فيها رقم الهاتف.");
      return;
    }

    if (phone.trim().length < 10) {
      Alert.alert("خطأ ⚠️", "عفاك دخل رقم هاتف مغربي صحيح (مثلا: 0661xxxxxx).");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // حفظ الـ Data كاملة مكمولة ف الـ Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(), // الحقل دابا عامر ومضمون للـ WhatsApp والإشعارات
        profession: role === 'pro' ? profession : 'زبون',
        role: role,
        location: '',
        locationCoords: null,
        averageRating: 0,
        reviewsCount: 0,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("مبروك 🎉", "تم إنشاء حسابك بنجاح ف نوبتي.");
      router.replace(role === 'pro' ? '/(tabs)' : '/(tabs)/explore');
    } catch (error: any) {
      console.error(error);
      let errMsg = error.message;
      if (error.code === 'auth/email-already-in-use') errMsg = "هاد الإيميل ديجا مسجل بيه حساب آخر.";
      if (error.code === 'auth/weak-password') errMsg = "كلمة السر ضعيفة، خاصها تكون من 6 د الرموز أو أكثر.";
      Alert.alert("خطأ ❌", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Provider>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>إنشاء حساب جديد ✨</Title>

        <TextInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} contentStyle={styles.inputContent} activeOutlineColor="#6200ee" />
        <TextInput label="رقم الهاتف (WhatsApp)" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} contentStyle={styles.inputContent} activeOutlineColor="#6200ee" placeholder="06xxxxxxxx" />
        <TextInput label="الإيميل" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} contentStyle={styles.inputContent} activeOutlineColor="#6200ee" keyboardType="email-address" autoCapitalize="none" />
        <TextInput label="كلمة السر" value={password} onChangeText={setPassword} mode="outlined" style={styles.input} contentStyle={styles.inputContent} activeOutlineColor="#6200ee" secureTextEntry />

        <Text style={styles.label}>سأتسجل كـ:</Text>
        <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
          <View style={styles.radioItem}><RadioButton value="pro" color="#6200ee" /><Text style={styles.radioText}>صاحب محل (مهني)</Text></View>
          <View style={styles.radioItem}><RadioButton value="user" color="#6200ee" /><Text style={styles.radioText}>زبون عادي</Text></View>
        </RadioButton.Group>

        {role === 'pro' && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>حدد مجال عملك الحالي:</Text>
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

        <Button mode="contained" onPress={handleSignup} loading={loading} disabled={loading} style={styles.button}>
          إنشاء الحساب وتأكيده
        </Button>

        <Button onPress={() => router.replace('login' as any)} style={styles.loginButton} textColor="#6200ee">
          عندك حساب؟ دخل مباشرة من هنا
        </Button>
      </ScrollView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, justifyContent: 'center', backgroundColor: '#fff', paddingTop: 40 },
  title: { textAlign: 'center', marginBottom: 20, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  inputContent: { textAlign: 'right', writingDirection: 'rtl' },
  label: { marginTop: 15, marginBottom: 5, fontWeight: 'bold', fontSize: 16, color: '#6200ee', textAlign: 'right' },
  radioItem: { flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 4, justifyContent: 'flex-end' },
  radioText: { color: '#333', fontSize: 16, marginRight: 10 },
  button: { marginTop: 25, paddingVertical: 5, backgroundColor: '#6200ee', borderRadius: 8 },
  loginButton: { marginTop: 15 },
  professionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  professionCard: { width: '48%', marginBottom: 10, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', elevation: 0 },
  selectedCard: { borderColor: '#6200ee', backgroundColor: '#f3e5f5', borderWidth: 2 },
  cardContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  professionText: { fontSize: 16, color: '#333' },
  selectedText: { color: '#6200ee', fontWeight: 'bold' },
});