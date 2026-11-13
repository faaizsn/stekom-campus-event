import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  UserCheck,
  X
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  serverStatus: {
    online: boolean;
    persistence: string;
    mode: string;
  };
  onOpenSettings: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  currentTabLabel?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenSettings,
  onOpenChangePassword,
  onLogout
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleBadgeClass =
    currentUser.role === 'Administrator'
      ? 'bg-blue-50 text-blue-800 border-blue-200/80'
      : currentUser.role === 'Operator'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
      : 'bg-amber-50 text-amber-800 border-amber-200/80';

  const RoleIcon =
    currentUser.role === 'Administrator'
      ? Shield
      : currentUser.role === 'Operator'
      ? UserCheck
      : UserIcon;

  return (
    <header className="bg-[#FCFBF8]/95 backdrop-blur-md border-b border-stone-200/90 text-stone-800 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.75} />
              )}
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800 flex items-center justify-center font-black text-white text-base tracking-wider shadow-sm shadow-blue-900/10 border border-blue-600/30">
                ST
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-stone-900">
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

          {/* Right: DB Indicator, Role Badge, Profile Dropdown & Logout */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Persistence Indicator */}
            {currentUser.role === 'Administrator' ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-stone-200/70 border border-stone-200 text-xs text-stone-600 transition"
                title="Klik untuk konfigurasi Database & Pengaturan"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-[11px]">Database Aktif</span>
              </button>
            ) : (
              <div className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F7F5F0] border border-stone-200 text-xs text-stone-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-[11px]">Sistem Aktif</span>
              </div>
            )}

            {/* Authenticated Role Pill */}
            <div
              className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${roleBadgeClass}`}
            >
              <RoleIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{currentUser.role}</span>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative border-l border-stone-200 pl-2.5 sm:pl-3" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2.5 p-1 pr-2 rounded-xl hover:bg-[#F7F5F0] transition focus:outline-none"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-stone-900 leading-tight truncate max-w-[150px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] font-medium text-stone-500 leading-tight truncate max-w-[150px]">
                    {currentUser.email}
                  </p>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                  strokeWidth={1.75}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#FCFBF8] rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-stone-200/80">
                    <p className="text-xs font-extrabold text-stone-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadgeClass}`}>
                        <RoleIcon className="w-3 h-3" strokeWidth={1.75} />
                        <span>{currentUser.role}</span>
                      </span>
                      <span className="text-[10px] text-stone-400 truncate max-w-[110px]">
                        {currentUser.department}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-[#F7F5F0] hover:text-stone-900 transition"
                    >
                      <KeyRound className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
                      <span>Ubah Kata Sandi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" strokeWidth={1.75} />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Logout Quick Button */}
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50/80 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold transition"
              title="Keluar dari akun saat ini"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
