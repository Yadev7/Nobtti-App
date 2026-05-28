import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Chip, Searchbar, Text, Title } from 'react-native-paper';
import { auth, db } from '../../constants/firebase';

export default function ExploreScreen() {
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [filteredPros, setFilteredPros] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const categories = ['الكل', 'حلاق', 'طبيب', 'محامي', 'ميكانيكي', 'خياط', 'مصلح'];

  // 1. جلب البيانات Realtime من الفايربيس
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "pro"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfessionals(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. ✨ التعديل السحري: مراقبة أي تغيير ف الداتا أو الفلاتر لتحديث الشاشة ف البلاصة!
  useEffect(() => {
    let filtered = allProfessionals;

    if (selectedCategory !== 'الكل') {
      filtered = filtered.filter(pro => pro.profession === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(pro =>
        pro.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPros(filtered);
  }, [allProfessionals, selectedCategory, searchQuery]); // 👈 كيتنفذ أوتوماتيكياً غير تتبدل أي حاجة هنا

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Title style={styles.title}>استكشف الخدمات 🔍</Title>
        <Button icon="logout" mode="text" textColor="red" onPress={() => signOut(auth)}>{" "}</Button>
      </View>

      <Searchbar
        placeholder="قلب على مهني..."
        onChangeText={setSearchQuery} // تحديث مباشر للـ State
        value={searchQuery}
        style={styles.searchBar}
        elevation={1}
      />

      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)} // تحديث مباشر للـ State
              style={[styles.chip, selectedCategory === cat ? styles.selectedChip : styles.unselectedChip]}
              selectedColor={selectedCategory === cat ? "#fff" : "#6200ee"}
              showSelectedCheck={false}
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPros}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.fullName}
              subtitle={item.profession}
              titleStyle={{ color: '#6200ee', textAlign: 'right' }}
              subtitleStyle={{ color: '#666', textAlign: 'right' }}
              left={(props) => <Avatar.Icon {...props} icon="account-tie" style={{ backgroundColor: '#eaddff' }} color="#6200ee" />}
            />
            <Card.Content style={{ alignItems: 'flex-start' }}>
              {/* عرض النجوم والتقييمات مريغل وبشكل فوري */}
              <Text variant="bodySmall" style={{ color: '#FFD700', fontWeight: 'bold' }}>
                ⭐ {item.averageRating ? item.averageRating.toFixed(1) : "جديد"} ({item.reviewsCount || 0} تقييم)
              </Text>
            </Card.Content>
            <Card.Actions>
              {/* تصحيح تمرير الـ adminId باستعمال الـ uid الحقيقي د المستخدم من الداتابيز */}
              <Button mode="contained" buttonColor="#6200ee" onPress={() => router.push(`/booking?adminId=${item.id}` as any)}>
                حجز موعد الآن
              </Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={80} icon="magnify-close" style={{ backgroundColor: '#eee' }} color="#999" />
            <Text style={styles.emptyText}>ما لقينا حتى نتيجة فـ {selectedCategory}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f8f9fa', paddingTop: 50 },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  searchBar: { marginBottom: 15, borderRadius: 10, backgroundColor: '#fff', borderColor: '#6200ee', borderWidth: 1, textAlign: 'right' },
  categoriesList: { paddingVertical: 5, gap: 8, flexDirection: 'row-reverse' },
  chip: { height: 40, justifyContent: 'center', borderRadius: 20 },
  selectedChip: { backgroundColor: '#6200ee' },
  unselectedChip: { backgroundColor: '#fff', borderColor: '#6200ee', borderWidth: 1 },
  card: { marginBottom: 15, elevation: 4, borderRadius: 15, backgroundColor: '#fff', overflow: 'hidden' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#888', fontWeight: '500' }
});