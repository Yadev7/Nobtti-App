import { useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { db } from '../constants/firebase';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  // إعداد مشغل الصوت
  const player = useAudioPlayer(require('../assets/beep.mp3'));

  useEffect(() => {
    if (player) {
      player.loop = false;
    }
  }, [player]);

  if (!permission) return <View style={styles.container}><Text>جاري تحميل الكاميرا...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>خاصنا إذن الكاميرا باش نخدمو السكانيير</Text>
        <Button mode="contained" onPress={requestPermission}>إعطاء الإذن</Button>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // تشغيل الصوت فوراً في جميع الحالات
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
          Alert.alert("تنبيه ⚠️", "هاد الكود ديجا تسكانى من قبل.", [
            { text: "فهمت", onPress: () => setScanned(false) }
          ]);
          return;
        }

        if (bookingData.status === 'rejected') {
          Alert.alert("خطأ ❌", "هاد الموعد ملغي أو مرفوض.", [
            { text: "فهمت", onPress: () => setScanned(false) }
          ]);
          return;
        }

        if (bookingData.status === 'confirmed') {
          await updateDoc(bookingRef, {
            status: 'completed',
            attendedAt: serverTimestamp()
          });

          Alert.alert("تم بنجاح ✅", "تم تأكيد حضور الزبون بنجاح.", [
            { text: "ممتاز", onPress: () => router.back() }
          ]);
        } else if (bookingData.status === 'pending') {
          Alert.alert("تنبيه ⏳", "هاد الموعد مازال ما تقبلش فـ السيستيم.", [
            { text: "فهمت", onPress: () => setScanned(false) }
          ]);
        }
      } else {
        Alert.alert("خطأ 🔍", "هاد الكود غير موجود.", [
          { text: "إغلاق", onPress: () => setScanned(false) }
        ]);
      }
    } catch {
      Alert.alert("مشكل تقني ⚠️", "وقع خطأ أثناء الاتصال.");
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

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

      <Button 
        mode="contained" 
        onPress={() => router.back()} 
        style={styles.backButton}
        // تأكد أنك ما دايرش أي props غريب هنا بحال compact إلا ما كانش مدعوم
      >
        إلغاء
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  text: { textAlign: 'center', color: 'white', marginBottom: 20 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  unfocusedContainer: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)' },
  focusedContainer: { width: 220, height: 220, backgroundColor: 'transparent' },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#6200ee' },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#6200ee' },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#6200ee' },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#6200ee' },
  backButton: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#6200ee' }
});