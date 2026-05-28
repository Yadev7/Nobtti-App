import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import { auth } from '../../constants/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [secureText, setSecureText] = useState(true); // Default to hidden

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("تنبيه", "عفاك دخل الإيميل وكلمة السر");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      // الـ Layout اللي صاوبنا غيتكلف يدخلك للـ Dashboard أوتوماتيكياً
    } catch (error: any) {
      setLoading(false);
      let message = "فشل تسجيل الدخول";
      if (error.code === 'auth/user-not-found') message = "الحساب ما كاينش";
      if (error.code === 'auth/wrong-password') message = "كلمة السر غلط";
      Alert.alert("خطأ", message);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>تسجيل الدخول 🔑</Title>

      <TextInput
        label="الإيميل"
        value={email}
        onChangeText={setEmail}
        mode="flat"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        label="كلمة السر"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry={secureText} // Use the state variable here
        right={
          <TextInput.Icon
            icon={secureText ? "eye" : "eye-off"}
            onPress={() => setSecureText(!secureText)}
          />
        }
      />

      {/* <TextInput
        label="كلمة السر"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      /> */}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        style={styles.button}
      >
        دخول
      </Button>

      <Button
        onPress={() => router.push('/signup' as any)}
        style={[styles.signUpButton]}
      >
        ماعندكش حساب؟ سجل دابا
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 30, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 15, color: '#6200ee', borderRadius: 10 },
  button: { marginTop: 10, paddingVertical: 5, borderRadius: 8, fontWeight: 'bold', color: '#fff' },
  signUpButton: { marginTop: 10, paddingVertical: 5, borderRadius: 8, fontWeight: 'bold', color: '#fff' },
});