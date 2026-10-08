import React, { useState } from 'react';
import { Save, RefreshCw, CheckCircle2, Sliders, Shield, Cpu } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const [flaggedThreshold, setFlaggedThreshold] = useState(70);
  const [highThreshold, setHighThreshold] = useState(75);
  const [criticalThreshold, setCriticalThreshold] = useState(90);
  const [rapidThreshold, setRapidThreshold] = useState(800000);

  const [rapidWeight, setRapidWeight] = useState(24);
  const [sharedWeight, setSharedWeight] = useState(18);
  const [burstWeight, setBurstWeight] = useState(16);
  const [loopWeight, setLoopWeight] = useState(22);

  const [airGappedMode, setAirGappedMode] = useState(true);
  const [cpuThreads, setCpuThreads] = useState(8);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleReset = () => {
    setFlaggedThreshold(70);
    setHighThreshold(75);
    setCriticalThreshold(90);
    setRapidThreshold(800000);
    setRapidWeight(24);
    setSharedWeight(18);
    setBurstWeight(16);
    setLoopWeight(22);
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      color: '#0F172A'
    }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#0F172A',
            margin: 0
          }}>
            Investigation Settings
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#64748B',
            margin: 0
          }}>
            Configure local forensic detection parameters, threshold sensitivities, and air-gapped runtime specs
          </p>
        </div>

        {savedNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '6px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#047857',
            fontSize: '0.8125rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Card 1: Risk Thresholds */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#2563EB" />
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#0F172A',
            margin: 0
          }}>
            Risk Score Thresholds
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
              Flagged Review Threshold (Score)
            </label>
            <input
              type="number"
              value={flaggedThreshold}
              onChange={e => setFlaggedThreshold(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
              High Tier Threshold (Score)
            </label>
            <input
              type="number"
              value={highThreshold}
              onChange={e => setHighThreshold(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
              Critical Tier Threshold (Score)
            </label>
            <input
              type="number"
              value={criticalThreshold}
              onChange={e => setCriticalThreshold(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
            Rapid Pass-Through Velocity Trigger Threshold (₹ INR)
          </label>
          <input
            type="number"
            value={rapidThreshold}
            onChange={e => setRapidThreshold(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Card 2: Scoring Weights */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#2563EB" />
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#0F172A',
            margin: 0
          }}>
            ML Anomaly & Hybrid Graph Feature Weights
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Rapid pass-through velocity</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Time between incoming credits and outgoing debits</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="50"
                value={rapidWeight}
                onChange={e => setRapidWeight(Number(e.target.value))}
                style={{ width: '160px', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A', width: '36px', textAlign: 'right' }}>
                {rapidWeight}%
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Shared beneficiary syndication</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Co-occurrence in common recipient nodes across hops</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="50"
                value={sharedWeight}
                onChange={e => setSharedWeight(Number(e.target.value))}
                style={{ width: '160px', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A', width: '36px', textAlign: 'right' }}>
                {sharedWeight}%
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Burst timing dispersion</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Clustered transactions occurring inside tight temporal windows</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="50"
                value={burstWeight}
                onChange={e => setBurstWeight(Number(e.target.value))}
                style={{ width: '160px', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A', width: '36px', textAlign: 'right' }}>
                {burstWeight}%
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Cyclic loop & smurfing topology</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Graph motifs showing round-trip laundering loops</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="50"
                value={loopWeight}
                onChange={e => setLoopWeight(Number(e.target.value))}
                style={{ width: '160px', accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A', width: '36px', textAlign: 'right' }}>
                {loopWeight}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Offline Air-Gap & Hardware Runtime */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="#2563EB" />
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#0F172A',
            margin: 0
          }}>
            Offline Air-Gap & Hardware Optimization
          </h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Enforce 100% Offline Air-Gap Mode</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Blocks all external HTTP outbound network requests; strictly local in-memory RAM inference</p>
          </div>
          <input
            type="checkbox"
            checked={airGappedMode}
            onChange={e => setAirGappedMode(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="#64748B" />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Parallel CPU Worker Threads</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>Multithreaded vector indexing and DuckDB query workers</p>
            </div>
          </div>
          <select
            value={cpuThreads}
            onChange={e => setCpuThreads(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              fontSize: '0.875rem',
              fontWeight: 500,
              outline: 'none'
            }}
          >
            <option value={4}>4 Threads</option>
            <option value={8}>8 Threads (Recommended)</option>
            <option value={12}>12 Threads</option>
            <option value={16}>16 Threads</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
        >
          <Save size={16} />
          <span>Save Configuration</span>
        </button>

        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #CBD5E1',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <RefreshCw size={16} />
          <span>Reset to Defaults</span>
        </button>
      </div>
    </div>
  );
};
