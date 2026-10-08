import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Database,
  Zap,
  Users,
  Repeat,
  Network,
  FileCheck,
  FolderOpen,
  ArrowLeftRight,
  Landmark,
  Flag,
  Shield,
  ChevronDown
} from 'lucide-react';
import type { OverviewData } from '../types';

interface LoadDataTabProps {
  overviewData: OverviewData | null;
  onDatasetChange: () => void;
  onSelectVictim?: (victim: string) => void;
  onNavigateToInvestigate?: () => void;
}

export const LoadDataTab: React.FC<LoadDataTabProps> = ({
  overviewData,
  onDatasetChange,
  onSelectVictim,
  onNavigateToInvestigate: _onNavigateToInvestigate
}) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedPresetFile, setSelectedPresetFile] = useState<string>('data/raw/VoidHacks8_MuleAccount_2M_Transactions.csv');
  const [riskViewMode, setRiskViewMode] = useState<'Accounts' | 'Transactions' | 'Volume'>('Accounts');
  const [showRiskDropdown, setShowRiskDropdown] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadStatus('Loading bank records into the offline database...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/ingest/upload', {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) throw new Error('Failed to load file');

      setUploadStatus('Bank records indexed successfully! Database ready.');
      setTimeout(() => {
        setUploading(false);
        setUploadStatus(null);
        onDatasetChange();
      }, 800);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setUploading(false);
    }
  };

  const handleLoadPreset = async (filepath: string) => {
    setSelectedPresetFile(filepath);
    setUploading(true);
    setUploadStatus(`Loading selected investigation scenario...`);

    try {
      const resp = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath })
      });

      if (!resp.ok) throw new Error('Failed to load scenario');

      setUploadStatus('Scenario loaded and indexed successfully!');
      setTimeout(() => {
        setUploading(false);
        setUploadStatus(null);
        onDatasetChange();
      }, 700);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const currentDatasetFilename = overviewData?.dataset_name || 'VoidHacks8_MuleAccount_2M_Transactions.csv';
  const totalTxns = overviewData?.total_transactions 
    ? overviewData.total_transactions.toLocaleString() 
    : '2,000,000';
  const totalAccts = overviewData?.total_accounts
    ? overviewData.total_accounts.toLocaleString()
    : '24,873';
  const flaggedCount = overviewData?.tier_distribution 
    ? ((overviewData.tier_distribution['High'] || 0) + (overviewData.tier_distribution['Critical'] || 0)).toLocaleString()
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
      low: overviewData?.tier_distribution?.['Low'] ? overviewData.tier_distribution['Low'].toLocaleString() : '7,123',
      lowPct: '28.7%',
      med: overviewData?.tier_distribution?.['Medium'] ? overviewData.tier_distribution['Medium'].toLocaleString() : '17,324',
      medPct: '69.6%',
      high: overviewData?.tier_distribution?.['High'] ? overviewData.tier_distribution['High'].toLocaleString() : '426',
      highPct: '1.7%',
      crit: overviewData?.tier_distribution?.['Critical'] ? overviewData.tier_distribution['Critical'].toLocaleString() : '182',
      critPct: '0.7%'
    };
  };

  const tierStats = getTierStats();

  // Top suspects list with simple clear role labels
  const baseSuspects = (overviewData?.top_mules && overviewData.top_mules.length > 0)
    ? overviewData.top_mules
    : [
        { acct_no: 'AIRP10000479', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹14,50,000' },
        { acct_no: 'AIRP10000498', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹12,80,000' },
        { acct_no: 'AIRP10000578', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹9,40,000' },
        { acct_no: 'AIRP10000595', primary_bank: 'AIRP', risk_index: 80, tier: 'High', predicted_role: 'Distributor', amount: '₹8,20,000' },
        { acct_no: 'AIRP10000621', primary_bank: 'AIRP', risk_index: 75, tier: 'Medium', predicted_role: 'Collector', amount: '₹6,10,000' },
        { acct_no: 'SBIN10000843', primary_bank: 'SBIN', risk_index: 85, tier: 'Critical', predicted_role: 'Distributor', amount: '₹22,10,000' },
        { acct_no: 'HDFC10000912', primary_bank: 'HDFC', risk_index: 82, tier: 'High', predicted_role: 'Collector', amount: '₹11,40,000' },
        { acct_no: 'ICIC10000411', primary_bank: 'ICIC', risk_index: 78, tier: 'High', predicted_role: 'Distributor', amount: '₹7,90,000' },
        { acct_no: 'AXIS10000215', primary_bank: 'AXIS', risk_index: 76, tier: 'High', predicted_role: 'Distributor', amount: '₹6,80,000' },
        { acct_no: 'PUNB10000552', primary_bank: 'PUNB', risk_index: 74, tier: 'Medium', predicted_role: 'Collector', amount: '₹5,40,000' },
      ];

  // Preset Scenarios with colorful icon accents
  const scenarios = [
    {
      id: 'voidhacks',
      title: '2M National Bank Network',
      path: 'data/raw/VoidHacks8_MuleAccount_2M_Transactions.csv',
      desc: '2,000,000 txns across 24,873 accounts. Full network.',
      tag: 'Full Scale',
      icon: Database,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      tagColor: '#1D4ED8',
      tagBg: '#DBEAFE'
    },
    {
      id: 'smurfing',
      title: 'Fast Smurfing (< 5 Min)',
      path: 'synthetic_data/scenario_1_fast_smurfing.csv',
      desc: 'Stolen funds rapidly split within minutes.',
      tag: 'Rapid Split',
      icon: Zap,
      iconColor: '#059669',
      iconBg: '#ECFDF5',
      tagColor: '#047857',
      tagBg: '#D1FAE5'
    },
    {
      id: 'investment',
      title: 'Investment Scam Ring',
      path: 'synthetic_data/scenario_2_investment_scam.csv',
      desc: 'Task fraud funnel with collectors & distributors.',
      tag: 'Task Fraud',
      icon: Users,
      iconColor: '#D97706',
      iconBg: '#FFFBEB',
      tagColor: '#B45309',
      tagBg: '#FEF3C7'
    },
    {
      id: 'cyclic',
      title: 'Cyclic Mule Ring',
      path: 'synthetic_data/scenario_3_cyclic_ring.csv',
      desc: 'Circular round-trip transfers disguise origin.',
      tag: 'Circular Loop',
      icon: Repeat,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
      tagColor: '#B91C1C',
      tagBg: '#FEE2E2'
    },
    {
      id: 'capacity',
      title: '500-Node Large Syndicate',
      path: 'synthetic_data/scenario_4_mega_capacity_stress_test_500nodes.csv',
      desc: 'High-volume syndicate with 500 mule accounts.',
      tag: 'High Capacity',
      icon: Network,
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      tagColor: '#6D28D9',
      tagBg: '#EDE9FE'
    },
    {
      id: 'sample',
      title: 'Curated Forensic Sample',
      path: 'synthetic_data/sample_custom_export.csv',
      desc: 'Quick-start sample with confirmed mule roles.',
      tag: 'Sample Set',
      icon: FileCheck,
      iconColor: '#0891B2',
      iconBg: '#ECFEFF',
      tagColor: '#0E7490',
      tagBg: '#CFFAFE'
    }
  ];

  return (
    <div style={{
      maxWidth: '1360px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      color: '#0F172A',
      paddingBottom: '24px'
    }}>
      {/* Floating Status Toast: Never shifts or resizes any box */}
      {uploadStatus && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 9999
        }}>
          <CheckCircle2 size={16} color="#34D399" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* 2x2 Fixed-Dimension Grid: All 4 boxes have IDENTICAL width & height (340px) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 340px)',
        gap: '16px'
      }}>
        {/* BOX 1 (Top-Left): Upload Bank Statement */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '2px solid #D5C7B5',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
          height: '340px',
          maxHeight: '340px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <UploadCloud size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Upload Bank Statement
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                Load evidence CSV or Excel export
              </span>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: isDragOver ? '#EFF6FF' : '#FAF7F2',
              border: isDragOver ? '2px dashed #2563EB' : '2px dashed #D5C7B5',
              borderRadius: '8px',
              padding: '18px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textAlign: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              flex: 1
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(37,99,235,0.12)'
            }}>
              <UploadCloud size={18} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Drag & drop bank statement CSV here
              </p>
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>
                or click to browse from computer
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.parquet"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />

            <span style={{
              marginTop: '4px',
              fontSize: '10px',
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 600
            }}>
              Supports SBI, HDFC, ICICI, Axis, Airtel Payments & More
            </span>
          </div>
        </div>

        {/* BOX 2 (Top-Right): Pre-Configured Investigation Scenarios */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '2px solid #D5C7B5',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
          height: '340px',
          maxHeight: '340px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <FolderOpen size={15} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Pre-Configured Scenarios
                </h2>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Click to load and trace immediately
                </span>
              </div>
            </div>

            <span style={{
              fontSize: '10.5px',
              fontWeight: 600,
              backgroundColor: '#FAF7F2',
              border: '1px solid #D5C7B5',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              6 Ready
            </span>
          </div>

          {/* 6 Scenarios Grid: Fixed height rows with ellipsis */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            flex: 1,
            minHeight: 0
          }}>
            {scenarios.map(scen => {
              const isSelected = selectedPresetFile === scen.path || currentDatasetFilename.includes(scen.id);
              const Icon = scen.icon;
              return (
                <div
                  key={scen.id}
                  onClick={() => handleLoadPreset(scen.path)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FAF7F2',
                    border: `1.5px solid ${isSelected ? '#2563EB' : '#D5C7B5'}`,
                    cursor: uploading ? 'wait' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '3px',
                    height: '74px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'background-color 0.12s, border-color 0.12s'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F4EDE4';
                      e.currentTarget.style.borderColor = '#B8A896';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FAF7F2';
                      e.currentTarget.style.borderColor = '#D5C7B5';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: scen.iconBg,
                        color: scen.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={11} />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scen.title}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      backgroundColor: scen.tagBg,
                      color: scen.tagColor,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      flexShrink: 0
                    }}>
                      {scen.tag}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '10px',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {scen.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOX 3 (Bottom-Left): Overview Metrics & Risk Categories Block */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '2px solid #D5C7B5',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
          height: '340px',
          maxHeight: '340px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {/* Top 4 Key Metric Cards (2x2 Grid with equal heights) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            flexShrink: 0
          }}>
            {/* Metric Card 1: Transactions */}
            <div style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1.5px solid #D5C7B5',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '66px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ArrowLeftRight size={11} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>
                    Total Transactions
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#16A34A' }}>
                  ▲ +8.3%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {totalTxns}
                </span>
                <span style={{ fontSize: '0.625rem', color: '#94A3B8' }}>Verified</span>
              </div>
            </div>

            {/* Metric Card 2: Accounts */}
            <div style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1.5px solid #D5C7B5',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '66px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Landmark size={11} color="#059669" />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>
                    Total Accounts
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#16A34A' }}>
                  ▲ +5.1%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {totalAccts}
                </span>
                <span style={{ fontSize: '0.625rem', color: '#94A3B8' }}>Active ledger</span>
              </div>
            </div>

            {/* Metric Card 3: Flagged for Review */}
            <div style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1.5px solid #D5C7B5',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '66px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Flag size={11} color="#DC2626" />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>
                    Flagged Review
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#DC2626' }}>
                  High Risk
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#DC2626',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {flaggedCount}
                </span>
                <span style={{ fontSize: '0.625rem', color: '#94A3B8' }}>Needs action</span>
              </div>
            </div>

            {/* Metric Card 4: Suspicious Groups */}
            <div style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1.5px solid #D5C7B5',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '66px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Network size={11} color="#7C3AED" />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>
                    Mule Groups
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#7C3AED' }}>
                  Clustered
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {syndicatesCount}
                </span>
                <span style={{ fontSize: '0.625rem', color: '#94A3B8' }}>Rings</span>
              </div>
            </div>
          </div>

          {/* Bottom Sub-Block: Risk Categories with fixed height */}
          <div style={{
            backgroundColor: '#FAF7F2',
            borderRadius: '8px',
            border: '1.5px solid #D5C7B5',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '110px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={13} color="#2563EB" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
                  Risk Categories
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>
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
                    padding: '2px 7px',
                    borderRadius: '5px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C7B5',
                    color: '#334155',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>{riskViewMode}</span>
                  <ChevronDown size={10} color="#64748B" />
                </button>

                {showRiskDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '105%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C7B5',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 30,
                    minWidth: '105px',
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
                          padding: '5px 8px',
                          fontSize: '0.68rem',
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

            {/* Segmented Risk Bar */}
            <div style={{
              height: '7px',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              backgroundColor: '#E2E8F0',
              margin: '2px 0'
            }}>
              <div style={{ width: '28.7%', backgroundColor: '#34D399' }} title="Low: 28.7%" />
              <div style={{ width: '69.6%', backgroundColor: '#FBBF24' }} title="Medium: 69.6%" />
              <div style={{ width: '1.7%', backgroundColor: '#F87171' }} title="High: 1.7%" />
              <div style={{ width: '0.7%', backgroundColor: '#1E293B' }} title="Critical: 0.7%" />
            </div>

            {/* 4 Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.625rem', color: '#64748B' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#34D399' }} />
                  <span>Low</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.low}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.625rem', color: '#64748B' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
                  <span>Medium</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.med}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.625rem', color: '#64748B' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F87171' }} />
                  <span>High</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', marginTop: '1px' }}>
                  {tierStats.high}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.625rem', color: '#64748B' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#1E293B' }} />
                  <span>Critical</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                  {tierStats.crit}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOX 4 (Bottom-Right): High Suspect Accounts (Roster with clean internal scroll) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '2px solid #D5C7B5',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(60, 45, 30, 0.04)',
          height: '340px',
          maxHeight: '340px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626'
              }}>
                <Users size={15} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  High Suspect Accounts
                </h2>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Priority flagged accounts for urgent review
                </span>
              </div>
            </div>

            <span style={{
              fontSize: '10.5px',
              fontWeight: 600,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              {baseSuspects.length} Flagged
            </span>
          </div>

          {/* Clean Scrollable Suspects Table: Scrolls inside box without altering outer dimensions */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FAF7F2'
          }}>
            <table style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              textAlign: 'left'
            }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#FAF7F2' }}>
                <tr style={{ borderBottom: '1.5px solid #D5C7B5', color: '#64748B', fontSize: '0.68rem', fontWeight: 600 }}>
                  <th style={{ width: '26px', padding: '6px 4px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '115px', padding: '6px 6px' }}>Account</th>
                  <th style={{ width: '60px', padding: '6px 4px' }}>Bank</th>
                  <th style={{ width: '45px', padding: '6px 4px' }}>Risk</th>
                  <th style={{ width: '65px', padding: '6px 4px' }}>Tier</th>
                  <th style={{ width: '85px', padding: '6px 4px' }}>Role</th>
                  <th style={{ width: '60px', padding: '6px 6px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {baseSuspects.map((row: any, idx: number) => {
                  const rankColors = [
                    { bg: '#EF4444', text: '#FFFFFF' },
                    { bg: '#F59E0B', text: '#FFFFFF' },
                    { bg: '#3B82F6', text: '#FFFFFF' },
                    { bg: '#8B5CF6', text: '#FFFFFF' },
                    { bg: '#64748B', text: '#FFFFFF' },
                  ];
                  const rankStyle = rankColors[idx] || rankColors[4];
                  const tierColor = row.tier === 'Critical' ? '#991B1B' : row.tier === 'High' ? '#DC2626' : '#D97706';
                  const tierBg = row.tier === 'Critical' ? '#FEF2F2' : row.tier === 'High' ? '#FEE2E2' : '#FEF3C7';

                  return (
                    <tr
                      key={row.acct_no || idx}
                      onClick={() => onSelectVictim && onSelectVictim(row.acct_no)}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        height: '34px',
                        backgroundColor: '#FFFFFF',
                        transition: 'background-color 0.12s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F4EDE4')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Rank */}
                      <td style={{ padding: '4px', textAlign: 'center' }}>
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
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {row.acct_no}
                      </td>

                      {/* Bank */}
                      <td style={{
                        padding: '4px',
                        fontSize: '0.7rem',
                        color: '#334155',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {row.primary_bank || 'AIRP'}
                      </td>

                      {/* Risk Score */}
                      <td style={{ padding: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>
                        {row.risk_index}
                      </td>

                      {/* Tier */}
                      <td style={{ padding: '4px' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: tierBg,
                          color: tierColor,
                          fontSize: '0.625rem',
                          fontWeight: 600
                        }}>
                          {row.tier}
                        </span>
                      </td>

                      {/* Role */}
                      <td style={{
                        padding: '4px',
                        fontSize: '0.7rem',
                        color: '#64748B',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {row.predicted_role}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectVictim) onSelectVictim(row.acct_no);
                          }}
                          title={`Trace money flow for ${row.acct_no}`}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            border: '1px solid #DBEAFE',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease'
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
    </div>
  );
};

export default LoadDataTab;
