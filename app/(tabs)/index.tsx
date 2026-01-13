import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ActivityIndicator, Avatar, Button, Card, IconButton, List, Text, Title } from 'react-native-paper';
import { auth, db } from '../../constants/firebase';
// استيراد مكتبة QR Code (تأكد من تثبيتها)
import QRCode from 'react-native-qrcode-svg';

export default function DashboardScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  
  // حالات الـ QR Code Modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');

  const router = useRouter();

  const [region] = useState({
    latitude: 33.9716,
    longitude: -6.8498,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

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

  const handleLogout = () => {
    Alert.alert("خروج", "واش بغيتي تخرج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  const showQRCode = (id: string) => {
    setSelectedBookingId(id);
    setQrModalVisible(true);
  };

  const HeaderComponent = () => (
    <View>
      <View style={styles.userInfoSection}>
        <Avatar.Text size={50} label={userName.substring(0, 1)} style={{backgroundColor: '#6200ee'}} />
        <View style={styles.userTextWrapper}>
          <Title style={styles.userNameText}>{userName}</Title>
          <Text style={styles.roleText}>واجهة {role === 'pro' ? "المهني" : "الزبون"}</Text>
        </View>
        <IconButton icon="logout" iconColor="red" size={26} onPress={handleLogout} />
      </View>

      {role === 'pro' && (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderTopColor: '#6200ee' }]}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLab}>الكل</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: 'green' }]}>
              <Text style={[styles.statNum, { color: 'green' }]}>{stats.confirmed}</Text>
              <Text style={styles.statLab}>مقبولة</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: 'orange' }]}>
              <Text style={[styles.statNum, { color: 'orange' }]}>{stats.pending}</Text>
              <Text style={styles.statLab}>جديدة</Text>
            </View>
          </View>
          
          {/* زر السكنير خاص بالمهني فقط */}
          <Button 
            mode="contained" 
            icon="qrcode-scan" 
            onPress={() => router.push('/scanner' as any)}
            style={styles.scannerBtn}
          >
سكاني كود زبون لتاكيد الحضور
          </Button>

          <Title style={styles.sectionTitle}>موقع العمل 📍</Title>
          <View style={styles.mapContainer}>
            <MapView style={styles.map} initialRegion={region}>
              <Marker coordinate={region} title="محلي" />
            </MapView>
          </View>
        </>
      )}

      <Title style={styles.sectionTitle}>
        {role === 'pro' ? "طلبات الحجز الحالية" : "مواعيدي المحجوزة"}
      </Title>
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
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          // تنسيق التاريخ إذا كان مخزن كـ ISO
          const displayTime = item.appointmentDate 
            ? new Date(item.appointmentDate).toLocaleString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : item.time;

          return (
            <Card style={styles.card}>
              <Card.Content>
                <List.Item
                  title={role === 'pro' ? item.customerName : `حجز عند: ${item.service}`}
                  description={`الخدمة: ${item.service}\nالوقت: ${displayTime}`}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                  right={() => (
                    <View style={styles.statusBadge}>
                      <Text style={[styles.statusTxt, { 
                        color: item.status === 'confirmed' ? 'green' : 
                               item.status === 'completed' ? '#6200ee' :
                               item.status === 'rejected' ? 'red' : 'orange' 
                      }]}>
                        {item.status === 'pending' ? '⏳ معلق' : 
                         item.status === 'confirmed' ? '✅ مقبول' : 
                         item.status === 'completed' ? '🏁 تم الحضور' : '❌ مرفوض'}
                      </Text>
                    </View>
                  )}
                />
              </Card.Content>
              <Card.Actions>
                {role === 'pro' && item.status === 'pending' && (
                  <>
                    <Button mode="contained" buttonColor="green" onPress={() => updateStatus(item.id, 'confirmed')}>قبول</Button>
                    <Button mode="contained" buttonColor="red" onPress={() => updateStatus(item.id, 'rejected')}>رفض</Button>
                  </>
                )}
                
                {/* زر QR Code للزبون فقط إذا تم قبول الموعد */}
                {role === 'user' && item.status === 'confirmed' && (
                  <Button icon="qrcode" mode="contained" onPress={() => showQRCode(item.id)}>كود الحضور</Button>
                )}

                {item.status !== 'rejected' && item.status !== 'completed' && (
                  <IconButton icon="whatsapp" iconColor="green" onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)} />
                )}
              </Card.Actions>
            </Card>
          );
        }}
      />

      {/* مودال الـ QR Code للزبون */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title style={{marginBottom: 10}}>وري الكود للمهني 🤳</Title>
            <QRCode value={selectedBookingId} size={220} color="#6200ee" />
            <Text style={styles.modalHint}>هاد الكود خاص بهاد الموعد فقط لضمان حضورك.</Text>
            <Button mode="outlined" onPress={() => setQrModalVisible(false)} style={{marginTop: 20}}>إغلاق</Button>
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
  scannerBtn: { marginBottom: 20, paddingVertical: 5, borderRadius: 12, backgroundColor: '#9280ab', color: '#020202'  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  mapContainer: { height: 160, borderRadius: 15, overflow: 'hidden', elevation: 3, marginBottom: 15 },
  map: { width: '100%', height: '100%' },
  card: { marginBottom: 10, borderRadius: 12, elevation: 2, backgroundColor: '#fff' },
  statusBadge: { justifyContent: 'center' },
  statusTxt: { fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 30, borderRadius: 25, alignItems: 'center', width: '85%' },
  modalHint: { marginTop: 15, textAlign: 'center', color: '#666', fontSize: 13 },
  modalCenteredView: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)'
},
modalView: {
  backgroundColor: 'white',
  borderRadius: 20,
  padding: 35,
  alignItems: 'center',
  elevation: 5,
  width: '80%'
},
});