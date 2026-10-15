import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Car, Plus, LogOut, Zap, Shield, Info } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [isEv, setIsEv] = useState(false);

  const loadVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      if (res.data?.data) setVehicles(res.data.data);
    } catch {
      // Fallback
      setVehicles([
        {
          id: 'v1',
          licensePlate: 'KA01EV2026',
          make: 'Tesla',
          model: 'Model 3',
          color: 'Pearl White',
          isEv: true,
          isDefault: true,
        },
        {
          id: 'v2',
          licensePlate: 'KA03MZ9999',
          make: 'BMW',
          model: '330i M Sport',
          color: 'Portimao Blue',
          isEv: false,
          isDefault: false,
        },
      ]);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleAddVehicle = async () => {
    if (!newPlate || !newMake || !newModel) {
      Alert.alert('Incomplete Details', 'Please enter license plate, make, and model.');
      return;
    }

    try {
      await api.post('/vehicles', {
        licensePlate: newPlate,
        make: newMake,
        model: newModel,
        color: 'Standard',
        isEv,
        isDefault: false,
      });
      loadVehicles();
    } catch {
      setVehicles((prev) => [
        ...prev,
        {
          id: `v-${Date.now()}`,
          licensePlate: newPlate.toUpperCase(),
          make: newMake,
          model: newModel,
          color: 'Standard',
          isEv,
          isDefault: false,
        },
      ]);
    }
    setShowAddVehicle(false);
    setNewPlate('');
    setNewMake('');
    setNewModel('');
    setIsEv(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commuter Profile</Text>
        <Text style={styles.subtitle}>Manage campus identity, vehicles, and access credentials</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <User size={30} color={COLORS.primaryBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.fullName || 'Alex Morgan'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@smartpark.ai'}</Text>
            <Text style={styles.userCompany}>{user?.companyName || 'Acme Cloud Technologies'}</Text>
          </View>
        </View>

        {/* Vehicles Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Registered Campus Vehicles</Text>
          <TouchableOpacity
            style={styles.addVehButton}
            onPress={() => setShowAddVehicle(!showAddVehicle)}
          >
            <Plus size={14} color={COLORS.primaryBlue} />
            <Text style={styles.addVehText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Add Vehicle Inline Form */}
        {showAddVehicle && (
          <View style={styles.addForm}>
            <Text style={styles.addFormTitle}>Add New Vehicle</Text>
            <TextInput
              style={styles.input}
              placeholder="License Plate (e.g., KA01AB1234)"
              placeholderTextColor="#9AA5B8"
              value={newPlate}
              onChangeText={setNewPlate}
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Make (e.g., Tesla)"
                placeholderTextColor="#9AA5B8"
                value={newMake}
                onChangeText={setNewMake}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Model (e.g., Model Y)"
                placeholderTextColor="#9AA5B8"
                value={newModel}
                onChangeText={setNewModel}
              />
            </View>

            <TouchableOpacity
              style={[styles.evToggle, isEv && styles.evToggleActive]}
              onPress={() => setIsEv(!isEv)}
            >
              <Zap size={16} color={isEv ? '#FFFFFF' : COLORS.secondaryText} />
              <Text style={[styles.evToggleText, isEv && styles.evToggleTextActive]}>
                This is an Electric Vehicle (EV)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveVehButton} onPress={handleAddVehicle}>
              <Text style={styles.saveVehText}>Save Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {vehicles.map((v) => (
          <View key={v.id} style={styles.vehicleCard}>
            <View style={styles.vehIconCircle}>
              <Car size={20} color={COLORS.primaryBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.vehPlate}>{v.licensePlate}</Text>
                {v.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.vehModel}>{v.make} {v.model} • {v.color}</Text>
            </View>
            {v.isEv && (
              <View style={styles.evBadge}>
                <Zap size={12} color="#27903D" />
                <Text style={styles.evBadgeText}>EV</Text>
              </View>
            )}
          </View>
        ))}

        {/* Official Branding & About */}
        <View style={styles.aboutCard}>
          <Image
            source={require('../../assets/images/smartpark-logo.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <Text style={styles.aboutVersion}>SmartPark AI Platform v1.0.0</Text>
          <Text style={styles.aboutSub}>
            Autonomous AI parking prediction and enterprise capacity optimization platform.
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color={COLORS.errorRed} />
          <Text style={styles.logoutText}>Sign Out from Campus</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: COLORS.borders },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.deepNavy },
  subtitle: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  list: { padding: 20, gap: 16 },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borders,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EBF4FF', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.deepNavy },
  userEmail: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  userCompany: { fontSize: 12, color: COLORS.primaryBlue, fontWeight: '600', marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.deepNavy },
  addVehButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EBF4FF', borderRadius: 8 },
  addVehText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primaryBlue },
  addForm: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borders, gap: 10 },
  addFormTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: 4 },
  input: { backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: COLORS.borders, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.deepNavy },
  evToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F4F8FF', borderRadius: 10, borderWidth: 1, borderColor: COLORS.borders },
  evToggleActive: { backgroundColor: COLORS.primaryBlue, borderColor: COLORS.primaryBlue },
  evToggleText: { fontSize: 13, color: COLORS.secondaryText, fontWeight: '500' },
  evToggleTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  saveVehButton: { backgroundColor: COLORS.primaryBlue, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  saveVehText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borders,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehIconCircle: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F4F8FF', justifyContent: 'center', alignItems: 'center' },
  vehPlate: { fontSize: 15, fontWeight: 'bold', color: COLORS.deepNavy },
  defaultBadge: { backgroundColor: '#EBF4FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 9, fontWeight: 'bold', color: COLORS.primaryBlue },
  vehModel: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  evBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EBFBF0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  evBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#27903D' },
  aboutCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.borders, alignItems: 'center', marginTop: 8 },
  aboutLogo: { width: 140, height: 60, marginBottom: 8 },
  aboutVersion: { fontSize: 13, fontWeight: 'bold', color: COLORS.deepNavy },
  aboutSub: { fontSize: 12, color: COLORS.secondaryText, textAlign: 'center', marginTop: 4, maxWidth: 280 },
  logoutButton: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 32,
  },
  logoutText: { color: COLORS.errorRed, fontSize: 14, fontWeight: 'bold' },
});
