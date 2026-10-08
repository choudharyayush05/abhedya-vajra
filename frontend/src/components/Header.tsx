import React from 'react';
import {
  Database,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import type { SystemStats, DatasetPreset } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  telemetry: SystemStats | null;
  datasetName?: string;
  totalTransactions?: number;
  totalAccounts?: number;
  onDatasetReload?: () => void;
  onSelectPreset?: (preset: DatasetPreset) => void;
  onSelectAccount?: (acct: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  utilityText?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab: _activeTab,
  setActiveTab,
  telemetry: _telemetry,
  datasetName = 'VoidHacks8_MuleAccount_2M_Transactions.csv',
  totalTransactions = 2000000,
  totalAccounts = 24873,
  onDatasetReload: _onDatasetReload,
  onSelectPreset: _onSelectPreset,
  onSelectAccount: _onSelectAccount,
  isSidebarCollapsed = false,
  onToggleSidebar,
  utilityText
}) => {
  return (
    <header className="no-print" style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '2px solid var(--sidebar-border, #D5C7B5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: '64px',
      flexShrink: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
      gap: '18px'
    }}>
      {/* Left: Creative Modern Hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`hamburger-btn ${isSidebarCollapsed ? 'collapsed' : ''}`}
            title={isSidebarCollapsed ? "Expand Navigation Dock" : "Collapse Navigation Dock"}
            aria-label="Toggle navigation"
            style={{ border: '2px solid #D5C7B5' }}
          >
            <span className="hamburger-line hamburger-line-1" />
            <span className="hamburger-line hamburger-line-2" />
            <span className="hamburger-line hamburger-line-3" />
          </button>
        )}
      </div>

      {/* Center: Active File & Dataset Details (Replaced the Search Bar) */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minWidth: 0
      }}>
        <div
          onClick={() => setActiveTab('load')}
          title="Click to view loaded dataset in Load Data tab"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 16px',
            borderRadius: '10px',
            backgroundColor: '#FAF7F2',
            border: '2px solid #D5C7B5',
            boxShadow: '0 1px 2px rgba(60, 45, 30, 0.03)',
            cursor: 'pointer',
            transition: 'background-color 0.15s, border-color 0.15s',
            maxWidth: '780px',
            width: '100%',
            justifyContent: 'space-between',
            boxSizing: 'border-box'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#F4EDE4';
            e.currentTarget.style.borderColor = '#B8A896';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#FAF7F2';
            e.currentTarget.style.borderColor = '#D5C7B5';
          }}
        >
          {/* Active File Name & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Database size={16} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Case File
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9.5px',
                  fontWeight: 600,
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  <ShieldCheck size={10} color="#059669" />
                  <span>Offline Protection</span>
                </span>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0F172A',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {datasetName}
              </span>
            </div>
          </div>

          {/* Records & Accounts Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
              <span style={{ fontSize: '10px', color: '#64748B' }}>Transactions</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
                {totalTransactions.toLocaleString()}
              </span>
            </div>

            <div style={{ width: '1px', height: '22px', backgroundColor: '#D5C7B5' }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
              <span style={{ fontSize: '10px', color: '#64748B' }}>Accounts</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {totalAccounts.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Engine Utility Text & Guest Account Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {utilityText && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '8px',
            backgroundColor: '#FAF7F2',
            border: '1.5px solid #D5C7B5',
            color: '#1E293B',
            fontSize: '0.78rem',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            {utilityText}
          </div>
        )}

        {/* Guest User Profile Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: '8px',
          borderLeft: '1.5px solid #E2E8F0'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.8125rem',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}>
            G
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Guest
              <UserCheck size={11} color="#059669" />
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748B' }}>
              Viewer Mode
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
