import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';
import { LoginView } from './components/LoginView';
import { MonthlyRecapModal } from './components/MonthlyRecapModal';
import { Navbar } from './components/Navbar';
import { ActiveTab, Sidebar } from './components/Sidebar';
import { api, syncFirebaseUserProfile } from './services/api';
import {
  AuditLog,
  CampusEvent,
  FilterOptions,
  Room,
  User
} from './types';
import { checkEventConflict } from './utils/conflictDetector';
import { AuditLogsView } from './views/AuditLogsView';
import { CalendarView } from './views/CalendarView';
import { DashboardView } from './views/DashboardView';
import { EventsView } from './views/EventsView';
import { MasterRoomsView } from './views/MasterRoomsView';
import { RoomMonitoringView } from './views/RoomMonitoringView';
import { SettingsView } from './views/SettingsView';
import { UsersView } from './views/UsersView';

const DEFAULT_FILTERS: FilterOptions = {
  month: 'all',
  year: 'all',
  status: 'all',
  roomId: 'all',
  pic: '',
  search: ''
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  detailPath?: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let errorMessage = error?.message || 'Terjadi kesalahan pada aplikasi.';
    let detailPath: string | undefined;
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed && typeof parsed.error === 'string') {
        errorMessage = parsed.error;
        detailPath = parsed.path;
      }
    } catch {
      // plain text error
    }
    return { hasError: true, errorMessage, detailPath };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center p-6">
          <div className="bg-[#FCFBF8] border border-stone-200 rounded-[26px] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2.5 text-rose-700">
              <AlertTriangle className="w-6 h-6 shrink-0" strokeWidth={1.75} />
              <h2 className="text-base font-extrabold text-stone-900">
                Terjadi Kendala Sistem
              </h2>
            </div>
            <p className="text-stone-600 leading-relaxed">{this.state.errorMessage}</p>
            {this.state.detailPath && (
              <p className="text-[11px] font-mono bg-[#F7F5F0] px-3 py-1.5 rounded-xl border border-stone-200 text-stone-500">
                Path: {this.state.detailPath}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatReadableError(err: any, fallback: string): string {
  const raw = err?.message || '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.toLowerCase().includes('permission') || parsed.error.toLowerCase().includes('insufficient')) {
        return `Akses Firestore ditolak untuk operasi ini (${parsed.path || 'data'}). Hubungi Administrator.`;
      }
      return parsed.error;
    }
  } catch {
    // not JSON
  }
  return raw || fallback;
}

function AppContent() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const syncedUidRef = useRef<string | null>(null);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const serverStatus = {
    online: true,
    persistence: 'Firebase Cloud Firestore (Real-Time)',
    mode: 'firestore'
  };

  // Real-time Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter State (Consistent across Views)
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [monthlyRecapOpen, setMonthlyRecapOpen] = useState(false);
  const [recapMonth, setRecapMonth] = useState('11');
  const [recapYear, setRecapYear] = useState('2026');
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [initialDateForForm, setInitialDateForForm] = useState<string | undefined>(undefined);
  const [initialRoomForForm, setInitialRoomForForm] = useState<string | undefined>(undefined);

  const handleOpenMonthlyRecap = (month?: string, year?: string) => {
    if (month) setRecapMonth(month);
    if (year) setRecapYear(year);
    setMonthlyRecapOpen(true);
  };

  // Toast notification helper
  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Observe Firebase Auth state cleanly across reloads/tabs
  useEffect(() => {
    let active = true;
    const unsubscribeAuth = api.observeAuth(async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        syncedUidRef.current = null;
        setCurrentUser(null);
        setRooms([]);
        setEvents([]);
        setUsers([]);
        setAuditLogs([]);
        setAuthChecking(false);
        return;
      }

      if (syncedUidRef.current === firebaseUser.uid) {
        if (active) setAuthChecking(false);
        return;
      }

      try {
        const profile = await syncFirebaseUserProfile(firebaseUser);
        if (active) {
          syncedUidRef.current = firebaseUser.uid;
          setCurrentUser(profile);
        }
      } catch (err: any) {
        console.error('Failed to sync Firebase user profile:', err);
        if (active) {
          showToast('error', formatReadableError(err, 'Gagal memuat profil akun Google.'));
        }
      } finally {
        if (active) setAuthChecking(false);
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, [showToast]);

  // Attach real-time Firestore listeners scoped by user role
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    let roomsArrived = false;
    let eventsArrived = false;

    const markReadyIfBothArrived = () => {
      if (roomsArrived && eventsArrived) {
        setLoading(false);
      }
    };

    const handleSubError = (err: Error) => {
      setLoading(false);
      showToast('error', formatReadableError(err, 'Gagal menyinkronkan data Cloud Firestore.'));
    };

    const unsubs: Array<() => void> = [];

    unsubs.push(
      api.subscribeRooms((list) => {
        setRooms(list);
        roomsArrived = true;
        markReadyIfBothArrived();
      }, handleSubError)
    );

    unsubs.push(
      api.subscribeEvents((list) => {
        setEvents(list);
        eventsArrived = true;
        markReadyIfBothArrived();
      }, handleSubError)
    );

    if (currentUser.role !== 'Viewer') {
      unsubs.push(
        api.subscribeAuditLogs((list) => {
          setAuditLogs(list);
        }, handleSubError)
      );
    } else {
      setAuditLogs([]);
    }

    if (currentUser.role === 'Administrator') {
      unsubs.push(
        api.subscribeUsers((list) => {
          setUsers(list);
        }, handleSubError)
      );
    } else {
      setUsers([]);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser?.id, currentUser?.role, showToast]);

  // Enforce RBAC tab guard
  useEffect(() => {
    if (!currentUser) return;
    if ((activeTab === 'users' || activeTab === 'settings') && currentUser.role !== 'Administrator') {
      setActiveTab('dashboard');
    } else if (activeTab === 'audit-logs' && currentUser.role === 'Viewer') {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  const handleLoginSuccess = async (user: User) => {
    syncedUidRef.current = user.id;
    setCurrentUser(user);
    setActiveTab('dashboard');
    showToast('success', `Selamat datang, ${user.name} (${user.role})`);
  };

  const handleLogout = async () => {
    const actor = currentUser;
    syncedUidRef.current = null;
    await api.logout(actor);
    setCurrentUser(null);
    setRooms([]);
    setEvents([]);
    setUsers([]);
    setAuditLogs([]);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
    showToast('success', 'Anda telah keluar (logout) dari sistem.');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    showToast('success', 'Semua filter pencarian telah di-reset');
  };

  // Open Form Modal for New Event
  const handleOpenCreateModal = (dateStr?: string, roomId?: string) => {
    setEditingEvent(null);
    setInitialDateForForm(dateStr || '2026-11-10');
    setInitialRoomForForm(roomId);
    setFormModalOpen(true);
  };

  // Open Form Modal for Editing Event
  const handleOpenEditModal = (event: CampusEvent) => {
    setEditingEvent(event);
    setInitialDateForForm(undefined);
    setInitialRoomForForm(undefined);
    setFormModalOpen(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (eventData: Partial<CampusEvent>) => {
    if (!currentUser) return;
    try {
      if (eventData.id) {
        const updated = await api.updateEvent(eventData.id, eventData, currentUser, events, rooms);
        showToast('success', `Jadwal event "${updated.nama_event}" berhasil diperbarui.`);
      } else {
        const created = await api.createEvent(eventData, currentUser, events, rooms);
        showToast('success', `Event baru "${created.nama_event}" berhasil diajukan & dijadwalkan.`);
      }
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal menyimpan event'));
      throw err;
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!currentUser) return;
    try {
      const target = events.find((e) => e.id === id);
      await api.deleteEvent(id, currentUser, target?.nama_event);
      showToast('success', `Event "${target?.nama_event || id}" berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal menghapus event'));
    }
  };

  // Update Status (Scheduled, Batalkan, dsb) with strict clash verification
  const handleUpdateEventStatus = async (
    id: string,
    newStatus: 'Scheduled' | 'Dibatalkan' | 'Menunggu Konfirmasi'
  ) => {
    if (!currentUser) return;
    const target = events.find((e) => e.id === id);
    if (!target) return;

    if (newStatus === 'Scheduled') {
      const conflictCheck = checkEventConflict(
        {
          id: target.id,
          tanggal: target.tanggal,
          jam_mulai: target.jam_mulai,
          jam_selesai: target.jam_selesai,
          ruangan_ids: target.ruangan_ids,
          status: newStatus
        },
        events,
        rooms
      );

      if (conflictCheck.hasConflict) {
        const first = conflictCheck.conflicts[0];
        const msg = `Tidak diizinkan menetapkan Scheduled! ${first.reason}`;
        showToast('error', msg);
        throw new Error(msg);
      }
    }

    try {
      await api.updateEvent(id, { status: newStatus }, currentUser, events, rooms);
      showToast('success', `Status event diubah menjadi: ${newStatus}`);
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal mengubah status event'));
      throw err;
    }
  };

  // Room Management Actions
  const handleUpdateRoom = async (id: string, updated: Partial<Room>) => {
    if (!currentUser) return;
    try {
      const result = await api.updateRoom(id, updated, currentUser);
      showToast('success', `Data ruangan "${result.name}" berhasil diperbarui.`);
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal memperbarui data ruangan'));
      throw err;
    }
  };

  const handleCreateRoom = async (newRoom: Partial<Room>) => {
    if (!currentUser) return;
    try {
      const result = await api.createRoom(newRoom, currentUser);
      showToast('success', `Ruangan baru "${result.name}" berhasil ditambahkan.`);
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal menambahkan ruangan'));
      throw err;
    }
  };

  // User Management Actions (Google Auth Role Invitations & Updates)
  const handleAddUser = async (newUserData: Partial<User>) => {
    if (!currentUser) return;
    try {
      const user = await api.createUser(newUserData, currentUser);
      showToast(
        'success',
        `Akses "${user.name}" (${user.role}) tersimpan untuk email Google ${user.email}.`
      );
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal menambahkan pengguna'));
      throw err;
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    if (!currentUser) return;
    try {
      await api.updateUser(userId, data, currentUser);
      showToast('success', 'Data & peran pengguna berhasil diperbarui.');
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal memperbarui data pengguna'));
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!currentUser) return;
    try {
      const target = users.find((u) => u.id === id);
      await api.deleteUser(id, currentUser, target?.name);
      showToast('success', 'Akses pengguna berhasil dihapus.');
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal menghapus pengguna'));
    }
  };

  // Reset Demo Data
  const handleResetData = async () => {
    if (!currentUser) return;
    try {
      await api.resetData(currentUser);
      showToast('success', 'Data contoh Universitas STEKOM berhasil dipulihkan ke Cloud Firestore.');
    } catch (err: any) {
      showToast('error', formatReadableError(err, 'Gagal me-reset data'));
      throw err;
    }
  };

  // Checking existing Firebase Auth session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-stone-600">
          Memeriksa sesi Firebase STEKOM Campus Event...
        </p>
      </div>
    );
  }

  // Unauthenticated -> Show Google Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border border-stone-200 text-xs font-semibold bg-[#FCFBF8]">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={1.75} />
            )}
            {toast.type === 'error' && (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" strokeWidth={1.75} />
            )}
            <span className="text-stone-800 leading-tight max-w-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-stone-400 hover:text-stone-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </>
    );
  }

  const pendingEventsCount = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-stone-800 flex flex-col font-sans antialiased selection:bg-blue-700 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        serverStatus={serverStatus}
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          userRole={currentUser.role}
          stats={{
            totalEvents: events.length,
            pendingEvents: pendingEventsCount,
            totalRooms: rooms.length
          }}
          onOpenMonthlyRecap={() => handleOpenMonthlyRecap()}
          onLogout={handleLogout}
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-stone-500">
                Menyinkronkan data event dan 21 ruangan STEKOM dari Cloud Firestore...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  events={events}
                  rooms={rooms}
                  userRole={currentUser.role}
                  onOpenCreateModal={() => handleOpenCreateModal()}
                  onSelectEvent={(ev) => {
                    setSelectedEvent(ev);
                    setDetailModalOpen(true);
                  }}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenMonthlyRecap={() => handleOpenMonthlyRecap()}
                />
              )}

              {activeTab === 'events' && (
                <EventsView
                  events={events}
                  rooms={rooms}
                  userRole={currentUser.role}
                  filters={filters}
                  setFilters={setFilters}
                  onResetFilters={handleResetFilters}
                  onOpenCreateModal={() => handleOpenCreateModal()}
                  onSelectEvent={(ev) => {
                    setSelectedEvent(ev);
                    setDetailModalOpen(true);
                  }}
                  onEditEvent={(ev) => handleOpenEditModal(ev)}
                  onDeleteEvent={handleDeleteEvent}
                  onOpenMonthlyRecap={() => handleOpenMonthlyRecap()}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  events={events}
                  rooms={rooms}
                  userRole={currentUser.role}
                  filters={filters}
                  setFilters={setFilters}
                  onResetFilters={handleResetFilters}
                  onSelectEvent={(ev) => {
                    setSelectedEvent(ev);
                    setDetailModalOpen(true);
                  }}
                  onAddEventOnDate={(dateStr) => handleOpenCreateModal(dateStr)}
                  onOpenMonthlyRecap={(month, year) => handleOpenMonthlyRecap(month, year)}
                />
              )}

              {activeTab === 'room-monitoring' && (
                <RoomMonitoringView
                  rooms={rooms}
                  events={events}
                  userRole={currentUser.role}
                  onBookRoom={(roomId, dateStr) => {
                    handleOpenCreateModal(dateStr, roomId);
                  }}
                  onSelectEvent={(ev) => {
                    setSelectedEvent(ev);
                    setDetailModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'rooms' && (
                <MasterRoomsView
                  rooms={rooms}
                  userRole={currentUser.role}
                  onUpdateRoom={handleUpdateRoom}
                  onCreateRoom={handleCreateRoom}
                />
              )}

              {activeTab === 'users' && currentUser.role === 'Administrator' && (
                <UsersView
                  users={users}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {activeTab === 'audit-logs' && currentUser.role !== 'Viewer' && (
                <AuditLogsView logs={auditLogs} />
              )}

              {activeTab === 'settings' && currentUser.role === 'Administrator' && (
                <SettingsView
                  userRole={currentUser.role}
                  onResetData={handleResetData}
                  eventsCount={events.length}
                  roomsCount={rooms.length}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Event Form Modal (Create / Edit) */}
      <EventFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
        initialDate={initialDateForForm}
        initialRoomId={initialRoomForForm}
        allEvents={events}
        rooms={rooms}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        event={selectedEvent}
        rooms={rooms}
        userRole={currentUser.role}
        onEdit={(ev) => handleOpenEditModal(ev)}
        onDelete={handleDeleteEvent}
        onUpdateStatus={handleUpdateEventStatus}
      />

      {/* Monthly Recap Download Modal */}
      <MonthlyRecapModal
        isOpen={monthlyRecapOpen}
        onClose={() => setMonthlyRecapOpen(false)}
        events={events}
        rooms={rooms}
        currentUser={currentUser}
        initialMonth={recapMonth}
        initialYear={recapYear}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border border-stone-200 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 bg-[#FCFBF8]">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={1.75} />
          )}
          {toast.type === 'error' && (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" strokeWidth={1.75} />
          )}
          {toast.type === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.75} />
          )}
          <span className="text-stone-800 leading-tight max-w-sm">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-stone-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
