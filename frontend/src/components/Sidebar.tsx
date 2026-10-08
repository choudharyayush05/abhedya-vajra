import React from 'react';
import {
  FolderOpen,
  Network,
  Users,
  Share2,
  FileText,
  Database,
  Settings,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Ordered tabs with colorful icon accents
const navItems = [
  { id: 'load', label: 'Load Data', icon: FolderOpen, color: '#2563EB', bg: '#EFF6FF' },
  { id: 'investigate', label: 'Graph Explorer', icon: Network, color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'accounts', label: 'Accounts', icon: Users, color: '#D97706', bg: '#FFFBEB' },
  { id: 'syndicates', label: 'Syndicates', icon: Share2, color: '#DC2626', bg: '#FEF2F2' },
  { id: 'dataset', label: 'Dataset', icon: Database, color: '#0891B2', bg: '#ECFEFF' },
  { id: 'legal', label: 'Reports', icon: FileText, color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'settings', label: 'Settings', icon: Settings, color: '#475569', bg: '#F1F5F9' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  onToggleCollapse: _onToggleCollapse
}) => {
  return (
    <aside className="no-print" style={{
      width: isCollapsed ? '76px' : '240px',
      minWidth: isCollapsed ? '76px' : '240px',
      backgroundColor: 'var(--sidebar-bg, #F4EDE4)',
      borderRight: '2px solid var(--sidebar-border, #D5C7B5)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: isCollapsed ? '20px 8px' : '20px 14px',
      flexShrink: 0,
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '1px 0 3px rgba(60, 45, 30, 0.03)',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease'
    }}>
      {/* Subtle atmospheric texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/sidebar_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        opacity: 0.035,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Soft warm almond gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(244,237,228,0.96) 0%, rgba(244,237,228,0.92) 50%, rgba(244,237,228,0.98) 100%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Content wrapper */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Top Brand Header with Hindi Name वज्र */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          paddingBottom: '16px',
          borderBottom: '2px solid #D5C7B5'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {/* Logo Emblem */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #D5C7B5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(60, 45, 30, 0.06)'
            }}>
              <img
                src="/vajra_logo.png"
                alt="Emblem"
                style={{
                  width: '30px',
                  height: '30px',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Brand Title: Simply वज्र in Hindi */}
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span className="brand-devanagari" style={{
                  fontFamily: "'Alkatra', 'Modak', cursive, sans-serif",
                  fontSize: '1.75rem',
                  color: '#2563EB',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  fontWeight: 700
                }}>
                  वज्र
                </span>
                <span style={{
                  fontSize: '0.6875rem',
                  color: '#786A5C',
                  fontWeight: 500,
                  marginTop: '3px'
                }}>
                  Indore Cyber Police
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items with Colorful Icons */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '10px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '8px 0' : '8px 10px',
                  borderRadius: '9px',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#54473A',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  border: isActive ? '1px solid #E2D7C8' : '1px solid transparent',
                  width: '100%',
                  boxShadow: isActive ? '0 1px 3px rgba(60, 45, 30, 0.05)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#EAE1D5';
                    e.currentTarget.style.color = '#1E293B';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#54473A';
                  }
                }}
              >
                {/* Colorful Icon Badge */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  backgroundColor: isActive ? item.color : item.bg,
                  color: isActive ? '#FFFFFF' : item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}>
                  <Icon size={16} strokeWidth={isActive ? 2.3 : 1.9} />
                </div>

                {!isCollapsed && (
                  <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: isCollapsed ? '10px 6px' : '10px 12px',
        backgroundColor: '#FFFFFF',
        borderRadius: '9px',
        border: '1px solid #E2D7C8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '7px',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldCheck size={16} color="#059669" />
        </div>
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1E293B' }}>
              Air-Gapped Mode
            </span>
            <span style={{ fontSize: '0.625rem', color: '#786A5C' }}>
              100% Offline Forensics
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
