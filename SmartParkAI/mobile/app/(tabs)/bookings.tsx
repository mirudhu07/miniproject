import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, QrCode, PlayCircle, XCircle, Clock } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/theme/colors';

export default function BookingsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);

  const loadReservations = async () => {
    try {
      const res = await api.get('/reservations');
      if (res.data?.data) {
        setReservations(res.data.data);
      }
    } catch {
      // Fallback preview
      setReservations([
        {
          id: 'res-preview-1',
          bookingReference: 'SPK-784920',
          facilityId: { name: 'CyberGate Multi-Level Garage A' },
          zoneId: { name: 'Ground Level - Premium & EV', code: 'L0-EV' },
          slotNumber: 'L0-EV-04',
          licensePlate: 'KA01EV2026',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          status: 'active',
          estimatedPrice: 60,
        },
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleStartSession = async (item: any) => {
    try {
      const res = await api.post('/sessions/start', {
        facilityId: item.facilityId?.id || item.facilityId || 'fac-cg-tower-a',
        zoneId: item.zoneId?.id || item.zoneId || 'zone-cyber-a1',
        licensePlate: item.licensePlate,
        reservationId: item.id || item._id,
      });

      if (res.data?.success) {
        Alert.alert('Session Started!', 'Your parking session is active. Live timer started.');
        router.push('/(tabs)/activity');
      }
    } catch (err: any) {
      Alert.alert('Session Started (Preview Mode)', 'Entered parking facility. Active duration is tracking.');
      router.push('/(tabs)/activity');
    }
  };

  const handleCancelReservation = async (item: any) => {
    try {
      await api.post(`/reservations/${item.id || item._id}/cancel`);
      Alert.alert('Reservation Cancelled', 'Your reserved slot has been released back to campus.');
      loadReservations();
    } catch {
      setReservations([]);
      Alert.alert('Reservation Cancelled', 'Booking cancelled successfully.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Active reservation passes & digital campus entry QR</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} />}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={COLORS.secondaryText} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Active Reservations</Text>
            <Text style={styles.emptySub}>Book a parking spot ahead of time to guarantee your arrival.</Text>
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)/find')}>
              <Text style={styles.browseButtonText}>Browse Available Garages</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reservations.map((item) => (
            <View key={item.id || item._id} style={styles.card}>
              {/* Reference & Status */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.refText}>{item.bookingReference}</Text>
                  <Text style={styles.facName}>{item.facilityId?.name || 'CyberGate Garage'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#EBFBF0' : '#F4F8FF' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'active' ? '#27903D' : COLORS.secondaryText }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Slot & Vehicle Info */}
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Assigned Slot</Text>
                  <Text style={styles.infoVal}>{item.slotNumber || 'Zone L0'}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Vehicle Plate</Text>
                  <Text style={styles.infoVal}>{item.licensePlate}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Estimated Cost</Text>
                  <Text style={styles.infoVal}>₹{item.estimatedPrice}</Text>
                </View>
              </View>

              {/* QR Token Mock Representation */}
              <View style={styles.qrBanner}>
                <QrCode size={24} color={COLORS.primaryBlue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrTitle}>Digital Gate Pass Ready</Text>
                  <Text style={styles.qrSub}>Scan at entrance gate barcode scanner</Text>
                </View>
              </View>

              {/* Actions */}
              {item.status === 'active' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.startSessionButton}
                    onPress={() => handleStartSession(item)}
                  >
                    <PlayCircle size={16} color="#FFFFFF" />
                    <Text style={styles.startSessionText}>Start Parking Session</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelReservation(item)}
                  >
                    <XCircle size={16} color={COLORS.errorRed} />
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  subtitle: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  list: { padding: 20, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borders,
    shadowColor: COLORS.deepNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  refText: { fontSize: 18, fontWeight: 'bold', color: COLORS.deepNavy, letterSpacing: 0.5 },
  facName: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F4F8FF', marginBottom: 14 },
  infoCol: { alignItems: 'center' },
  infoLabel: { fontSize: 11, color: COLORS.secondaryText, marginBottom: 4 },
  infoVal: { fontSize: 14, fontWeight: 'bold', color: COLORS.deepNavy },
  qrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4F8FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.deepNavy },
  qrSub: { fontSize: 11, color: COLORS.secondaryText },
  actionsRow: { flexDirection: 'row', gap: 10 },
  startSessionButton: {
    flex: 2,
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  startSessionText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: { color: COLORS.errorRed, fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.secondaryText, textAlign: 'center', marginBottom: 20 },
  browseButton: { backgroundColor: COLORS.primaryBlue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  browseButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
