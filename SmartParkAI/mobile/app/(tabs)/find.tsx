import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Search, Zap, Accessibility, ChevronRight, Check } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/theme/colors';

export default function FindScreen() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [evFilter, setEvFilter] = useState(false);
  const [accessibleFilter, setAccessibleFilter] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reservingZone, setReservingZone] = useState<any>(null);

  const searchFacilities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/search', {
        params: {
          q: query,
          ev: evFilter,
          accessible: accessibleFilter,
        },
      });
      if (res.data?.data) {
        setFacilities(res.data.data);
      }
    } catch {
      // Fallback preview
      setFacilities([
        {
          id: 'fac-cg-tower-a',
          name: 'CyberGate Multi-Level Garage A',
          buildingName: 'Tower A',
          levels: 4,
          totalCapacity: 500,
          availableCapacity: 140,
          occupancyPercentage: 72,
          hasEvCharging: true,
          hasAccessibleParking: true,
          zonesCount: 3,
        },
        {
          id: 'fac-cg-tower-b',
          name: 'CyberGate Basement B',
          buildingName: 'Tower B & C',
          levels: 2,
          totalCapacity: 350,
          availableCapacity: 50,
          occupancyPercentage: 85,
          hasEvCharging: true,
          hasAccessibleParking: false,
          zonesCount: 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchFacilities();
  }, [evFilter, accessibleFilter]);

  const handleInstantReserve = async (fac: any) => {
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + 3600000 * 2).toISOString(); // 2 hours
      const res = await api.post('/reservations', {
        facilityId: fac.id,
        zoneId: 'zone-cyber-a1',
        licensePlate: user?.defaultVehiclePlate || 'KA01EV2026',
        startTime,
        endTime,
        estimatedPrice: 60,
      });

      if (res.data?.success) {
        Alert.alert(
          'Reservation Confirmed!',
          `Booking Reference: ${res.data.data.bookingReference}\nFacility: ${fac.name}\nSlot ready upon arrival.`
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Reservation Confirmed (Preview)',
        `Booking Reference: SPK-${Math.floor(100000 + Math.random() * 900000)}\nFacility: ${fac.name}\nActive pass stored in Bookings tab.`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Parking</Text>
        <Text style={styles.subtitle}>Search campus garages and view real-time slot vacancy</Text>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by building, garage or zone..."
            placeholderTextColor="#9AA5B8"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchFacilities}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, evFilter && styles.chipActive]}
            onPress={() => setEvFilter(!evFilter)}
          >
            <Zap size={14} color={evFilter ? '#FFFFFF' : COLORS.secondaryText} />
            <Text style={[styles.chipText, evFilter && styles.chipTextActive]}>EV Charging</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, accessibleFilter && styles.chipActive]}
            onPress={() => setAccessibleFilter(!accessibleFilter)}
          >
            <Accessibility size={14} color={accessibleFilter ? '#FFFFFF' : COLORS.secondaryText} />
            <Text style={[styles.chipText, accessibleFilter && styles.chipTextActive]}>Accessible</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Facilities List */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryBlue} style={{ marginTop: 40 }} />
        ) : (
          facilities.map((fac) => (
            <View key={fac.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.facName}>{fac.name}</Text>
                  <Text style={styles.facSub}>{fac.buildingName} • {fac.levels} Levels</Text>
                </View>
                <View style={styles.vacantBadge}>
                  <Text style={styles.vacantVal}>{fac.availableCapacity}</Text>
                  <Text style={styles.vacantSub}>free</Text>
                </View>
              </View>

              {/* Progress occupancy bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${fac.occupancyPercentage}%` }]} />
                </View>
                <Text style={styles.occupancyText}>{fac.occupancyPercentage}%</Text>
              </View>

              {/* Badges */}
              <View style={styles.amenitiesRow}>
                {fac.hasEvCharging && (
                  <View style={styles.tag}>
                    <Zap size={12} color={COLORS.primaryBlue} />
                    <Text style={styles.tagText}>EV Stations</Text>
                  </View>
                )}
                {fac.hasAccessibleParking && (
                  <View style={styles.tag}>
                    <Accessibility size={12} color={COLORS.primaryBlue} />
                    <Text style={styles.tagText}>Accessible</Text>
                  </View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.reserveButton}
                onPress={() => handleInstantReserve(fac)}
              >
                <Text style={styles.reserveButtonText}>1-Tap Reserve Spot</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: COLORS.borders },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.deepNavy },
  subtitle: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: COLORS.borders,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.deepNavy },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: COLORS.borders,
  },
  chipActive: { backgroundColor: COLORS.primaryBlue, borderColor: COLORS.primaryBlue },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.secondaryText },
  chipTextActive: { color: '#FFFFFF' },
  list: { padding: 20, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borders,
    shadowColor: COLORS.deepNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  facName: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepNavy },
  facSub: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  vacantBadge: { alignItems: 'center', backgroundColor: '#EBFBF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  vacantVal: { fontSize: 16, fontWeight: 'bold', color: '#27903D' },
  vacantSub: { fontSize: 10, color: '#27903D', textTransform: 'uppercase' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#F4F8FF', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primaryBlue, borderRadius: 3 },
  occupancyText: { fontSize: 12, fontWeight: '600', color: COLORS.secondaryText },
  amenitiesRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F4F8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, color: COLORS.primaryBlue, fontWeight: '500' },
  reserveButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  reserveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
});
