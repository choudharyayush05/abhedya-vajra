import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Printer,
  Copy,
  Check,
  FileText,
  Building2,
  AlertTriangle
} from 'lucide-react';

interface LegalReportsTabProps {
  victimAccount: string;
}

interface ProfileItem {
  id: string;
  name: string;
  title: string;
  primary_act: string;
  description: string;
  clause_count: number;
  review_days: number;
  max_days: number;
  allowed_citations: string[];
}

export const LegalReportsTab: React.FC<LegalReportsTabProps> = ({ victimAccount }) => {
  const [docType, setDocType] = useState<'freeze' | 'freeze_hi' | 'diary'>('freeze');
  const [targetBank, setTargetBank] = useState<string>('AXIS');
  const [selectedProfile, setSelectedProfile] = useState<string>('indore_default');
  const [profilesList, setProfilesList] = useState<ProfileItem[]>([]);
  const [packMeta, setPackMeta] = useState<any | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Legal Pack Profiles on mount
  useEffect(() => {
    fetch('/api/reports/profiles')
      .then(res => res.json())
      .then(data => {
        setPackMeta(data);
        if (data.profiles && data.profiles.length > 0) {
          setProfilesList(data.profiles);
        }
      })
      .catch(console.error);
  }, []);

  const fetchDocument = async () => {
    if (!victimAccount) return;
    setLoading(true);

    try {
      if (docType === 'diary') {
        const resp = await fetch('/api/reports/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ victim_account: victimAccount })
        });
        const data = await resp.json();
        setReportData(data);
      } else if (docType === 'freeze') {
        const resp = await fetch('/api/reports/freeze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            victim_account: victimAccount,
            target_bank: targetBank,
            profile_id: selectedProfile,
            use_ollama: true
          })
        });
        const data = await resp.json();
        setReportData(data);
      } else {
        const resp = await fetch('/api/reports/freeze-hindi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            victim_account: victimAccount,
            target_bank: targetBank,
            profile_id: selectedProfile
          })
        });
        const data = await resp.json();
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [docType, targetBank, selectedProfile, victimAccount]);

  const handleCopy = () => {
    if (reportData?.raw_text) {
      navigator.clipboard.writeText(reportData.raw_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clean, dedicated print mechanism that prints strictly the document text
  const handlePrint = () => {
    if (!reportData?.raw_text) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const title = docType === 'diary'
      ? `Case_Diary_${victimAccount}`
      : `Statutory_Lien_Notice_${targetBank}_${victimAccount}`;

    const escapedText = reportData.raw_text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 15mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace, 'Noto Sans Devanagari';
              font-size: 11.5pt;
              line-height: 1.5;
              color: #000000;
              background-color: #FFFFFF;
              margin: 0;
              padding: 0;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: inherit;
              font-size: inherit;
              line-height: inherit;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <pre>${escapedText}</pre>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {
          // ignore cleanup error
        }
      }, 1000);
    }, 250);
  };

  const isStale = reportData?.staleness?.is_stale || packMeta?.staleness?.is_stale;
  const stalenessWarning = reportData?.staleness?.warning || packMeta?.staleness?.warning;

  return (
    <div style={{
      maxWidth: '1060px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Sleek Top Header Bar */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#0F172A',
            margin: 0
          }}>
            Statutory Notices & Reports
          </h1>
          <p style={{
            fontSize: '0.8125rem',
            color: '#64748B',
            margin: '3px 0 0 0'
          }}>
            Victim Account: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{victimAccount || 'No account selected'}</strong> · Police Commissionerate, Indore
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopy}
            disabled={!reportData?.raw_text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '7px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              cursor: reportData?.raw_text ? 'pointer' : 'not-allowed',
              opacity: reportData?.raw_text ? 1 : 0.6,
              boxShadow: '0 1px 2px rgba(15,23,42,0.03)'
            }}
          >
            {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!reportData?.raw_text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '7px',
              backgroundColor: '#2563EB',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: reportData?.raw_text ? 'pointer' : 'not-allowed',
              opacity: reportData?.raw_text ? 1 : 0.6,
              boxShadow: '0 1px 3px rgba(37,99,235,0.25)'
            }}
          >
            <Printer size={14} />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Clean Control Bar */}
      <div className="no-print" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        padding: '8px 14px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.02)'
      }}>
        {/* Left: Document Type Segmented Control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#F1F5F9',
          borderRadius: '7px',
          padding: '2px',
          gap: '2px'
        }}>
          <button
            onClick={() => setDocType('freeze')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: docType === 'freeze' ? '#FFFFFF' : 'transparent',
              color: docType === 'freeze' ? '#0F172A' : '#64748B',
              fontWeight: docType === 'freeze' ? 600 : 500,
              fontSize: '12px',
              border: 'none',
              boxShadow: docType === 'freeze' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Building2 size={13} color={docType === 'freeze' ? '#2563EB' : '#64748B'} />
            <span>Bank Lien Notice (EN)</span>
          </button>

          <button
            onClick={() => setDocType('freeze_hi')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: docType === 'freeze_hi' ? '#FFFFFF' : 'transparent',
              color: docType === 'freeze_hi' ? '#0F172A' : '#64748B',
              fontWeight: docType === 'freeze_hi' ? 600 : 500,
              fontSize: '12px',
              border: 'none',
              boxShadow: docType === 'freeze_hi' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Building2 size={13} color={docType === 'freeze_hi' ? '#2563EB' : '#64748B'} />
            <span>हिन्दी नोटिस (HI)</span>
          </button>

          <button
            onClick={() => setDocType('diary')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: docType === 'diary' ? '#FFFFFF' : 'transparent',
              color: docType === 'diary' ? '#0F172A' : '#64748B',
              fontWeight: docType === 'diary' ? 600 : 500,
              fontSize: '12px',
              border: 'none',
              boxShadow: docType === 'diary' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileText size={13} color={docType === 'diary' ? '#2563EB' : '#64748B'} />
            <span>Case Diary (Sec 192)</span>
          </button>
        </div>

        {/* Right Controls: Jurisdiction Profile & Bank Selection */}
        {docType !== 'diary' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                Profile:
              </span>
              <select
                value={selectedProfile}
                onChange={e => setSelectedProfile(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  cursor: 'pointer',
                  maxWidth: '220px'
                }}
              >
                {profilesList.length > 0 ? (
                  profilesList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name.split(' (')[0]}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="indore_default">Indore / MP High Court</option>
                    <option value="bombay_strict_107">Bombay High Court</option>
                    <option value="delhi_magistrate_attachment">Delhi High Court</option>
                    <option value="permissive_106">Allahabad High Court</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                Bank:
              </span>
              <select
                value={targetBank}
                onChange={e => setTargetBank(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  cursor: 'pointer'
                }}
              >
                <option value="AXIS">AXIS Bank</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="KKBK">Kotak Mahindra Bank</option>
                <option value="SBIN">State Bank of India</option>
                <option value="ICIC">ICICI Bank</option>
                <option value="PUNB">Punjab National Bank</option>
                <option value="BARB">Bank of Baroda</option>
                <option value="IPOS">India Post Payments</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Slim Verification Status Strip */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        backgroundColor: reportData?.verification?.verified ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${reportData?.verification?.verified ? '#BBF7D0' : '#FECACA'}`,
        borderRadius: '7px',
        fontSize: '11.5px',
        color: reportData?.verification?.verified ? '#166534' : '#991B1B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={15} color={reportData?.verification?.verified ? '#16A34A' : '#DC2626'} />
          <span style={{ fontWeight: 600 }}>
            {reportData?.verification?.verified
              ? 'Court-Verified Requisition (Graph DB Validated)'
              : 'Review Pending'}
          </span>
          {reportData?.total_lien_inr !== undefined && (
            <span style={{ color: '#4B5563' }}>
              · Target Lien: <strong style={{ color: '#0F172A' }}>₹{Number(reportData.total_lien_inr).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong> ({reportData.accounts_count} Accounts)
            </span>
          )}
          {isStale && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              color: '#B45309',
              backgroundColor: '#FEF3C7',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              <AlertTriangle size={11} />
              <span>{stalenessWarning || 'Pack review advisory'}</span>
            </span>
          )}
        </div>

        {reportData?.sha256 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748B' }}>
            Hash: {reportData.sha256.slice(0, 16)}...
          </div>
        )}
      </div>

      {/* Printable Document Sheet Canvas */}
      <div className="printable-document-container" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 6px rgba(15,23,42,0.03)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              Drafting statutory notice with court-verified legal clauses...
            </div>
          ) : reportData?.raw_text ? (
            <pre className="printable-document-content" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: 1.55,
              color: '#0F172A',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0
            }}>
              {reportData.raw_text}
            </pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              Select a valid victim account to generate requisition.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalReportsTab;
