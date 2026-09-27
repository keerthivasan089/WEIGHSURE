import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  Menu, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  QrCode, 
  Camera,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { MetrologyEmblem } from './MetrologyEmblem';

interface TopBarProps {
  currentUser: User | null;
  allUsers?: User[];
  onSwitchRole?: (user: User) => void;
  activeTab: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar: () => void;
  onOpenVerifyModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  allUsers = [],
  onSwitchRole,
  activeTab,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenVerifyModal
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Metrology Dashboard';
      case 'instruments':
        return 'NAWI Instruments Registry';
      case 'sessions':
        return 'OIML R-76 Verification Test Sessions';
      case 'rules':
        return 'Deterministic MPE Rule Engine & Parameters';
      case 'audit':
        return 'Cryptographic ISO 17025 Audit Trail';
      default:
        return 'WeighSure Legal Metrology';
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Continuous compliance monitoring & legal verification throughput';
      case 'instruments':
        return 'Type approved Class I, II, III & IIII non-automatic weighing systems';
      case 'sessions':
        return 'Multi-stage laboratory evaluation: repeatability, errors, & eccentricity';
      case 'rules':
        return 'OIML R-76 Table 6 maximum permissible errors & verification thresholds';
      case 'audit':
        return 'Immutable event logs with cryptographic verification integrity';
      default:
        return 'Deterministic evaluation system';
    }
  };

  return (
    <header 
      id="app-topbar"
      className="sticky top-0 z-30 h-18 bg-gradient-to-r from-[#dcedfd] via-[#edf5ff] to-[#e0eefd] border-b border-sky-200/90 shadow-sm text-slate-900 backdrop-blur-md"
    >
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Left Side: Burger Menu Button & View Title */}
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
          {/* Burger Menu Button */}
          <button
            id="btn-burger-menu"
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl bg-white hover:bg-sky-50 text-blue-900 border border-sky-200 hover:border-sky-300 transition-all cursor-pointer transform active:scale-95 shadow-xs shrink-0"
            title={isSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            aria-label={isSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          >
            <Menu className="w-5 h-5 text-blue-800" />
          </button>

          {/* Small emblem visible on mobile when sidebar is closed */}
          <div className="md:hidden shrink-0">
            <MetrologyEmblem size={28} />
          </div>

          {/* Dynamic Page Header Title */}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate font-display">
                {getTabTitle(activeTab)}
              </h1>
              <span className="hidden xl:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>OIML R-76 Standard</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 truncate hidden sm:block font-medium">
              {getTabSubtitle(activeTab)}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Metrological Tools & Prominent User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Public QR Verification Shortcut */}
          <button
            id="topbar-btn-public-verify"
            onClick={onOpenVerifyModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border border-blue-500 transition-all shadow-xs cursor-pointer"
            title="Scan QR Code with Camera or Enter Certificate Number"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-200" />
            <span className="hidden sm:inline">Verify QR</span>
          </button>

          {/* User Name & Role Profile - PROMINENTLY VISIBLE ON RIGHT SIDE */}
          {currentUser && (
            <div className="relative" ref={dropdownRef}>
              <div 
                id="topbar-user-profile"
                onClick={() => allUsers.length > 0 && onSwitchRole && setIsRoleDropdownOpen(prev => !prev)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-sky-200 shadow-xs transition-all ${
                  allUsers.length > 0 && onSwitchRole ? 'cursor-pointer hover:border-sky-400 hover:bg-sky-50/50' : ''
                }`}
                title={`Logged in as ${currentUser.name} (${currentUser.role.replace('_', ' ')}) - Click to switch role`}
              >
                {/* User Avatar with Initials */}
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black font-mono shadow-xs shrink-0">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>

                {/* User Name and Role - Always visible */}
                <div className="text-left flex flex-col justify-center">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight whitespace-nowrap">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded capitalize whitespace-nowrap">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    {currentUser.licenseNumber && (
                      <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
                        · {currentUser.licenseNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dropdown Chevron indicator */}
                {allUsers.length > 0 && onSwitchRole && (
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </div>

              {/* Quick Role Switcher Dropdown */}
              {isRoleDropdownOpen && allUsers.length > 0 && onSwitchRole && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-sky-200 py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Switch Metrology Role
                  </div>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchRole(u);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors hover:bg-sky-50 ${
                        u.id === currentUser.id ? 'bg-sky-50/80 font-bold text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{u.role.replace('_', ' ')}</div>
                      </div>
                      {u.id === currentUser.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
