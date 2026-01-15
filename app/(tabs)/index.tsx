import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ActivityIndicator, Avatar, Button, Card, IconButton, List, Text, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../constants/firebase';

export default function DashboardScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // حالات الـ QR Code والتقييم
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<any>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [comment, setComment] = useState('');

  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    let unsubscribe: () => void;

    if (user) {
      const fetchData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            setUserName(userData.fullName || 'مستخدم');

            let q;
            if (userData.role === 'pro') {
              q = query(collection(db, "bookings"), where("adminId", "==", user.uid));
            } else {
              q = query(collection(db, "bookings"), where("userId", "==", user.uid));
            }

            unsubscribe = onSnapshot(q, (snapshot) => {
              const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setStats({
                total: data.length,
                confirmed: data.filter((i: any) => i.status === 'confirmed').length,
                pending: data.filter((i: any) => i.status === 'pending').length,
              });
              setBookings(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
              setLoading(false);
            });
          }
        } catch {
          setLoading(false);
        }
      };
      fetchData();
    }
    return () => unsubscribe && unsubscribe();
  }, []);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });
      Alert.alert("تحديث", "تم تغيير حالة الموعد ✅");
    } catch {
      Alert.alert("خطأ", "فشل التحديث");
    }
  };

  const submitRating = async () => {
    if (!selectedBookingForRating) return;
    try {
      const bookingId = selectedBookingForRating.id;
      const proId = selectedBookingForRating.adminId;

      await updateDoc(doc(db, "bookings", bookingId), {
        rating: ratingScore,
        comment: comment,
        ratedAt: serverTimestamp(),
      });

      // تحديث متوسط تقييم المهني
      const proDocRef = doc(db, "users", proId);
      const proDoc = await getDoc(proDocRef);
      if (proDoc.exists()) {
        const data = proDoc.data();
        const oldCount = data.reviewsCount || 0;
        const oldRating = data.averageRating || 0;
        const newCount = oldCount + 1;
        const newAverage = ((oldRating * oldCount) + ratingScore) / newCount;

        await updateDoc(proDocRef, {
          averageRating: newAverage,
          reviewsCount: newCount
        });
      }

      Alert.alert("شكراً ✅", "تم تسجيل تقييمك بنجاح");
      setRatingModalVisible(false);
      setComment('');
    } catch {
      Alert.alert("خطأ", "فشل إرسال التقييم");
    }
  };

  const openInGPS = (coords: any) => {
    if (!coords) return;
    const url = Platform.select({
      ios: `maps:0,0?q=المحل@${coords.latitude},${coords.longitude}`,
      android: `geo:0,0?q=${coords.latitude},${coords.longitude}(المحل)`
    });
    Linking.openURL(url!);
  };

  const HeaderComponent = () => (
    <View>
      <View style={styles.userInfoSection}>
        <Avatar.Text size={50} label={userName.substring(0, 1)} style={{ backgroundColor: '#6200ee' }} />
        <View style={styles.userTextWrapper}>
          <Title style={styles.userNameText}>{userName}</Title>
          <Text style={styles.roleText}>واجهة {role === 'pro' ? "المهني" : "الزبون"}</Text>
        </View>
        <IconButton icon="logout" iconColor="red" size={26} onPress={() => signOut(auth)} />
      </View>

      {role === 'pro' && (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderTopColor: '#6200ee' }]}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statLab}>الكل</Text></View>
            <View style={[styles.statBox, { borderTopColor: 'green' }]}><Text style={[styles.statNum, { color: 'green' }]}>{stats.confirmed}</Text><Text style={styles.statLab}>مقبولة</Text></View>
            <View style={[styles.statBox, { borderTopColor: 'orange' }]}><Text style={[styles.statNum, { color: 'orange' }]}>{stats.pending}</Text><Text style={styles.statLab}>جديدة</Text></View>
          </View>
          <Button mode="contained" icon="qrcode-scan" onPress={() => router.push('/scanner' as any)} style={styles.scannerBtn}>
            سكاني كود زبون لتاكيد الحضور
          </Button>
        </>
      )}

      <Title style={styles.sectionTitle}>{role === 'pro' ? "طلبات الحجز الحالية" : "مواعيدي المحجوزة"}</Title>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد مواعيد حالياً</Text>}
        renderItem={({ item }) => {
          const displayTime = item.appointmentDate
            ? new Date(item.appointmentDate).toLocaleString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : item.time;

          return (
            <Card style={styles.card}>
              <Card.Content>
                <List.Item
                  title={role === 'pro' ? item.customerName : `حجز: ${item.service}`}
                  description={`الوقت: ${displayTime}`}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                  right={() => (
                    <Text style={[styles.statusTxt, { color: item.status === 'confirmed' ? 'green' : item.status === 'completed' ? '#6200ee' : 'orange' }]}>
                      {item.status === 'pending' ? '⏳ معلق' : item.status === 'confirmed' ? '✅ مقبول' : item.status === 'completed' ? '🏁 تم الحضور' : '❌ مرفوض'}
                    </Text>
                  )}
                />

                {/* الخريطة تظهر للزبون فقط في المواعيد المقبولة ليعرف الطريق */}
                {role === 'user' && item.status === 'confirmed' && item.proLocation && (
                  <View style={styles.itemMapContainer}>
                    <MapView 
                      style={styles.smallMap} 
                      scrollEnabled={false}
                      initialRegion={{
                        latitude: item.proLocation.latitude,
                        longitude: item.proLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                    >
                      <Marker coordinate={item.proLocation} />
                    </MapView>
                    <Button icon="navigation" onPress={() => openInGPS(item.proLocation)}>إطلاق نظام GPS</Button>
                  </View>
                )}
              </Card.Content>

              <Card.Actions>
                {role === 'pro' && item.status === 'pending' && (
                  <><Button onPress={() => updateStatus(item.id, 'confirmed')}>قبول</Button><Button onPress={() => updateStatus(item.id, 'rejected')}>رفض</Button></>
                )}
                {role === 'user' && item.status === 'confirmed' && (
                  <Button icon="qrcode" mode="contained" onPress={() => { setSelectedBookingId(item.id); setQrModalVisible(true); }}>كود الحضور</Button>
                )}
                {/* زر التقييم يظهر للزبون بعد انتهاء الخدمة */}
                {role === 'user' && item.status === 'completed' && !item.rating && (
                  <Button icon="star" mode="contained" buttonColor="#FFD700" textColor="#000" onPress={() => { setSelectedBookingForRating(item); setRatingModalVisible(true); }}>قيم الخدمة</Button>
                )}
                {item.status !== 'rejected' && item.status !== 'completed' && (
                  <IconButton icon="whatsapp" iconColor="green" onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)} />
                )}
              </Card.Actions>
            </Card>
          );
        }}
      />

      {/* Modal التقييم */}
      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title>كيف كانت خدمتك؟ ⭐</Title>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <IconButton key={s} icon={s <= ratingScore ? "star" : "star-outline"} iconColor="#FFD700" size={32} onPress={() => setRatingScore(s)} />
              ))}
            </View>
            <TextInput label="تعليقك (اختياري)" value={comment} onChangeText={setComment} mode="outlined" multiline style={styles.ratingInput} />
            <Button mode="contained" onPress={submitRating} style={styles.submitBtn}>إرسال التقييم</Button>
            <Button onPress={() => setRatingModalVisible(false)}>إلغاء</Button>
          </View>
        </View>
      </Modal>

      {/* مودال الـ QR Code */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title>وري الكود للمهني 🤳</Title>
            <QRCode value={selectedBookingId} size={200} color="#6200ee" />
            <Button onPress={() => setQrModalVisible(false)} style={{ marginTop: 20 }}>إغلاق</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15, paddingTop: 30 },
  userInfoSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 3, marginBottom: 20 },
  userTextWrapper: { flex: 1, marginLeft: 12 },
  userNameText: { fontSize: 18, fontWeight: 'bold', color: '#6200ee' },
  roleText: { fontSize: 12, color: '#777' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { width: '31%', backgroundColor: '#fff', padding: 10, borderRadius: 10, alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLab: { fontSize: 12, color: '#666' },
  scannerBtn: { marginBottom: 20, borderRadius: 12, backgroundColor: '#6200ee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  card: { marginBottom: 10, borderRadius: 12, backgroundColor: '#fff' },
  statusTxt: { fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center', width: '85%' },
  starsRow: { flexDirection: 'row', marginVertical: 10 },
  ratingInput: { width: '100%', marginBottom: 15 },
  submitBtn: { width: '100%', marginBottom: 5 },
  itemMapContainer: { height: 150, marginTop: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  smallMap: { width: '100%', height: 100 },
});