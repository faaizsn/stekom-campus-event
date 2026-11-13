import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';
import { LoginView } from './components/LoginView';
import { MonthlyRecapModal } from './components/MonthlyRecapModal';
import { Navbar } from './components/Navbar';
import { ActiveTab, Sidebar } from './components/Sidebar';
import { api, getStoredToken } from './services/api';
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

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Data State
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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
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

  // Fetch initial data from server (respecting role access)
  const loadInitialData = useCallback(
    async (user: User) => {
      try {
        setLoading(true);
        const [roomsData, eventsData, usersData, logsData] = await Promise.all([
          api.getRooms().catch(() => []),
          api.getEvents().catch(() => []),
          user.role === 'Administrator' ? api.getUsers().catch(() => []) : Promise.resolve([]),
          user.role === 'Administrator' || user.role === 'Operator'
            ? api.getAuditLogs().catch(() => [])
            : Promise.resolve([])
        ]);

        setRooms(roomsData);
        setEvents(eventsData);
        setUsers(usersData);
        setAuditLogs(logsData);
      } catch (err: any) {
        console.error('Failed to load data:', err);
        showToast('error', 'Gagal memuat data dari server. Periksa koneksi backend.');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  // Check existing login session on mount
  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        if (active) setAuthChecking(false);
        return;
      }

      try {
        const user = await api.getMe();
        if (active) {
          setCurrentUser(user);
          await loadInitialData(user);
        }
      } catch {
        // Token expired/invalid; fallback to Login screen
      } finally {
        if (active) setAuthChecking(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, [loadInitialData]);

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
    setCurrentUser(user);
    setActiveTab('dashboard');
    await loadInitialData(user);
    showToast('success', `Selamat datang, ${user.name} (${user.role})`);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setRooms([]);
    setEvents([]);
    setUsers([]);
    setAuditLogs([]);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
    setChangePasswordOpen(false);
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
        const updated = await api.updateEvent(eventData.id, eventData, currentUser);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        showToast('success', `Jadwal event "${updated.nama_event}" berhasil diperbarui.`);
      } else {
        const created = await api.createEvent(eventData, currentUser);
        setEvents((prev) => [created, ...prev]);
        showToast('success', `Event baru "${created.nama_event}" berhasil diajukan & dijadwalkan.`);
      }

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan event');
      throw err;
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!currentUser) return;
    try {
      const target = events.find((e) => e.id === id);
      await api.deleteEvent(id, currentUser.name, currentUser.role);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast('success', `Event "${target?.nama_event || id}" berhasil dihapus.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus event');
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
      const updated = await api.updateEvent(id, { status: newStatus }, currentUser);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast('success', `Status event diubah menjadi: ${newStatus}`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal mengubah status event');
      throw err;
    }
  };

  // Room Management Actions
  const handleUpdateRoom = async (id: string, updated: Partial<Room>) => {
    if (!currentUser) return;
    try {
      const result = await api.updateRoom(id, updated, currentUser);
      setRooms((prev) => prev.map((r) => (r.id === result.id ? result : r)));
      showToast('success', `Data ruangan "${result.name}" berhasil diperbarui.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal memperbarui data ruangan');
      throw err;
    }
  };

  const handleCreateRoom = async (newRoom: Partial<Room>) => {
    if (!currentUser) return;
    try {
      const result = await api.createRoom(newRoom, currentUser);
      setRooms((prev) => [...prev, result]);
      showToast('success', `Ruangan baru "${result.name}" berhasil ditambahkan.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menambahkan ruangan');
      throw err;
    }
  };

  // User Management Actions
  const handleAddUser = async (newUserData: Partial<User> & { password?: string }) => {
    if (!currentUser) return;
    try {
      const user = await api.createUser(newUserData, currentUser);
      setUsers((prev) => [...prev, user]);
      const passInfo = newUserData.password ? 'sesuai kata sandi yang diisi' : 'default: stekom123';
      showToast(
        'success',
        `Pengguna "${user.name}" (${user.role}) siap digunakan untuk login (${user.email}, sandi ${passInfo}).`
      );

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menambahkan pengguna');
      throw err;
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const updated = await api.updateUser(userId, data, currentUser);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast('success', `Data pengguna "${updated.name}" (${updated.role}) berhasil diperbarui.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal memperbarui data pengguna');
      throw err;
    }
  };

  const handleResetUserPassword = async (userId: string, newPassword: string) => {
    if (!currentUser) return;
    try {
      const updated = await api.updateUser(userId, { new_password: newPassword }, currentUser);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast('success', `Kata sandi untuk "${updated.name}" berhasil direset.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal mereset kata sandi pengguna');
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!currentUser) return;
    try {
      await api.deleteUser(id, currentUser.name, currentUser.role);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('success', 'Pengguna berhasil dihapus.');

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus pengguna');
    }
  };

  // Reset Demo Data
  const handleResetData = async () => {
    if (!currentUser) return;
    try {
      await api.resetData(currentUser.name, currentUser.role);
      await loadInitialData(currentUser);
      showToast('success', 'Data contoh Universitas STEKOM berhasil dipulihkan.');
    } catch (err: any) {
      showToast('error', err.message || 'Gagal me-reset data');
      throw err;
    }
  };

  // Checking existing token
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-stone-600">
          Memeriksa sesi login STEKOM Campus Event...
        </p>
      </div>
    );
  }

  // Unauthenticated -> Show Login Screen
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
        serverStatus={{
          online: true,
          persistence: api.isLocalMode() ? 'Browser Storage (Statis)' : 'File System (db.json)',
          mode: api.isLocalMode() ? 'local' : 'server'
        }}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
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
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onLogout={handleLogout}
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-stone-500">
                Memuat data event dan 21 ruangan STEKOM...
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
                  onResetPassword={handleResetUserPassword}
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userEmail={currentUser.email}
        onSuccessToast={(msg) => showToast('success', msg)}
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
