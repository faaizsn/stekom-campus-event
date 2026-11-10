import React from 'react';
import {
  Activity,
  CheckCircle,
  Database,
  Menu,
  Shield,
  Sparkles,
  User as UserIcon,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';

interface NavbarProps {
  currentUser: User;
  onSwitchRole: (role: UserRole) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  serverStatus: {
    online: boolean;
    persistence: string;
    mode: string;
  };
  onOpenSettings: () => void;
  currentTabLabel?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchRole,
  mobileMenuOpen,
  setMobileMenuOpen,
  serverStatus,
  onOpenSettings,
  currentTabLabel = 'Dashboard'
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/90 text-stone-800 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center font-black text-white text-base tracking-wider shadow-sm shadow-blue-900/10 border border-blue-600/30">
                ST
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                    STEKOM <span className="text-blue-700 font-semibold">EVENT</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    Sistem Kampus
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 hidden sm:block font-medium">
                  Universitas Sains & Teknologi Komputer
                </p>
              </div>
            </div>
          </div>

          {/* Right: Server Status, Role Switcher, User Info */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Persistence & Mode Indicator */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs text-stone-600 transition"
              title="Klik untuk konfigurasi Database & Firebase"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[11px]">Database Aktif</span>
            </button>

            {/* Role Quick Switcher (Warm segmented control) */}
            <div className="flex items-center bg-stone-100/90 rounded-xl p-1 border border-stone-200/80 text-xs">
              <span className="text-stone-500 text-[11px] font-semibold px-2 hidden md:inline">
                Akses:
              </span>
              {(['Administrator', 'Operator', 'Viewer'] as UserRole[]).map((role) => {
                const isActive = currentUser.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => onSwitchRole(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? role === 'Administrator'
                          ? 'bg-white text-blue-900 shadow-xs border border-stone-200/80'
                          : role === 'Operator'
                          ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/80'
                          : 'bg-white text-indigo-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
                    }`}
                  >
                    {role === 'Administrator' ? 'Admin' : role}
                  </button>
                );
              })}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-2.5 border-l border-stone-200 pl-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-stone-900 leading-tight truncate max-w-[150px]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] font-semibold text-blue-700 leading-tight">
                  {currentUser.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
