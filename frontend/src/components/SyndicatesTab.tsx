import React, { useState } from 'react';
import { Search, Info, ChevronRight } from 'lucide-react';
import type { OverviewData } from '../types';

interface SyndicatesTabProps {
  data: OverviewData | null;
  onSelectVictim: (victim: string) => void;
}

interface ClusterCard {
  id: string;
  name: string;
  accountsCount: number;
  confidence: number;
  tier: 'Critical' | 'High' | 'Medium';
  layers: { l1: number; l2: number; l3: number };
  victims: number;
  volume: string;
  coverage: string;
  sharedSignals: string;
  seedVictim: string;
}

export const SyndicatesTab: React.FC<SyndicatesTabProps> = ({ data, onSelectVictim }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'traced' | 'size' | 'coverage'>('traced');

  const sampleVictims = data?.sample_victims || ['AIRP10000024', 'SBIN10005001', 'PUNB10000052'];

  const clusters: ClusterCard[] = [
    {
      id: 'cluster-a17',
      name: 'Cluster A-17 (Multi-Hop Layering Ring)',
      accountsCount: 18,
      confidence: 94,
      tier: 'Critical',
      layers: { l1: 6, l2: 8, l3: 4 },
      victims: 4,
      volume: '₹1,84,20,000',
      coverage: '94%',
      sharedSignals: 'Same beneficiary • 11 min rapid pass-through burst',
      seedVictim: sampleVictims[0] || 'AIRP10000024'
    },
    {
      id: 'cluster-b04',
      name: 'Cluster B-04 (Fan-Out Mule Syndicate)',
      accountsCount: 14,
      confidence: 88,
      tier: 'High',
      layers: { l1: 4, l2: 6, l3: 4 },
      victims: 2,
      volume: '₹98,50,000',
      coverage: '89%',
      sharedSignals: 'Common mobile app device ID • IP foreign hop',
      seedVictim: sampleVictims[1] || 'SBIN10005001'
    },
    {
      id: 'cluster-c09',
      name: 'Cluster C-09 (High-Frequency Funnel Ring)',
      accountsCount: 22,
      confidence: 96,
      tier: 'Critical',
      layers: { l1: 8, l2: 10, l3: 4 },
      victims: 6,
      volume: '₹3,42,00,000',
      coverage: '97%',
      sharedSignals: 'Sub-5-minute transfers • Terminal ATM cash withdrawals',
      seedVictim: sampleVictims[2] || 'PUNB10000052'
    },
    {
      id: 'cluster-d02',
      name: 'Cluster D-02 (Inter-Bank Smurfing Pool)',
      accountsCount: 9,
      confidence: 78,
      tier: 'Medium',
      layers: { l1: 3, l2: 4, l3: 2 },
      victims: 2,
      volume: '₹46,10,000',
      coverage: '81%',
      sharedSignals: 'Split amounts under ₹50,000 reporting threshold',
      seedVictim: sampleVictims[0] || 'AIRP10000024'
    },
    {
      id: 'cluster-e11',
      name: 'Cluster E-11 (Merchant Gateway Shells)',
      accountsCount: 11,
      confidence: 83,
      tier: 'High',
      layers: { l1: 3, l2: 5, l3: 3 },
      victims: 3,
      volume: '₹72,80,000',
      coverage: '85%',
      sharedSignals: 'Fictitious corporate IFSC patterns • Rapid drain',
      seedVictim: sampleVictims[1] || 'SBIN10005001'
    },
    {
      id: 'cluster-f03',
      name: 'Cluster F-03 (Cyclic Wash Laundering Loop)',
      accountsCount: 16,
      confidence: 91,
      tier: 'Critical',
      layers: { l1: 5, l2: 7, l3: 4 },
      victims: 5,
      volume: '₹2,15,40,000',
      coverage: '92%',
      sharedSignals: 'Cyclic round-trip transactions • Layer 2 loop topology',
      seedVictim: sampleVictims[2] || 'PUNB10000052'
    }
  ];

  const filteredClusters = clusters.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.sharedSignals.toLowerCase().includes(q);
  });

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'var(--font-sans)',
      color: '#334155'
    }}>
      {/* Title & Info Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#0F172A',
            margin: 0
          }}>
            Fraud Syndicates
          </h1>
          <p style={{
            fontSize: '0.875rem',
            lineHeight: 1.4,
            color: '#64748B',
            margin: 0
          }}>
            Clusters grouped by shared transaction signals & coordinated money laundering patterns
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8125rem',
          color: '#64748B',
          backgroundColor: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
        }}>
          <Info size={16} color="#3B82F6" />
          <span>Confidence calibrated across multi-layer graph topology & velocity clusters</span>
        </div>
      </div>

      {/* Filter and Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', width: '420px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search cluster or shared signal..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              fontSize: '0.875rem',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
            }}
          />
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#334155',
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
          }}
        >
          <option value="traced">Sort by traced volume</option>
          <option value="size">Sort by cluster size</option>
          <option value="coverage">Sort by recovery coverage</option>
        </select>

        <div style={{
          padding: '8px 14px',
          borderRadius: '8px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #DBEAFE',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#1D4ED8'
        }}>
          Showing {filteredClusters.length} identified syndicates
        </div>
      </div>

      {/* Syndicates 3-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {filteredClusters.map(cluster => {
          const isCrit = cluster.tier === 'Critical';
          const isHigh = cluster.tier === 'High';
          return (
            <div
              key={cluster.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
                    {cluster.name}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
                    {cluster.accountsCount} mule accounts identified
                  </p>
                </div>

                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFFBEB' : '#ECFDF5',
                  color: isCrit ? '#DC2626' : isHigh ? '#D97706' : '#059669',
                  border: `1px solid ${isCrit ? '#FEE2E2' : isHigh ? '#FEF3C7' : '#D1FAE5'}`
                }}>
                  {cluster.tier} • {cluster.confidence}% conf
                </span>
              </div>

              {/* Layer Badges */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Layer 1: {cluster.layers.l1}
                </span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Layer 2: {cluster.layers.l2}
                </span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Layer 3: {cluster.layers.l3}
                </span>
              </div>

              {/* Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Victims</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                    {cluster.victims}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Volume</p>
                  <p style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '2px 0 0 0'
                  }}>
                    {cluster.volume}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Coverage</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#16A34A', margin: '2px 0 0 0' }}>
                    {cluster.coverage}
                  </p>
                </div>
              </div>

              {/* Shared Signals */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, fontWeight: 500 }}>Shared signals</p>
                <p style={{ fontSize: '0.8125rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  {cluster.sharedSignals}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => onSelectVictim(cluster.seedVictim)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
              >
                <span>Open in Investigate</span>
                <ChevronRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
