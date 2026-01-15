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

  // --- New state for the Dropdown Menu ---
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const professions = ["حلاق", "طبيب", "محامي", "ميكانيكي"];

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
        createdAt: new Date().toISOString(),
      });

      setLoading(false);
      Alert.alert("مبروك", "تم إنشاء حسابك بنجاح");
      router.replace('/(tabs)');
    } catch (error: any) {
      setLoading(false);
      Alert.alert("خطأ", error.message);
    }
  };

  return (
    <Provider>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>انشاء حساب جديد</Title>

        <TextInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} mode="flat" style={styles.input} />
        <TextInput label="الإيميل" value={email} onChangeText={setEmail} mode="flat" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput label="كلمة السر" value={password} onChangeText={setPassword} mode="flat" style={styles.input} secureTextEntry />

        {/* --- Role Selection --- */}
        <Text style={styles.label}>ساتسجل ك:</Text>
        <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
          <View style={styles.radioItem}><RadioButton value="pro" /><Text style={[styles.radioText, styles.radioButton]}>صاحب محل (مهني)</Text></View>
          <View style={styles.radioItem}><RadioButton value="user" /><Text style={[styles.radioText, styles.radioButton]}>زبون</Text></View>
        </RadioButton.Group>

        {/* --- Conditional Profession List (Only if role is pro) --- */}
        {role === 'pro' && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>حدد مجال عملك:</Text>
            <View style={styles.professionGrid}>
              {professions.map((p) => {
                const isSelected = profession === p;
                return (
                  <Card
                    key={p}
                    style={[
                      styles.professionCard,
                      isSelected && styles.selectedCard
                    ]}
                    onPress={() => setProfession(p)}
                  >
                    <Card.Content style={styles.cardContent}>
                      <Text style={[
                        styles.professionText,
                        isSelected && styles.selectedText
                      ]}>
                        {p}
                      </Text>
                      {isSelected}
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

        <Button onPress={() => router.replace('login' as any)} style={[styles.loginButton]}>
          عندك حساب؟ دخل من هنا
        </Button>
      </ScrollView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, justifyContent: 'center', backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 20, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 12, color: '#6200ee' },
  label: { marginTop: 15, marginBottom: 5, fontWeight: 'bold', fontSize: 16, color: '#6200ee' },
  radioItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 2, color: '#6200ee' },
  button: { marginTop: 25, paddingVertical: 5, color: '#6200ee' },
  radioText: { color: '#6200ee', fontSize: 16 },
  radioButton: { color: '#6200ee', fontSize: 16 },
  loginButton: { marginTop: 10, paddingVertical: 5, color: '#f21313', backgroundColor: '#808080', fontWeight: 'bold' },
  // Grid layout for Cards
  professionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  professionCard: {
    width: '48%', // Two columns
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    elevation: 0, // Flat look
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5', // Light purple background
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  professionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },

  // Style for Chips (if you choose Option 2)
  chipContainer: {
    flexDirection: 'row-reverse', // Matches Arabic text flow
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
