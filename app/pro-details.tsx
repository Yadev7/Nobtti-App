import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, Text, Title } from 'react-native-paper';
import { db } from '../constants/firebase';

export default function ProDetailsScreen() {
  const { proId } = useLocalSearchParams();
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPro = async () => {
      const docRef = doc(db, "users", proId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPro(docSnap.data());
      }
      setLoading(false);
    };
    fetchPro();
  }, [proId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6200ee" />;

  return (
    <ScrollView style={styles.container}>
      {/* Header مع صورة أو غلاف بسيط */}
      <View style={styles.header}>
        <Avatar.Text size={100} label={pro?.fullName?.substring(0, 1)} style={styles.avatar} />
        <Title style={styles.proName}>{pro?.fullName}</Title>
        <Text style={styles.proType}>{pro?.profession}</Text>

        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
          <Text style={styles.ratingText}>
            {pro?.averageRating?.toFixed(1) || "جديد"} ({pro?.reviewsCount || 0} تقييم)
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* قسم المعلومات */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>حول المهني</Title>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" />
            <Text style={styles.infoText}>{pro?.location || "المغرب"}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="green" />
            <Text style={styles.infoText}>{pro?.phone || "متوفر عبر الواتساب"}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* قسم معرض الصور (اختياري - تقدر تزيدو من بعد) */}
      {/* <Card style={styles.galleryCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>معرض الأعمال</Title>
          <Text style={styles.placeholderText}>قريباً: صور من أعمال {pro?.fullName}</Text>
        </Card.Content>
      </Card> */}

      <Button
        mode="contained"
        style={styles.bookBtn}
        contentStyle={{ height: 50 }}
        onPress={() => router.push(`/booking?adminId=${proId}` as any)}
      >
        حجز موعد الآن
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  avatar: { backgroundColor: '#6200ee' },
  proName: { marginTop: 15, fontSize: 24, fontWeight: 'bold' },
  proType: { color: '#666', fontSize: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  ratingText: { marginLeft: 5, fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee' },
  infoCard: { margin: 15, borderRadius: 12 },
  galleryCard: { marginHorizontal: 15, marginBottom: 100, borderRadius: 12 },
  sectionTitle: { fontSize: 18, marginBottom: 10, color: '#333' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { marginLeft: 10, fontSize: 15 },
  placeholderText: { color: '#999', fontStyle: 'italic' },
  bookBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: 10, backgroundColor: '#6200ee' }
});