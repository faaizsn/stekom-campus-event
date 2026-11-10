import React from 'react';
import {
  Activity,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { UserRole } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'events'
  | 'calendar'
  | 'room-monitoring'
  | 'rooms'
  | 'users'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  userRole: UserRole;
  onOpenMonthlyRecap?: () => void;
  stats?: {
    totalEvents: number;
    pendingEvents: number;
    totalRooms: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  userRole,
  onOpenMonthlyRecap,
  stats
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Administrator', 'Operator', 'Viewer']
    },
    {
      id: 'events',
      label: 'Data Event',
      icon: CalendarDays,
      badge: stats?.pendingEvents ? `${stats.pendingEvents} Baru` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
      roles: ['Administrator', 'Operator', 'Viewer']
    },
    {
      id: 'calendar',
      label: 'Kalender Event',
      icon: Calendar,
      roles: ['Administrator', 'Operator', 'Viewer']
    },
    {
      id: 'room-monitoring',
      label: 'Penggunaan Ruangan',
      icon: Activity,
      roles: ['Administrator', 'Operator', 'Viewer']
    },
    {
      id: 'rooms',
      label: 'Master Ruangan',
      icon: Building2,
      badge: '21 Ruang',
      roles: ['Administrator', 'Operator', 'Viewer']
    },
    {
      id: 'users',
      label: 'Pengguna',
      icon: Users,
      roles: ['Administrator']
    },
    {
      id: 'audit-logs',
      label: 'Audit Log',
      icon: History,
      roles: ['Administrator', 'Operator']
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: Settings,
      roles: ['Administrator']
    }
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container - Warm, Airy, Light Aesthetic */}
      <aside
        className={`fixed md:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-stone-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="p-4 space-y-1 overflow-y-auto flex-1">
          <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-stone-400 uppercase">
            Menu Operasional
          </div>

          {navItems.map((item) => {
            const hasAccess = item.roles.includes(userRole);
            if (!hasAccess) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-950 font-bold border-l-4 border-blue-600 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-700' : 'text-stone-400 group-hover:text-stone-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Action: Download Rekap Bulanan Event */}
          {onOpenMonthlyRecap && (
            <div className="pt-3 pb-1 border-t border-stone-200/80 mt-3">
              <button
                onClick={() => {
                  onOpenMonthlyRecap();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs bg-emerald-50/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs group"
              >
                <div className="flex items-center space-x-2.5">
                  <Download className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition" />
                  <span>Rekap Bulanan</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                  PDF / XLS
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/60">
          <div className="rounded-xl bg-white p-3 border border-stone-200/90 shadow-xs">
            <div className="flex items-center space-x-2 text-blue-800 text-xs font-bold mb-1">
              <Shield className="w-3.5 h-3.5 text-blue-700" />
              <span>Sistem Terverifikasi</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
              Hak Akses: <strong className="text-stone-900">{userRole}</strong>
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Zona Waktu: Asia/Jakarta (WIB)
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
