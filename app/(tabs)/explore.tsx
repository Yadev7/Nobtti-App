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

  const categories = ['الكل', 'حلاق', 'طبيب', 'ميكانيكي', 'خياط', 'محامي', 'مصلح'];

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "pro"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfessionals(data);
      setFilteredPros(data);
    });
    return () => unsubscribe();
  }, []);

  // دالة الفلترة (بالفئة والبحث)
  const applyFilters = (category: string, queryText: string) => {
    let filtered = allProfessionals;

    if (category !== 'الكل') {
      filtered = filtered.filter(pro => pro.profession === category);
    }

    if (queryText.trim() !== '') {
      filtered = filtered.filter(pro =>
        pro.fullName.toLowerCase().includes(queryText.toLowerCase())
      );
    }

    setFilteredPros(filtered);
  };

  const onSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(selectedCategory, query);
  };

  const onCategorySelect = (category: string) => {
    setSelectedCategory(category);
    applyFilters(category, searchQuery);
  };

  const handleLogout = () => {
    Alert.alert("خروج", "واش بغيتي تخرج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Title style={styles.title}>استكشف الخدمات 🔍</Title>
        <Button
          icon="logout"
          mode="text"
          textColor="red"
          onPress={handleLogout}
        >
          {""}
        </Button>
      </View>

      <Searchbar
        placeholder="قلب على مهني..."
        onChangeText={onSearch}
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
              onPress={() => onCategorySelect(cat)}
              style={[
                styles.chip,
                selectedCategory === cat ? styles.selectedChip : styles.unselectedChip
              ]}
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
              titleStyle={{ color: '#6200ee' }}
              subtitleStyle={{ color: '#6200ee' }}
              left={(props) => <Avatar.Icon {...props} icon="account-tie" />}
            />
            <Card.Content>
              <Text variant="bodySmall" style={{ color: '#666' }}>متوفر دابا للحجز</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                style={{ backgroundColor: 'rgb(137, 148, 153)' }}
                onPress={() => router.push(`/booking?adminId=${item.uid}` as any)}
              >
                حجز موعد الآن
              </Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={80} icon="magnify-close" style={{ backgroundColor: '#eee' }} color="#999" />
            <Text style={styles.emptyText}>ما لقينا حتى {selectedCategory !== 'الكل' ? selectedCategory : 'نتيجة'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f8f9fa', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  searchBar: { marginBottom: 15, borderRadius: 10, backgroundColor: '#fff', borderColor: '#6200ee', borderWidth: 1 },
  categoriesList: { paddingVertical: 5, gap: 8 },
  chip: { height: 40, justifyContent: 'center', borderRadius: 20 },
  selectedChip: { backgroundColor: '#6200ee' },
  unselectedChip: { backgroundColor: '#fff', borderColor: '#6200ee', borderWidth: 1 },
  card: { marginBottom: 15, elevation: 4, borderRadius: 15, backgroundColor: '#fff', overflow: 'hidden', color: '#6200ee' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#888', fontWeight: '500' }
});