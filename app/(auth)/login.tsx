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
  const [secureText, setSecureText] = useState(true);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("تنبيه ⚠️", "عفاك دخل الإيميل وكلمة السر كاملين.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.error(error);
      let message = "فشل تسجيل الدخول، تأكد من معلوماتك.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') message = " هاد الحساب ما كاينش أو المعلومات غلط.";
      if (error.code === 'auth/wrong-password') message = "كلمة السر اللّي دخلتي غلط.";
      if (error.code === 'auth/invalid-email') message = "الصيغة د الإيميل غير صحيحة.";
      Alert.alert("خطأ ❌", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>تسجيل الدخول 🔑</Title>

      <TextInput
        label="الإيميل"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        autoCapitalize="none"
        keyboardType="email-address"
        activeOutlineColor="#6200ee"
      />

      <TextInput
        label="كلمة السر"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        activeOutlineColor="#6200ee"
        secureTextEntry={secureText}
        right={
          <TextInput.Icon
            icon={secureText ? "eye" : "eye-off"}
            onPress={() => setSecureText(!secureText)}
          />
        }
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        دخول
      </Button>

      <Button
        onPress={() => router.push('/signup' as any)}
        style={styles.signUpButton}
        textColor="#6200ee"
      >
        ماعندكش حساب؟ سجل دابا معنا
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 30, fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  inputContent: { textAlign: 'right', writingDirection: 'rtl' },
  button: { marginTop: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#6200ee' },
  signUpButton: { marginTop: 15 }
});