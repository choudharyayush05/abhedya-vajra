import React, { useState, useEffect } from 'react';
import { Search, Play, Pause, Download, ArrowRight, Zap } from 'lucide-react';
import type { TraceResponse, NodeData, EdgeData } from '../types';
import { GraphCanvas } from './GraphCanvas';

interface InvestigateTabProps {
  initialVictim: string;
  onNavigateToLegal: (victim: string) => void;
  onDatasetChange?: () => void;
}

export const InvestigateTab: React.FC<InvestigateTabProps> = ({ initialVictim, onNavigateToLegal, onDatasetChange: _onDatasetChange }) => {
  const [victimInput, setVictimInput] = useState(initialVictim || 'AIRP10000024');
  const [traceData, setTraceData] = useState<TraceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Node
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Architectural Graph Controls
  const [clustersCollapsed, setClustersCollapsed] = useState<boolean>(false);
  const [activeMotif, setActiveMotif] = useState<'all' | 'fan-out' | 'fan-in' | 'long-chain'>('all');
  const [layoutMode] = useState<'flow' | 'force'>('flow');
  const [isolatedPathNodeIds, setIsolatedPathNodeIds] = useState<Set<string> | null>(null);

  // Temporal Playback Slider State
  const [minTs, setMinTs] = useState<number>(0);
  const [maxTs, setMaxTs] = useState<number>(0);
  const [currentTs, setCurrentTs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed] = useState<number>(1);
  const [timeMode] = useState<'cumulative' | 'slice'>('cumulative');
  const [maxHops, setMaxHops] = useState<number>(4);
  const [maxWaitHours, setMaxWaitHours] = useState<number>(72);

  const fetchTrace = async (acct: string, hops = maxHops, waitHours = maxWaitHours) => {
    if (!acct.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setIsPlaying(false);
    setIsolatedPathNodeIds(null);

    try {
      const resp = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ victim_account: acct.trim(), max_hops: hops, max_wait_hours: waitHours })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Failed to trace victim account');
      }

      const data: TraceResponse = await resp.json();
      setTraceData(data);

      if (data.num_nodes > 120) {
        setClustersCollapsed(true);
      } else {
        setClustersCollapsed(false);
      }

      if (data.edges.length > 0) {
        const timestamps = data.edges.map(e => e.ts_epoch);
        const earliest = Math.min(...timestamps);
        const latest = Math.max(...timestamps);
        setMinTs(earliest);
        setMaxTs(latest);
        setCurrentTs(latest);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialVictim) {
      setVictimInput(initialVictim);
      fetchTrace(initialVictim);
    }
  }, [initialVictim]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTs((prev: number) => {
        const step = Math.max(60, Math.floor((maxTs - minTs) / 100)) * playbackSpeed;
        if (prev + step >= maxTs) {
          setIsPlaying(false);
          return maxTs;
        }
        return prev + step;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, maxTs, minTs, playbackSpeed]);

  const handleExportCSV = () => {
    if (!traceData) return;
    const headers = ['Txn_ID,Src_Account,Dst_Account,Amount_INR,Taint_INR,Hop,Narration,Payment_Mode\n'];
    const rows = traceData.edges.map((e: EdgeData) =>
      `"${e.txn_id}","${e.src_acct}","${e.dst_acct}",${e.amount_paise / 100},${e.taint_paise / 100},${e.hop},"${e.narration}","${e.payment_mode}"`
    );
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money_trail_${traceData.victim_account}.csv`;
    a.click();
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Sleek Top Investigation Control Strip (Single 48px Header) */}
      <div style={{
        height: '48px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexShrink: 0,
        zIndex: 20
      }}>
        {/* Left: Search, Trace Trigger, and Hops Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            width: '180px'
          }}>
            <Search size={13} color="#64748B" />
            <input
              type="text"
              value={victimInput}
              onChange={e => setVictimInput(e.target.value)}
              placeholder="Victim Account..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#0F172A'
              }}
              onKeyDown={e => e.key === 'Enter' && fetchTrace(victimInput)}
            />
          </div>

          <button
            onClick={() => fetchTrace(victimInput)}
            disabled={loading}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={13} color="#FFFFFF" />
            <span>{loading ? 'Tracing...' : 'Trace'}</span>
          </button>

          <select
            value={maxHops}
            onChange={e => {
              const h = Number(e.target.value);
              setMaxHops(h);
              if (victimInput) fetchTrace(victimInput, h, maxWaitHours);
            }}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer'
            }}
          >
            <option value={2}>2 Hops</option>
            <option value={3}>3 Hops</option>
            <option value={4}>4 Hops</option>
            <option value={5}>5 Hops</option>
          </select>

          <select
            value={maxWaitHours}
            onChange={e => {
              const w = Number(e.target.value);
              setMaxWaitHours(w);
              if (victimInput) fetchTrace(victimInput, maxHops, w);
            }}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer'
            }}
          >
            <option value={24}>24 Hours</option>
            <option value={48}>48 Hours</option>
            <option value={72}>72 Hours</option>
            <option value={168}>7 Days</option>
          </select>
        </div>

        {/* Center: Live Forensic Telemetry Summary */}
        {traceData && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.75rem',
            padding: '3px 12px',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}>
            <span>
              💰 Recoverable: <strong style={{ color: '#16A34A' }}>₹{traceData.total_held_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong> ({traceData.recovery_potential_pct}%)
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span>
              Dispersed: <strong style={{ color: '#DC2626' }}>₹{traceData.initial_loss_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span>
              Speed: <strong style={{ color: '#2563EB' }}>{traceData.timing_ms} ms</strong> ({traceData.num_nodes} Accounts)
            </span>
          </div>
        )}

        {/* Right: Fraud Motifs Filter + CSV Export + Draft Notices */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Motifs selector */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'fan-out', label: 'Smurf' },
              { id: 'fan-in', label: 'Funnel' },
              { id: 'long-chain', label: 'Chains' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMotif(m.id as any)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: activeMotif === m.id ? 700 : 500,
                  backgroundColor: activeMotif === m.id ? '#FFFFFF' : 'transparent',
                  color: activeMotif === m.id ? '#2563EB' : '#64748B',
                  boxShadow: activeMotif === m.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            title="Export Money Trail CSV"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>CSV</span>
          </button>

          {traceData && (
            <button
              onClick={() => onNavigateToLegal(traceData.victim_account)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15,23,42,0.2)'
              }}
            >
              <span>Draft Notices</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#FEF2F2',
          borderBottom: '1px solid #FEE2E2',
          color: '#DC2626',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Main Graph Canvas Area: Full Screen Minus Navbar */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {traceData ? (
          <GraphCanvas
            nodes={traceData.nodes}
            edges={traceData.edges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            maxTimestamp={currentTs}
            minTimestamp={minTs}
            timeMode={timeMode}
            activeMotif={activeMotif}
            clustersCollapsed={clustersCollapsed}
            onToggleClustering={() => setClustersCollapsed(!clustersCollapsed)}
            isolatedPathNodeIds={isolatedPathNodeIds}
            layoutMode={layoutMode}
            onNavigateToLegal={onNavigateToLegal}
          />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748B',
            fontSize: '0.875rem'
          }}>
            {loading ? 'Analyzing transactions and mapping money trail...' : 'Enter victim account to trace trail'}
          </div>
        )}

        {/* Minimal Floating Temporal Playback Bar at Bottom */}
        {traceData && traceData.edges.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(8px)',
            zIndex: 15
          }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
            </button>
            <input
              type="range"
              min={minTs}
              max={maxTs}
              value={currentTs}
              onChange={e => setCurrentTs(Number(e.target.value))}
              style={{ width: '160px', accentColor: '#2563EB', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
              {new Date(currentTs * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigateTab;
