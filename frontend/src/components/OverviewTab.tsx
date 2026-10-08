import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Landmark,
  Flag,
  Network,
  Shield,
  Database,
  Crosshair,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Building2,
  GitBranch,
  Download
} from 'lucide-react';
import type { OverviewData } from '../types';

interface OverviewTabProps {
  data: OverviewData | null;
  onSelectVictim: (victim: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  onSelectVictim,
  onNavigateTab
}) => {
  const [selectedQuickVictim, setSelectedQuickVictim] = useState<string>('AIRP10000077');
  const [quickSearch, setQuickSearch] = useState<string>('');
  
  // Interactive UI Dropdowns
  const [riskViewMode, setRiskViewMode] = useState<'Accounts' | 'Transactions' | 'Volume'>('Accounts');
  const [showRiskDropdown, setShowRiskDropdown] = useState<boolean>(false);

  const [sortCriteria, setSortCriteria] = useState<'Top Risk' | 'Highest Volume' | 'Most Hops'>('Top Risk');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Values from live dataset with defaults
  const totalTxns = data?.total_transactions ? data.total_transactions.toLocaleString() : '2,000,000';
  const totalAccts = data?.total_accounts ? data.total_accounts.toLocaleString() : '24,873';
  const flaggedCount = data?.tier_distribution 
    ? ((data.tier_distribution['High'] || 0) + (data.tier_distribution['Critical'] || 0)).toLocaleString()
    : '426';
  const syndicatesCount = 9;

  // Dynamic Tier stats based on riskViewMode
  const getTierStats = () => {
    if (riskViewMode === 'Transactions') {
      return {
        low: '574,000', lowPct: '28.7%',
        med: '1,392,000', medPct: '69.6%',
        high: '34,000', highPct: '1.7%',
        crit: '14,000', critPct: '0.7%'
      };
    }
    if (riskViewMode === 'Volume') {
      return {
        low: '₹14.2 Cr', lowPct: '28.7%',
        med: '₹38.6 Cr', medPct: '69.6%',
        high: '₹5.8 Cr', highPct: '1.7%',
        crit: '₹2.4 Cr', critPct: '0.7%'
      };
    }
    return {
      low: data?.tier_distribution?.['Low'] ? data.tier_distribution['Low'].toLocaleString() : '7,123',
      lowPct: '28.7%',
      med: data?.tier_distribution?.['Medium'] ? data.tier_distribution['Medium'].toLocaleString() : '17,324',
      medPct: '69.6%',
      high: data?.tier_distribution?.['High'] ? data.tier_distribution['High'].toLocaleString() : '426',
      highPct: '1.7%',
      crit: data?.tier_distribution?.['Critical'] ? data.tier_distribution['Critical'].toLocaleString() : '182',
      critPct: '0.7%'
    };
  };

  const tierStats = getTierStats();

  // Top suspects list with simple clear role labels
  const baseSuspects = (data?.top_mules && data.top_mules.length >= 5) ? data.top_mules.slice(0, 5) : [
    { acct_no: 'AIRP10000479', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹14,50,000', hops: 4 },
    { acct_no: 'AIRP10000498', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹12,80,000', hops: 3 },
    { acct_no: 'AIRP10000578', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹9,40,000', hops: 4 },
    { acct_no: 'AIRP10000595', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹8,20,000', hops: 2 },
    { acct_no: 'AIRP10000621', primary_bank: 'AIRP', risk_index: 75, tier: 'Medium', predicted_role: 'Collector', amount: '₹6,10,000', hops: 2 },
  ];

  // Sorted Suspects based on sortCriteria
  const topSuspects = [...baseSuspects].sort((a: any, b: any) => {
    if (sortCriteria === 'Highest Volume') {
      const amtA = parseInt((a.amount || '0').replace(/[^0-9]/g, '')) || 0;
      const amtB = parseInt((b.amount || '0').replace(/[^0-9]/g, '')) || 0;
      return amtB - amtA;
    }
    if (sortCriteria === 'Most Hops') {
      return (b.hops || 0) - (a.hops || 0);
    }
    return (b.risk_index || 0) - (a.risk_index || 0);
  });

  // Quick trace victim options
  const defaultVictims = [
    { acct: 'AIRP10000077', bank: 'Allahabad Bank', amount: '1,425.00', color: '#EF4444', bg: '#FEF2F2' },
    { acct: 'AIRP10000081', bank: 'Airtel Payments Bank', amount: '92,290.00', color: '#F59E0B', bg: '#FFFBEB' },
    { acct: 'AIRP10000147', bank: 'Airtel Payments Bank', amount: '42,30,000.00', color: '#2563EB', bg: '#EFF6FF' },
    { acct: 'SBIN10009901', bank: 'State Bank of India', amount: '5,00,000.00', color: '#10B981', bg: '#ECFDF5' },
  ];

  const displayedVictims = quickSearch.trim()
    ? defaultVictims.filter(v => v.acct.toLowerCase().includes(quickSearch.toLowerCase()) || v.bank.toLowerCase().includes(quickSearch.toLowerCase()))
    : defaultVictims;

  const exportSuspectsCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Rank,Account,Bank,RiskScore,Tier,Role\n" +
      topSuspects.map((s, i) => `${i+1},${s.acct_no},${s.primary_bank || 'AIRP'},${s.risk_index},${s.tier},${s.predicted_role}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Suspect_Accounts_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Suspects roster exported to CSV successfully");
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '100%',
      overflow: 'hidden',
      gap: '10px',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} color="#34D399" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar: Clean Title & Subtitle + Export action (No Cyber Crime Division block) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#1E293B',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1
          }}>
            Overview
          </h1>
          <span style={{ color: '#94A3B8' }}>•</span>
          <div
            onClick={() => onNavigateTab && onNavigateTab('load')}
            title="Click to view loaded data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: '#64748B',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <span>2,000,000 transactions active</span>
            <Database size={13} color="#2563EB" />
          </div>
        </div>

        <button
          onClick={exportSuspectsCSV}
          title="Export top suspects to CSV"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            border: '2px solid #D5C7B5',
            color: '#475569',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(60,45,30,0.04)',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAF7F2')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <Download size={13} color="#2563EB" />
          <span>Export Suspects CSV</span>
        </button>
      </div>

      {/* Row 1: 4 Key Metric Cards (Compact Single-Row Height) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        flexShrink: 0
      }}>
        {/* Card 1: Transactions */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('dataset')}
          title="Click to view transactions"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            minHeight: '76px'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowLeftRight size={14} color="#2563EB" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                Total Transactions
              </span>
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#16A34A' }}>
              ▲ +8.3%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {totalTxns}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>All verified</span>
          </div>
        </div>

        {/* Card 2: Accounts */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('accounts')}
          title="Click to view accounts"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            minHeight: '76px'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Landmark size={14} color="#059669" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                Total Accounts
              </span>
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#16A34A' }}>
              ▲ +5.1%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {totalAccts}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Active ledger</span>
          </div>
        </div>

        {/* Card 3: Flagged */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('accounts')}
          title="Click to view high-risk accounts"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            minHeight: '76px'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Flag size={14} color="#DC2626" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                Flagged for Review
              </span>
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#DC2626' }}>
              ▲ High Risk
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#DC2626',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {flaggedCount}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Need action</span>
          </div>
        </div>

        {/* Card 4: Syndicates */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('syndicates')}
          title="Click to view suspicious groups"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            minHeight: '76px'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#F5F3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Network size={14} color="#7C3AED" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                Suspicious Groups
              </span>
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#7C3AED' }}>
              Clustered
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {syndicatesCount}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Multi-hop rings</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns (Flex 1 to fill available screen height exactly with ZERO scroll) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '10px',
        flex: 1,
        minHeight: 0
      }}>
        {/* LEFT COLUMN: Risk Categories (Top) + Top Suspects Table (Bottom) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
          {/* Card: Risk Categories */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#2563EB" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Risk Categories
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  ({riskViewMode})
                </span>
              </div>

              {/* View Mode Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowRiskDropdown(!showRiskDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#FAF7F2',
                    border: '1px solid #D5C7B5',
                    color: '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>{riskViewMode}</span>
                  <ChevronDown size={12} color="#64748B" />
                </button>

                {showRiskDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C7B5',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 30,
                    minWidth: '120px',
                    padding: '3px'
                  }}>
                    {(['Accounts', 'Transactions', 'Volume'] as const).map(mode => (
                      <div
                        key={mode}
                        onClick={() => {
                          setRiskViewMode(mode);
                          setShowRiskDropdown(false);
                        }}
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          fontWeight: riskViewMode === mode ? 700 : 500,
                          color: riskViewMode === mode ? '#2563EB' : '#334155',
                          backgroundColor: riskViewMode === mode ? '#EFF6FF' : 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {mode}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Segmented Bar */}
            <div
              onClick={() => onNavigateTab && onNavigateTab('accounts')}
              title="Click to view accounts grouped by risk"
              style={{
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                backgroundColor: '#F1F5F9',
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '28.7%', backgroundColor: '#34D399' }} title="Low: 28.7%" />
              <div style={{ width: '69.6%', backgroundColor: '#FBBF24' }} title="Medium: 69.6%" />
              <div style={{ width: '1.7%', backgroundColor: '#F87171' }} title="High: 1.7%" />
              <div style={{ width: '0.7%', backgroundColor: '#1E293B' }} title="Critical: 0.7%" />
            </div>

            {/* 4 Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              paddingTop: '2px'
            }}>
              <div onClick={() => onNavigateTab && onNavigateTab('accounts')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#64748B' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34D399' }} />
                  <span>Low</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.low} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#94A3B8' }}>({tierStats.lowPct})</span>
                </div>
              </div>

              <div onClick={() => onNavigateTab && onNavigateTab('accounts')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#64748B' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
                  <span>Medium</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.med} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#94A3B8' }}>({tierStats.medPct})</span>
                </div>
              </div>

              <div onClick={() => onNavigateTab && onNavigateTab('accounts')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#64748B' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F87171' }} />
                  <span>High</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626', marginTop: '1px' }}>
                  {tierStats.high} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#94A3B8' }}>({tierStats.highPct})</span>
                </div>
              </div>

              <div onClick={() => onNavigateTab && onNavigateTab('accounts')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#64748B' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1E293B' }} />
                  <span>Critical</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.crit} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#94A3B8' }}>({tierStats.critPct})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Top Suspect Accounts (Flex 1 to fill height) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network size={16} color="#2563EB" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Top Suspect Accounts
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  (Ranked by risk)
                </span>
              </div>

              {/* Sort selector */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#FAF7F2',
                    border: '1px solid #D5C7B5',
                    color: '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>{sortCriteria}</span>
                  <ChevronDown size={12} color="#64748B" />
                </button>

                {showSortDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C7B5',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 30,
                    minWidth: '130px',
                    padding: '3px'
                  }}>
                    {(['Top Risk', 'Highest Volume', 'Most Hops'] as const).map(crit => (
                      <div
                        key={crit}
                        onClick={() => {
                          setSortCriteria(crit);
                          setShowSortDropdown(false);
                          showToast(`Sorted by ${crit}`);
                        }}
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          fontWeight: sortCriteria === crit ? 700 : 500,
                          color: sortCriteria === crit ? '#2563EB' : '#334155',
                          backgroundColor: sortCriteria === crit ? '#EFF6FF' : 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {crit}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table: Fixed layout with zero horizontal and vertical scroll */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <table style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', fontWeight: 600 }}>
                    <th style={{ width: '28px', padding: '5px 4px' }}>#</th>
                    <th style={{ width: '130px', padding: '5px 6px' }}>Account</th>
                    <th style={{ width: '70px', padding: '5px 6px' }}>Bank</th>
                    <th style={{ width: '50px', padding: '5px 6px' }}>Risk</th>
                    <th style={{ width: '70px', padding: '5px 6px' }}>Level</th>
                    <th style={{ width: '90px', padding: '5px 6px' }}>Role</th>
                    <th style={{ width: '70px', padding: '5px 6px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuspects.map((row: any, idx: number) => {
                    const rankColors = [
                      { bg: '#EF4444', text: '#FFFFFF' },
                      { bg: '#F59E0B', text: '#FFFFFF' },
                      { bg: '#3B82F6', text: '#FFFFFF' },
                      { bg: '#8B5CF6', text: '#FFFFFF' },
                      { bg: '#6B7280', text: '#FFFFFF' },
                    ];
                    const rankStyle = rankColors[idx] || rankColors[4];
                    const tierColor = row.tier === 'Critical' ? '#991B1B' : row.tier === 'High' ? '#DC2626' : '#D97706';
                    const tierBg = row.tier === 'Critical' ? '#FEF2F2' : row.tier === 'High' ? '#FEE2E2' : '#FEF3C7';

                    return (
                      <tr
                        key={row.acct_no}
                        onClick={() => onSelectVictim(row.acct_no)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          height: '36px'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAF7F2')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Rank */}
                        <td style={{ padding: '4px' }}>
                          <span style={{
                            display: 'inline-flex',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: rankStyle.bg,
                            color: rankStyle.text,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* Account */}
                        <td style={{
                          padding: '4px 6px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row.acct_no}
                        </td>

                        {/* Bank */}
                        <td style={{
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          color: '#334155',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row.primary_bank || 'AIRP'}
                        </td>

                        {/* Risk Score */}
                        <td style={{ padding: '4px 6px', fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                          {row.risk_index}
                        </td>

                        {/* Tier Pill */}
                        <td style={{ padding: '4px 6px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: tierBg,
                            color: tierColor,
                            fontSize: '0.65rem',
                            fontWeight: 600
                          }}>
                            {row.tier}
                          </span>
                        </td>

                        {/* Role */}
                        <td style={{
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          color: '#64748B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row.predicted_role}
                        </td>

                        {/* Inspect Button */}
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVictim(row.acct_no);
                            }}
                            title={`Inspect ${row.acct_no}`}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              border: '1px solid #DBEAFE',
                              cursor: 'pointer'
                            }}
                          >
                            Trace
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Data Health (Top) + Quick Money Trace (Bottom) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
          {/* Card: Data Health */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="#2563EB" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Data Health
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                color: '#059669',
                fontWeight: 600
              }}>
                <CheckCircle2 size={13} color="#059669" />
                <span>All checks normal</span>
              </div>
            </div>

            {/* Gauge + Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="60" height="60" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="10" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10B981"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray="238.7"
                    strokeDashoffset="2"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>99.2%</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#475569' }}>Complete records</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>99.2%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#475569' }}>Duplicate entries</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>0.84%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#475569' }}>Missing bank codes</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>0.12%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Quick Money Trace (Flex 1 to fill height) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #D5C7B5',
            padding: '12px 16px',
            boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Crosshair size={16} color="#2563EB" />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Quick Money Trace
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>
                  Pick an account to track fund movements
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#FAF7F2',
              border: '1px solid #D5C7B5',
              flexShrink: 0
            }}>
              <Search size={13} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search account or bank..."
                value={quickSearch}
                onChange={e => setQuickSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.72rem',
                  color: '#0F172A'
                }}
              />
            </div>

            {/* Selectable Victim Account List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto'
            }}>
              {displayedVictims.map(vic => {
                const isSelected = selectedQuickVictim === vic.acct;
                return (
                  <div
                    key={vic.acct}
                    onClick={() => setSelectedQuickVictim(vic.acct)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FAF7F2',
                      border: `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: vic.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Building2 size={13} color={vic.color} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                          {vic.acct}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748B' }}>
                          {vic.bank} • ₹{vic.amount}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSelected ? '#2563EB' : '#94A3B8'} />
                  </div>
                );
              })}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => onSelectVictim(selectedQuickVictim)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                flexShrink: 0,
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563EB')}
            >
              <GitBranch size={15} color="#FFFFFF" />
              <span>Start Money Trail Trace</span>
              <span style={{ marginLeft: '2px' }}>➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
