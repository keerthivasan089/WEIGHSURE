import React from 'react';
import { User, UserRole } from '../types';
import { MetrologyEmblem } from './MetrologyEmblem';
import { 
  LayoutDashboard, 
  Scale, 
  ClipboardCheck, 
  Sliders, 
  ShieldCheck, 
  Search, 
  UserCheck,
  X,
  QrCode
} from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  allUsers: User[];
  onSwitchRole: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenVerifyModal: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  sessionCount?: number;
  pendingCount?: number;
  instrumentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  allUsers,
  onSwitchRole,
  activeTab,
  setActiveTab,
  onOpenVerifyModal,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  sessionCount = 0,
  pendingCount = 0,
  instrumentCount = 0
}) => {
  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'technician':
        return 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
      case 'approving_officer':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 'auditor':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'admin':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'technician':
        return 'Verification Officer';
      case 'approving_officer':
        return 'Legal Metrology Officer';
      case 'auditor':
        return 'Quality Auditor';
      case 'admin':
        return 'System Administrator';
      default:
        return 'Inspector';
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Overview & quick metrics'
    },
    {
      id: 'instruments',
      label: 'Instruments',
      icon: Scale,
      badge: instrumentCount > 0 ? instrumentCount : null,
      description: 'NAWI registered units'
    },
    {
      id: 'sessions',
      label: 'Test Sessions',
      icon: ClipboardCheck,
      badge: pendingCount > 0 ? `${pendingCount} pending` : (sessionCount > 0 ? sessionCount : null),
      badgeAlert: pendingCount > 0,
      description: 'OIML verification logs'
    },
    {
      id: 'rules',
      label: 'Rule Engine',
      icon: Sliders,
      badge: 'R-76',
      description: 'MPE Table 6 configurations'
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ShieldCheck,
      badge: null,
      description: 'Tamper-evident ISO log'
    }
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 transition-all duration-300 ease-in-out flex flex-col justify-between
          bg-gradient-to-b from-[#e8f2fe] via-[#f1f7ff] to-[#e2effd] 
          border-r border-sky-200/90 shadow-md text-slate-800
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'}
        `}
      >
        {/* Top Section: Official Brand & Emblem */}
        <div className="flex flex-col">
          <div className="h-18 px-4 flex items-center justify-between border-b border-sky-200/80 bg-white/40 backdrop-blur-md">
            <div 
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
              title="WeighSure Legal Metrology Verification Platform"
            >
              <MetrologyEmblem size={38} className="transition-transform group-hover:scale-105 drop-shadow-xs" />
              
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-lg font-black tracking-tight text-slate-900 uppercase font-display">
                      WeighSure
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                      R-76
                    </span>
                  </div>
                  <span className="text-[10.5px] font-semibold text-sky-800 tracking-wide truncate">
                    Legal Metrology Bureau
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-sky-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            {(!isCollapsed || isMobileOpen) && (
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-sky-800">
                Core Metrology
              </div>
            )}

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  className={`w-full flex items-center rounded-xl transition-all font-semibold cursor-pointer group relative
                    ${isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'px-3.5 py-2.5 space-x-3'}
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : 'text-slate-700 hover:bg-sky-100/90 hover:text-blue-950'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex-1 text-left flex items-center justify-between min-w-0">
                      <span className="text-sm font-bold truncate">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 whitespace-nowrap
                          ${item.badgeAlert 
                            ? 'bg-amber-500 text-white font-black animate-pulse shadow-xs' 
                            : (isActive ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900 border border-sky-300')
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-sky-300">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Compliance & Verification Tools Section */}
            <div className="pt-3 pb-1 border-t border-sky-200/80 mt-3">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-sky-800">
                  Verification & Tools
                </div>
              )}

              {/* Public QR Verification Lookup */}
              <button
                id="sidebar-btn-public-verify"
                onClick={() => {
                  onOpenVerifyModal();
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className={`w-full flex items-center rounded-xl transition-all font-semibold cursor-pointer group relative text-slate-700 hover:bg-sky-100/90 hover:text-blue-950
                  ${isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'px-3.5 py-2 space-x-3'}
                `}
                title="Scan QR Code with Camera or Enter Certificate Number"
              >
                <QrCode className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-110" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="text-xs font-bold text-left flex-1 truncate">Scan & Verify QR</span>
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom Section: User Identity & Role Switcher */}
        {currentUser && (
          <div className="p-3 border-t border-sky-200/80 bg-white/50 backdrop-blur-md">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="space-y-2">
                {/* User card */}
                <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black font-mono shrink-0 shadow-2xs">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-slate-900 truncate leading-snug">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      {currentUser.licenseNumber || currentUser.department}
                    </div>
                  </div>
                </div>

                {/* Role Switcher */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-sky-900 px-0.5">
                    <span>Role Permissions</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      id="sidebar-role-select"
                      value={currentUser.id}
                      onChange={(e) => {
                        const found = allUsers.find(u => u.id === e.target.value);
                        if (found) onSwitchRole(found);
                      }}
                      title="Role selection"
                      className="w-full text-xs font-bold bg-white text-slate-900 px-2.5 py-2 rounded-lg border border-sky-300 appearance-none pr-7 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-400 shadow-2xs"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id} className="bg-white text-slate-900">
                          {getRoleLabel(u.role)}: {u.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Compliance footer stamp */}
                <div className="text-[9.5px] font-mono text-center text-slate-500 pt-1 tracking-tight font-semibold">
                  OIML R-76-1:2006 (E) · DoCA
                </div>
              </div>
            ) : (
              /* Collapsed avatar with tooltip */
              <div 
                className="flex justify-center cursor-pointer group relative"
                title={`${currentUser.name} (${getRoleLabel(currentUser.role)})`}
                onClick={() => setIsCollapsed(false)}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs hover:ring-2 hover:ring-blue-400 shadow-xs transition-all">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>

                <div className="absolute left-full ml-3 px-3 py-2 bg-white text-slate-900 border border-sky-200 text-xs rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  <div className="font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-[10px] text-sky-700 font-semibold">{getRoleLabel(currentUser.role)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
