import { useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { db } from '../constants/firebase';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false); // ستايت لمنع التكرار أثناء الاتصال بالفايربيس
  const router = useRouter();

  // إعداد مشغل الصوت بـ الأمان — loop defaults to false
  const player = useAudioPlayer(require('../assets/beep.mp3'));

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.text}>جاري تحميل الكاميرا... 📸</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { padding: 20 }]}>
        <Text style={[styles.text, { marginBottom: 20, fontSize: 16 }]}>خاصنا إذن الكاميرا باش نخدمو السكانيير ونأكدو الحضور.</Text>
        <Button mode="contained" onPress={requestPermission} buttonColor="#6200ee">إعطاء الإذن</Button>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    // تشغيل صوت البِيپ فوراً
    if (player) {
      player.seekTo(0);
      player.play();
    }

    try {
      const bookingRef = doc(db, "bookings", data);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();

        if (bookingData.status === 'completed') {
          Alert.alert("تنبيه ⚠️", "هاد الكود ديجا تسكانى وتم تأكيد الحضور من قبل.", [
            { text: "فهمت", onPress: () => { setScanned(false); setProcessing(false); } }
          ]);
          return;
        }

        if (bookingData.status === 'rejected') {
          Alert.alert("خطأ ❌", "هاد الموعد ملغي أو مرفوض من طرف المهني.", [
            { text: "فهمت", onPress: () => { setScanned(false); setProcessing(false); } }
          ]);
          return;
        }

        if (bookingData.status === 'confirmed') {
          await updateDoc(bookingRef, {
            status: 'completed',
            attendedAt: serverTimestamp()
          });

          Alert.alert("تم بنجاح ✅", "تم تأكيد حضور الزبون بنجاح وتقفل الموعد.", [
            { text: "ممتاز", onPress: () => router.back() }
          ]);
        } else if (bookingData.status === 'pending') {
          Alert.alert("تنبيه ⏳", "هاد الموعد مازال معلّق وما تقبلش ف السيستيم.", [
            { text: "فهمت", onPress: () => { setScanned(false); setProcessing(false); } }
          ]);
        }
      } else {
        Alert.alert("خطأ 🔍", "هاد الكود غير موجود أو خاسر.", [
          { text: "إغلاق", onPress: () => { setScanned(false); setProcessing(false); } }
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("مشكل تقني ⚠️", "وقع خطأ أثناء الاتصال بالسيرفر. حاول عاوتاني.");
      setScanned(false);
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* الـ Overlay والـ Framing Square للـ QR بشكل احترافي */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer} />
        <View style={styles.focusedContainer}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
        <View style={styles.unfocusedContainer} />
      </View>

      {processing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10 }}>جاري التحقق من الموعد...</Text>
        </View>
      )}

      <Button 
        mode="contained" 
        onPress={() => router.back()} 
        style={styles.backButton}
        disabled={processing}
      >
        إلغاء الرجوع
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  text: { textAlign: 'center', color: 'white', marginTop: 10 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  unfocusedContainer: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)' },
  focusedContainer: { width: 240, height: 240, backgroundColor: 'transparent' },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#6200ee' },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#6200ee' },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#6200ee' },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#6200ee' },
  backButton: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#6200ee', borderRadius: 8, paddingHorizontal: 10 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }
});