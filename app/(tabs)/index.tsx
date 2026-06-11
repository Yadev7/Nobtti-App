import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, IconButton, List, Text, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../constants/firebase';
import { registerForPushNotificationsAsync } from '../../services/notificationService';
import { submitReviewAndUpdateProfessional } from '../../services/ratingService'; // 🛡️ استدعاء خدمة تقييم المهني

export default function DashboardScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
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
            if (userData.role === 'pro') {
              await registerForPushNotificationsAsync(user.uid);
            }

            let q;
            if (userData.role === 'pro') {
              q = query(collection(db, "bookings"), where("adminId", "==", user.uid));
            } else {
              q = query(collection(db, "bookings"), where("userId", "==", user.uid));
            }

            setLoading(false);

            unsubscribe = onSnapshot(q, 
              (snapshot) => {
                const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStats({
                  total: data.length,
                  confirmed: data.filter((i: any) => i.status === 'confirmed').length,
                  pending: data.filter((i: any) => i.status === 'pending').length,
                });

                setBookings(data.sort((a, b) => {
                  const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                  const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                  return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                }));
              },
              (error) => {
                console.error("🚨 الخطأ ف الـ Firestore Snapshot: ", error.message);
              }
            );
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("❌ خطأ ف الـ fetchData: ", error);
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
    return () => unsubscribe && unsubscribe();
  }, []);

  const updateStatus = async (bookingId: string, bookingItem: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });
      Alert.alert("تحديث ✅", "تم تغيير حالة الموعد بنجاح");
    } catch (error) {
      console.error(error);
    }
  };

  const submitRating = async () => {
    if (!selectedBookingForRating) return;
    try {
      const bookingId = selectedBookingForRating.id;
      const proId = selectedBookingForRating.adminId; 
      const customerId = auth.currentUser?.uid;

      if (!customerId) return;

      // 1. تحديث تقييم الموعد
      await updateDoc(doc(db, "bookings", bookingId), { 
        rating: ratingScore, 
        comment: comment 
      });

      // 2. تحديث الحساب د المهني (المعدل العام للنجوم)
      const result = await submitReviewAndUpdateProfessional(proId, bookingId, customerId, ratingScore, comment);

      if (result && result.success) {
        Alert.alert("شكراً لك ✅", "تم تسجيل تقييمك وتحديث حساب المهني بنجاح");
      } else {
        Alert.alert("تم التقييم ✅", "تم حفظ التقييم بنجاح");
      }

      setRatingModalVisible(false);
      setComment('');
      setRatingScore(5);
    } catch (error) {
      console.error("🚨 خطأ أثناء إرسال التقييم: ", error);
      Alert.alert("خطأ ❌", "فشل ف حفظ التقييم");
    }
  };

  const HeaderComponent = () => {
    return (
      <View>
        <View style={styles.userInfoSection}>
          <Avatar.Icon size={50} icon="account" style={{ backgroundColor: '#6200ee' }} />
          <View style={styles.userTextWrapper}>
            <Title style={styles.userNameText}>{String(userName || 'مستخدم')}</Title>
            <Text style={styles.roleText}>واجهة {role === 'pro' ? "المهني" : "الزبون"}</Text>
          </View>
          <IconButton icon="logout" iconColor="red" size={26} onPress={() => signOut(auth)} />
        </View>

        {role === 'pro' && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderTopColor: '#6200ee' }]}><Text style={styles.statNum}>{stats?.total || 0}</Text><Text style={styles.statLab}>الكل</Text></View>
              <View style={[styles.statBox, { borderTopColor: 'green' }]}><Text style={[styles.statNum, { color: 'green' }]}>{stats?.confirmed || 0}</Text><Text style={styles.statLab}>مقبولة</Text></View>
              <View style={[styles.statBox, { borderTopColor: 'orange' }]}><Text style={[styles.statNum, { color: 'orange' }]}>{stats?.pending || 0}</Text><Text style={styles.statLab}>جديدة</Text></View>
            </View>
            
            <Title style={styles.sectionTitle}>🗺️ موقع العمل (مخفي مؤقتا للتيست)</Title>
            
            <Button mode="contained" icon="qrcode-scan" onPress={() => router.push('/scanner' as any)} style={styles.scannerBtn}>
              سكاني كود زبون لتاكيد الحضور
            </Button>
          </>
        )}

        <Title style={styles.sectionTitle}>{role === 'pro' ? "طلبات الحجز الحالية" : "مواعيدي المحجوزة"}</Title>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color="#6200ee" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد مواعيد حالياً</Text>}
        renderItem={({ item }) => {
          let displayTime = item.time || '';
          if (item.appointmentDate) {
            const dateObj = item.appointmentDate?.seconds ? new Date(item.appointmentDate.seconds * 1000) : new Date(item.appointmentDate);
            if (!isNaN(dateObj.getTime())) {
              displayTime = dateObj.toLocaleString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            }
          }

          return (
            <Card style={styles.card}>
              <Card.Content>
                <List.Item
                  title={role === 'pro' ? (item.customerName || 'بدون اسم') : `حجز: ${item.service || 'خدمة'}`}
                  description={`الوقت: ${displayTime}`}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                  right={() => (
                    <Text style={[styles.statusTxt, { color: item.status === 'confirmed' ? 'green' : item.status === 'completed' ? '#6200ee' : 'orange' }]}>
                      {item.status === 'pending' ? '⏳ معلق' : item.status === 'confirmed' ? '✅ مقبول' : item.status === 'completed' ? '🏁 تم الحضور' : '❌ مرفوض'}
                    </Text>
                  )}
                />

                {role === 'user' && item.status === 'confirmed' && (
                  <Text style={{textAlign: 'center', color: 'gray', marginVertical: 5}}>📍 نظام الخرائط مفعل (مخفي ف التيست)</Text>
                )}
              </Card.Content>

              <Card.Actions>
                {role === 'pro' && item.status === 'pending' && (
                  <>
                    <Button onPress={() => updateStatus(item.id, item, 'confirmed')}>قبول</Button>
                    <Button onPress={() => updateStatus(item.id, item, 'rejected')}>رفض</Button>
                  </>
                )}
                
                {role === 'user' && item.status === 'confirmed' && (
                  <Button icon="qrcode" mode="contained" onPress={() => { setSelectedBookingId(item.id); setQrModalVisible(true); }}>كود الحضور</Button>
                )}

                {/* 🛡️ هنا الـزيادة والنواقص مريغلة: زر تقييم المهني للزبون */}
                {role === 'user' && (item.status === 'completed' || item.status === 'confirmed') && !item.rating && (
                  <Button 
                    icon="star" 
                    mode="contained" 
                    buttonColor="#FFD700" 
                    textColor="#000" 
                    onPress={() => { setSelectedBookingForRating(item); setRatingModalVisible(true); }}
                  >
                    قيم المهني ⭐
                  </Button>
                )}

                {item.status !== 'rejected' && item.status !== 'completed' && item.phone && (
                  <IconButton icon="whatsapp" iconColor="green" onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)} />
                )}
              </Card.Actions>
            </Card>
          );
        }}
      />

      {/* الـ Rating Modal */}
      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title>كيف كانت خدمتك؟ ⭐</Title>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <IconButton key={s} icon={s <= ratingScore ? "star" : "star-outline"} iconColor="#FFD700" size={32} onPress={() => setRatingScore(s)} />
              ))}
            </View>
            <TextInput label="تعليقك (اختياري)" value={comment} onChangeText={setComment} mode="outlined" multiline style={styles.ratingInput} contentStyle={{ textAlign: 'right' }} />
            <Button mode="contained" onPress={submitRating} style={styles.submitBtn}>إرسال التقييم</Button>
            <Button onPress={() => setRatingModalVisible(false)}>إلغاء</Button>
          </View>
        </View>
      </Modal>
      
      {/* الـ QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title>وري الكود للمهني 🤳</Title>
            {selectedBookingId && selectedBookingId.trim() !== "" ? (
              <QRCode value={selectedBookingId} size={200} color="#6200ee" />
            ) : (
              <ActivityIndicator size="small" color="#6200ee" />
            )}
            <Text style={{ fontSize: 12, marginTop: 10, color: 'gray' }}>ID: {selectedBookingId}</Text>
            <Button onPress={() => setQrModalVisible(false)} style={{ marginTop: 20 }}>إغلاق</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15, paddingTop: 30 },
  userInfoSection: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 3, marginBottom: 20 },
  userTextWrapper: { flex: 1, marginRight: 12, alignItems: 'flex-start' },
  userNameText: { fontSize: 18, fontWeight: 'bold', color: '#6200ee' },
  roleText: { fontSize: 12, color: '#777' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { width: '31%', backgroundColor: '#fff', padding: 10, borderRadius: 10, alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLab: { fontSize: 12, color: '#666' },
  scannerBtn: { marginBottom: 20, borderRadius: 12, backgroundColor: '#6200ee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, textAlign: 'right' },
  card: { marginBottom: 10, borderRadius: 12, backgroundColor: '#fff' },
  statusTxt: { fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center', width: '85%' },
  starsRow: { flexDirection: 'row', marginVertical: 10 },
  ratingInput: { width: '100%', marginBottom: 15 },
  submitBtn: { width: '100%', marginBottom: 5 },
});