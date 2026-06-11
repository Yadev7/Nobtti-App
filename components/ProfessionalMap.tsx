import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ActivityIndicator, FAB, Text } from 'react-native-paper';
// استيراد أدوات الفايربيس
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../constants/firebase'; // تأكد من صحة مسار ملف الفايربيس عندك

export default function ProfessionalMap() {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingDb, setUpdatingDb] = useState(false); // ستايت لمعرفة واش جاري الحفظ ف الفايربيس
  const mapRef = useRef<MapView>(null);

  // 1. دالة لجلب الموقع الحالي وحفظه تلقائياً في قاعدة البيانات
  const getMyLocation = async () => {
    try {
      setLoading(true);
      // طلب الإذن
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("خطأ ⚠️", "خاصنا إذن الموقع باش نحددو بلاصة المحل.");
        setLoading(false);
        return;
      }

      // جلب الإحداثيات بدقة عالية
      let userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.005, // Zoom قريب للمحل
        longitudeDelta: 0.005,
      };

      setLocation(newRegion);
      
      // تحريك الخريطة للموقع الجديد بانسيابية
      mapRef.current?.animateToRegion(newRegion, 1000);

      // ✨ الإضافة: حفظ الموقع تلقائياً ف الفايربيس للمهني الحالي
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUpdatingDb(true);
        const userRef = doc(db, "users", currentUser.uid);
        
        // التحديث في حقل locationCoords بظبط كيف ما هو ف الداتا بيز ديالك
        await updateDoc(userRef, {
          locationCoords: {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          }
        });
        console.log("📍 تم تحديث إحداثيات المحل في الفايربيس بنجاح!");
      }
      
    } catch (error) {
      console.error(error);
      Alert.alert("مشكل ❌", "ما قدرناش نجيبو الموقع ديالك أو نحفظوه دابا.");
    } finally {
      setLoading(false);
      setUpdatingDb(false);
    }
  };

  useEffect(() => {
    (async () => {
      await getMyLocation();
    })();
  }, []);

  if (loading && !location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating={true} color="#6200ee" />
        <Text style={{ marginTop: 10 }}>جاري تحديد موقعك وتحديث المحل... 🗺️</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE} // تأكد انك مفعل Google Maps API في أندرويد
        style={styles.map}
        initialRegion={location || {
          latitude: 33.9716,
          longitude: -6.8498,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true} // النقطة الزرقاء
        showsMyLocationButton={false} // غنعوضوه بـ FAB ديالنا
        loadingEnabled={true}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="موقع محلك"
            description={updatingDb ? "جاري الحفظ في السيرفر..." : "هذا هو الموقع اللي غيشوفوه الزبناء"}
            pinColor="#6200ee"
          />
        )}
      </MapView>

      {/* زر دائري لإعادة التمركز على موقعك */}
      <FAB
        icon="crosshairs-gps"
        style={styles.fab}
        onPress={getMyLocation}
        loading={updatingDb} // كيدور يلا كان كيسيفط للداتابيز
        small
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250, // العلو اللّي ف الـ Dashboard
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#e1e1e1',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  center: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
});