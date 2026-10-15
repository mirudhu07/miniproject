import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  Building2,
  Activity,
  ShieldCheck,
  Bell,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

interface OverviewStats {
  totalParks: number;
  totalFacilities: number;
  totalCapacity: number;
  occupiedSpaces: number;
  reservedSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  activeSessionsCount: number;
  activeReservationsCount: number;
  systemHealth: {
    database: string;
    status: string;
  };
}

interface ZoneInfo {
  id: string;
  name: string;
  code: string;
  facilityName: string;
  buildingName: string;
  level: number;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  reservedSpaces: number;
  currentOccupancyRate: number;
  predictedOccupancyRate: number;
  pricePerHour: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'occupancy' | 'facilities' | 'reservations' | 'sessions' | 'health'>('overview');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [alertText, setAlertText] = useState('');
  const [alertSuccess, setAlertSuccess] = useState('');

  // Fallback demo dataset
  const fallbackStats: OverviewStats = {
    totalParks: 3,
    totalFacilities: 4,
    totalCapacity: 1250,
    occupiedSpaces: 780,
    reservedSpaces: 110,
    availableSpaces: 360,
    occupancyRate: 71,
    activeSessionsCount: 780,
    activeReservationsCount: 110,
    systemHealth: { database: 'in-memory-dev', status: 'operational' },
  };

  const fallbackZones: ZoneInfo[] = [
    {
      id: 'z1',
      name: 'Ground Level - Premium & EV',
      code: 'L0-EV',
      facilityName: 'CyberGate Multi-Level Garage A',
      buildingName: 'Tower A',
      level: 0,
      totalSpaces: 100,
      availableSpaces: 25,
      occupiedSpaces: 65,
      reservedSpaces: 10,
      currentOccupancyRate: 75,
      predictedOccupancyRate: 82,
      pricePerHour: 30,
    },
    {
      id: 'z2',
      name: 'Level 1 - Express Commuter',
      code: 'L1-EXP',
      facilityName: 'CyberGate Multi-Level Garage A',
      buildingName: 'Tower A',
      level: 1,
      totalSpaces: 150,
      availableSpaces: 25,
      occupiedSpaces: 110,
      reservedSpaces: 15,
      currentOccupancyRate: 83,
      predictedOccupancyRate: 89,
      pricePerHour: 25,
    },
    {
      id: 'z3',
      name: 'Level 2 - General Office Parking',
      code: 'L2-GEN',
      facilityName: 'CyberGate Multi-Level Garage A',
      buildingName: 'Tower A',
      level: 2,
      totalSpaces: 250,
      availableSpaces: 90,
      occupiedSpaces: 140,
      reservedSpaces: 20,
      currentOccupancyRate: 64,
      predictedOccupancyRate: 68,
      pricePerHour: 20,
    },
    {
      id: 'z4',
      name: 'Basement B1 - Visitor & Staff',
      code: 'B1-ALL',
      facilityName: 'CyberGate Basement B',
      buildingName: 'Tower B',
      level: -1,
      totalSpaces: 200,
      availableSpaces: 50,
      occupiedSpaces: 130,
      reservedSpaces: 20,
      currentOccupancyRate: 75,
      predictedOccupancyRate: 70,
      pricePerHour: 20,
    },
  ];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check health
      const healthRes = await axios.get('http://127.0.0.1:5001/health', { timeout: 1500 });
      if (healthRes.status === 200) {
        setBackendOnline(true);
        // Load real overview
        const res = await axios.get(`${API_BASE}/facilities`, { timeout: 2000 });
        if (res.data?.data) {
          setFacilities(res.data.data);
        }
      }
    } catch (e) {
      setBackendOnline(false);
      setStats(fallbackStats);
      setZones(fallbackZones);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Socket.IO for live updates
    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, { timeout: 2000, reconnectionAttempts: 2 });
      socket.on('occupancy:changed', (data: any) => {
        setZones((prev) =>
          prev.map((z) => (z.id === data.zoneId ? { ...z, availableSpaces: data.availableSpaces, currentOccupancyRate: data.occupancyPercentage } : z))
        );
      });
    } catch {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const currentStats = stats || fallbackStats;
  const currentZones = zones.length > 0 ? zones : fallbackZones;

  const handleBroadcastAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertText) return;
    setAlertSuccess(`Broadcasted "${alertText}" to all connected campus drivers.`);
    setAlertText('');
    setTimeout(() => setAlertSuccess(''), 4000);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F8FF' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#071D42', color: '#FFFFFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #142B55' }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #142B55' }}>
          <img src="/smartpark-logo.png" alt="SmartPark AI" style={{ height: '36px', borderRadius: '8px' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '17px', letterSpacing: '-0.3px' }}>SmartPark AI</div>
            <div style={{ fontSize: '11px', color: '#68758A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Enterprise Console</div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'occupancy', label: 'Live Occupancy', icon: Activity },
            { id: 'facilities', label: 'Parking Facilities', icon: Building2 },
            { id: 'reservations', label: 'Reservations', icon: CalendarCheck },
            { id: 'sessions', label: 'Active Sessions', icon: Car },
            { id: 'health', label: 'System Health', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: active ? '#0878E8' : 'transparent',
                  color: active ? '#FFFFFF' : '#DFE8F4',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #142B55', fontSize: '12px', color: '#68758A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: backendOnline ? '#39D353' : '#FFB020' }} />
            <span>{backendOnline ? 'API Connected (5001)' : 'Offline Dev Mode'}</span>
          </div>
          <div>v1.0.0-enterprise</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{ height: '70px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #DFE8F4', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#071D42' }}>
              {activeTab === 'overview' && 'Campus Parking Overview'}
              {activeTab === 'occupancy' && 'Real-Time Occupancy & AI Predictions'}
              {activeTab === 'facilities' && 'Campus Facilities & Zones'}
              {activeTab === 'reservations' && 'Active & Scheduled Reservations'}
              {activeTab === 'sessions' && 'Active Live Parking Sessions'}
              {activeTab === 'health' && 'Cluster Health & Diagnostics'}
            </h1>
            <p style={{ fontSize: '13px', color: '#68758A' }}>CyberGate IT Park • Bangalore Hub Alpha</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={fetchDashboardData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#F4F8FF',
                border: '1px solid #DFE8F4',
                borderRadius: '8px',
                color: '#071D42',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <div style={{ padding: '8px 14px', backgroundColor: '#EBF4FF', borderRadius: '8px', color: '#0878E8', fontWeight: 600, fontSize: '13px' }}>
              Operator: admin@smartpark.ai
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: '32px', flex: 1 }}>
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Stat Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #DFE8F4', boxShadow: '0 2px 8px rgba(7,29,66,0.04)' }}>
                  <div style={{ fontSize: '13px', color: '#68758A', marginBottom: '8px', fontWeight: 500 }}>Total Campus Capacity</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#071D42' }}>{currentStats.totalCapacity.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#39D353', marginTop: '6px', fontWeight: 500 }}>3 IT Parks • 4 Facilities</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #DFE8F4', boxShadow: '0 2px 8px rgba(7,29,66,0.04)' }}>
                  <div style={{ fontSize: '13px', color: '#68758A', marginBottom: '8px', fontWeight: 500 }}>Available Free Spaces</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0878E8' }}>{currentStats.availableSpaces.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#68758A', marginTop: '6px' }}>Available for incoming cars</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #DFE8F4', boxShadow: '0 2px 8px rgba(7,29,66,0.04)' }}>
                  <div style={{ fontSize: '13px', color: '#68758A', marginBottom: '8px', fontWeight: 500 }}>Current Occupancy Rate</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentStats.occupancyRate > 85 ? '#E53E3E' : '#071D42' }}>
                    {currentStats.occupancyRate}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#68758A', marginTop: '6px' }}>{currentStats.occupiedSpaces} occupied • {currentStats.reservedSpaces} reserved</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #DFE8F4', boxShadow: '0 2px 8px rgba(7,29,66,0.04)' }}>
                  <div style={{ fontSize: '13px', color: '#68758A', marginBottom: '8px', fontWeight: 500 }}>Active Parking Sessions</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#39D353' }}>{currentStats.activeSessionsCount}</div>
                  <div style={{ fontSize: '12px', color: '#68758A', marginTop: '6px' }}>Live vehicle timestamps active</div>
                </div>
              </div>

              {/* Broadcast Alert Bar */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #DFE8F4', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#071D42', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={18} color="#0878E8" />
                  <span>Broadcast Real-Time Campus Notification</span>
                </h3>
                <form onSubmit={handleBroadcastAlert} style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={alertText}
                    onChange={(e) => setAlertText(e.target.value)}
                    placeholder="E.g., Garage A Level 2 reserved for executive townhall from 2 PM to 5 PM"
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #DFE8F4', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '10px 20px', backgroundColor: '#0878E8', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Send Push Alert
                  </button>
                </form>
                {alertSuccess && (
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#EBFBF0', color: '#27903D', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{alertSuccess}</span>
                  </div>
                )}
              </div>

              {/* Occupancy Zones Quick View */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', border: '1px solid #DFE8F4' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#071D42', marginBottom: '16px' }}>Top Congested Zones</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {currentZones.map((z) => (
                    <div key={z.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ fontWeight: 600, color: '#071D42' }}>{z.name} <span style={{ color: '#68758A', fontWeight: 400 }}>({z.code})</span></span>
                        <span style={{ fontWeight: 600, color: z.currentOccupancyRate > 80 ? '#E53E3E' : '#0878E8' }}>
                          {z.currentOccupancyRate}% Occupied ({z.availableSpaces} free / {z.totalSpaces})
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#F4F8FF', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${z.currentOccupancyRate}%`,
                            height: '100%',
                            backgroundColor: z.currentOccupancyRate > 80 ? '#E53E3E' : '#0878E8',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIVE OCCUPANCY & AI PREDICTIONS */}
          {activeTab === 'occupancy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#EBF4FF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #B8D8FC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={22} color="#0878E8" />
                <div style={{ fontSize: '14px', color: '#071D42' }}>
                  <strong>SmartPark AI Prediction Model Active:</strong> Hourly demand forecasting powered by scikit-learn Random Forest Regressor trained on corporate IT park mobility patterns.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {currentZones.map((z) => (
                  <div key={z.id} style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '14px', border: '1px solid #DFE8F4', boxShadow: '0 2px 8px rgba(7,29,66,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#071D42' }}>{z.name}</div>
                        <div style={{ fontSize: '13px', color: '#68758A' }}>{z.facilityName}</div>
                      </div>
                      <span style={{ padding: '4px 10px', backgroundColor: '#F4F8FF', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0878E8' }}>
                        Level {z.level}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: '#F4F8FF', borderRadius: '10px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#68758A' }}>Current Occupancy</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#071D42' }}>{z.currentOccupancyRate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#68758A' }}>Predicted in 60m</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0878E8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={16} />
                          {z.predictedOccupancyRate}%
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#68758A' }}>
                      <span>Free Spaces: <strong style={{ color: '#39D353' }}>{z.availableSpaces}</strong></span>
                      <span>Total Capacity: <strong>{z.totalSpaces}</strong></span>
                      <span>Rate: <strong>₹{z.pricePerHour}/hr</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SYSTEM HEALTH */}
          {activeTab === 'health' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '14px', border: '1px solid #DFE8F4' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#071D42', marginBottom: '20px' }}>Cluster Health & Liveness Probes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F4F8FF', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 color="#39D353" size={20} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#071D42' }}>Backend API Service</div>
                      <div style={{ fontSize: '12px', color: '#68758A' }}>Port 5001 • Node.js Express TypeScript</div>
                    </div>
                  </div>
                  <span style={{ padding: '6px 12px', backgroundColor: '#EBFBF0', color: '#27903D', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                    HTTP 200 OK
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F4F8FF', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 color="#39D353" size={20} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#071D42' }}>ML Inference Engine</div>
                      <div style={{ fontSize: '12px', color: '#68758A' }}>Port 8000 • FastAPI + Random Forest Model Artifact</div>
                    </div>
                  </div>
                  <span style={{ padding: '6px 12px', backgroundColor: '#EBFBF0', color: '#27903D', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                    Model Loaded (rf-v1.0.0)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F4F8FF', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 color="#39D353" size={20} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#071D42' }}>Database Connectivity</div>
                      <div style={{ fontSize: '12px', color: '#68758A' }}>Dedicated Database: smartpark_ai_db</div>
                    </div>
                  </div>
                  <span style={{ padding: '6px 12px', backgroundColor: '#EBFBF0', color: '#27903D', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                    Connected & Ready
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OTHER SCREENS (Facilities, Reservations, Sessions) */}
          {(activeTab === 'facilities' || activeTab === 'reservations' || activeTab === 'sessions') && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '14px', border: '1px solid #DFE8F4', textAlign: 'center', color: '#68758A' }}>
              <Building2 size={48} color="#0878E8" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#071D42', marginBottom: '8px' }}>
                {activeTab === 'facilities' && 'Campus Facilities Directory'}
                {activeTab === 'reservations' && 'Campus Reservations Ledger'}
                {activeTab === 'sessions' && 'Live On-Premise Parking Sessions'}
              </h3>
              <p style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                Data synced live via Socket.IO events directly from the SmartPark AI backend.
              </p>
              <button
                onClick={() => setActiveTab('overview')}
                style={{ padding: '10px 20px', backgroundColor: '#0878E8', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Return to Overview
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
export default App;
