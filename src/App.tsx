import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  HelpCircle,
  Info,
  Shield,
  X
} from 'lucide-react';
import { EventDetailModal } from './components/EventDetailModal';
import { EventFormModal } from './components/EventFormModal';
import { MonthlyRecapModal } from './components/MonthlyRecapModal';
import { Navbar } from './components/Navbar';
import { ActiveTab, Sidebar } from './components/Sidebar';
import { api } from './services/api';
import {
  AuditLog,
  CampusEvent,
  FilterOptions,
  Room,
  User,
  UserRole
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
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Active User & Role
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-admin',
    name: 'Dr. Ir. Agus Wibowo, M.Kom',
    email: 'admin@stekom.ac.id',
    role: 'Administrator',
    department: 'Biro Administrasi Akademik & Sarpras',
    phone: '081234567890',
    created_at: '2026-01-01T08:00:00.000Z'
  });

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

  // Fetch initial data from server
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsData, eventsData, usersData, logsData] = await Promise.all([
        api.getRooms().catch(() => []),
        api.getEvents().catch(() => []),
        api.getUsers().catch(() => []),
        api.getAuditLogs().catch(() => [])
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
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Role Switcher for instant demonstration
  const handleSwitchRole = (newRole: UserRole) => {
    const matched = users.find((u) => u.role === newRole);
    if (matched) {
      setCurrentUser(matched);
    } else {
      setCurrentUser((prev) => ({
        ...prev,
        role: newRole,
        name:
          newRole === 'Administrator'
            ? 'Dr. Ir. Agus Wibowo, M.Kom'
            : newRole === 'Operator'
            ? 'Rahmat Hidayat, S.Kom'
            : 'Siti Nurhaliza (Mahasiswa / BEM)'
      }));
    }
    showToast('success', `Peran aktif dialihkan ke: ${newRole}`);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    showToast('info' as any, 'Semua filter pencarian telah di-reset');
  };

  // Open Form Modal for New Event
  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setInitialDateForForm(dateStr || '2026-11-10');
    setFormModalOpen(true);
  };

  // Open Form Modal for Editing Event
  const handleOpenEditModal = (event: CampusEvent) => {
    setEditingEvent(event);
    setInitialDateForForm(undefined);
    setFormModalOpen(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (eventData: Partial<CampusEvent>) => {
    try {
      if (eventData.id) {
        // Update
        const updated = await api.updateEvent(eventData.id, eventData, currentUser);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        showToast('success', `Jadwal event "${updated.nama_event}" berhasil diperbarui.`);
      } else {
        // Create
        const created = await api.createEvent(eventData, currentUser);
        setEvents((prev) => [created, ...prev]);
        showToast('success', `Event baru "${created.nama_event}" berhasil diajukan & dijadwalkan.`);
      }

      // Refresh audit logs
      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan event');
      throw err;
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    try {
      const target = events.find((e) => e.id === id);
      await api.deleteEvent(id, currentUser.name, currentUser.role);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast('success', `Event "${target?.nama_event || id}" berhasil dihapus.`);

      // Refresh audit logs
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
    const target = events.find((e) => e.id === id);
    if (!target) return;

    // Rule: "Deteksi bentrok berdasarkan ruangan, tanggal, dan irisan jam; event dibatalkan tidak memblokir ruangan. Tampilkan peringatan bentrok dan jangan izinkan konfirmasi jadwal yang bentrok."
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
  const handleAddUser = async (newUserData: Partial<User>) => {
    try {
      const user = await api.createUser(newUserData, currentUser);
      setUsers((prev) => [...prev, user]);
      showToast('success', `Pengguna "${user.name}" (${user.role}) berhasil ditambahkan.`);

      const refreshedLogs = await api.getAuditLogs().catch(() => auditLogs);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menambahkan pengguna');
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
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
    try {
      await api.resetData(currentUser.name, currentUser.role);
      await loadInitialData();
      showToast('success', 'Data contoh Universitas STEKOM berhasil dipulihkan.');
    } catch (err: any) {
      showToast('error', err.message || 'Gagal me-reset data');
      throw err;
    }
  };

  const pendingEventsCount = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        serverStatus={{
          online: true,
          persistence: 'File System (db.json)',
          mode: 'demo'
        }}
        onOpenSettings={() => setActiveTab('settings')}
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
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">
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
                    setEditingEvent(null);
                    setInitialDateForForm(dateStr);
                    setFormModalOpen(true);
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

              {activeTab === 'users' && (
                <UsersView
                  users={users}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {activeTab === 'audit-logs' && (
                <AuditLogsView logs={auditLogs} />
              )}

              {activeTab === 'settings' && (
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 bg-white">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          {toast.type === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span className="text-slate-800 leading-tight max-w-sm">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
