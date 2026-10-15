import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, MapPin, ArrowRight, Zap, ShieldCheck, Clock } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  const loadData = async () => {
    try {
      const campRes = await api.get('/campuses');
      if (campRes.data?.data) setCampuses(campRes.data.data);

      const recRes = await api.get('/recommendations');
      if (recRes.data?.recommendedZone) setRecommendation(recRes.data.recommendedZone);

      const sessRes = await api.get('/sessions/active');
      if (sessRes.data?.data) setActiveSession(sessRes.data.data);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const defaultCampus = campuses[0] || {
    name: 'CyberGate IT Park',
    totalCapacity: 850,
    availableSpaces: 260,
  };

  const campusAvailable = defaultCampus.availableSpaces || 260;
  const campusTotal = defaultCampus.totalCapacity || 850;
  const occupancyPct = Math.round(((campusTotal - campusAvailable) / campusTotal) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} />}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>{user?.fullName || 'Commuter'}</Text>
        </View>
        <Image
          source={require('../../assets/images/smartpark-logo.png')}
          style={styles.miniLogo}
          resizeMode="contain"
        />
      </View>

      {/* Selected IT Park Card */}
      <View style={styles.campusCard}>
        <View style={styles.campusHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} color={COLORS.primaryBlue} />
            <Text style={styles.campusName}>{defaultCampus.name}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.occupancyRow}>
          <View>
            <Text style={styles.spacesCount}>{campusAvailable}</Text>
            <Text style={styles.spacesLabel}>Available Spaces Now</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>{occupancyPct}% Full</Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${occupancyPct}%` }]} />
        </View>
      </View>

      {/* Active Session Warning / Status */}
      {activeSession && (
        <TouchableOpacity
          style={styles.activeSessionBanner}
          onPress={() => router.push('/(tabs)/activity')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Clock size={20} color="#FFFFFF" />
            <View>
              <Text style={styles.activeSessionTitle}>Active Parking Session</Text>
              <Text style={styles.activeSessionSub}>
                {activeSession.facilityId?.name || 'Garage A'} • {activeSession.licensePlate}
              </Text>
            </View>
          </View>
          <ArrowRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* AI Recommendation Card */}
      <View style={styles.recommendCard}>
        <View style={styles.recommendBadge}>
          <Sparkles size={14} color="#FFFFFF" />
          <Text style={styles.recommendBadgeText}>SmartPark AI Recommendation</Text>
        </View>

        <Text style={styles.recommendTitle}>
          {recommendation?.zoneName || 'Ground Level - Premium & EV (L0-EV)'}
        </Text>
        <Text style={styles.recommendSub}>
          {recommendation?.facilityName || 'CyberGate Multi-Level Garage A'}
        </Text>

        <View style={styles.recommendStats}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Free Spaces</Text>
            <Text style={styles.statPillVal}>{recommendation?.availableSpaces || 25}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Predicted in 60m</Text>
            <Text style={[styles.statPillVal, { color: COLORS.primaryBlue }]}>
              {recommendation?.predictedOccupancyRate || 82}%
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Rate</Text>
            <Text style={styles.statPillVal}>₹{recommendation?.pricePerHour || 30}/hr</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bookNowButton}
          onPress={() => router.push('/(tabs)/find')}
        >
          <Text style={styles.bookNowText}>Reserve Spot in Recommended Zone</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Action Tiles */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.tilesRow}>
        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push('/(tabs)/find')}
        >
          <View style={[styles.tileIconCircle, { backgroundColor: '#EBF4FF' }]}>
            <Zap size={22} color={COLORS.primaryBlue} />
          </View>
          <Text style={styles.tileTitle}>Find Parking</Text>
          <Text style={styles.tileSub}>Browse zones & slots</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push('/(tabs)/bookings')}
        >
          <View style={[styles.tileIconCircle, { backgroundColor: '#EBFBF0' }]}>
            <ShieldCheck size={22} color={COLORS.green} />
          </View>
          <Text style={styles.tileTitle}>My Bookings</Text>
          <Text style={styles.tileSub}>Active passes & QR</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 48 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 13, color: COLORS.secondaryText, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.deepNavy },
  miniLogo: { width: 44, height: 44, borderRadius: 10 },
  campusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borders,
    marginBottom: 16,
    shadowColor: COLORS.deepNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  campusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  campusName: { fontSize: 15, fontWeight: 'bold', color: COLORS.deepNavy },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBFBF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#27903D' },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  spacesCount: { fontSize: 32, fontWeight: 'bold', color: COLORS.primaryBlue },
  spacesLabel: { fontSize: 12, color: COLORS.secondaryText },
  rateBadge: { backgroundColor: '#F4F8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rateText: { fontSize: 12, fontWeight: '600', color: COLORS.deepNavy },
  progressBarBg: { height: 8, backgroundColor: '#F4F8FF', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primaryBlue, borderRadius: 4 },
  activeSessionBanner: {
    backgroundColor: COLORS.deepNavy,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeSessionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  activeSessionSub: { color: '#9AA5B8', fontSize: 12, marginTop: 2 },
  recommendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#B8D8FC',
    marginBottom: 24,
    shadowColor: COLORS.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  recommendTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: 4 },
  recommendSub: { fontSize: 13, color: COLORS.secondaryText, marginBottom: 14 },
  recommendStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  statPill: { flex: 1, backgroundColor: '#F4F8FF', padding: 10, borderRadius: 10, alignItems: 'center' },
  statPillLabel: { fontSize: 10, color: COLORS.secondaryText, marginBottom: 2 },
  statPillVal: { fontSize: 14, fontWeight: 'bold', color: COLORS.deepNavy },
  bookNowButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bookNowText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: 12 },
  tilesRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borders,
  },
  tileIconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tileTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: 2 },
  tileSub: { fontSize: 11, color: COLORS.secondaryText },
});
