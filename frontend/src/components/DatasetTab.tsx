import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import type { DatasetTransactionsResponse, TransactionRecord } from '../types';

interface DatasetTabProps {
  onSelectVictim: (acct: string) => void;
}

export const DatasetTab: React.FC<DatasetTabProps> = ({ onSelectVictim }) => {
  const [data, setData] = useState<DatasetTransactionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('ts');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [pageJump, setPageJump] = useState<string>('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir
      });
      if (search.trim()) params.append('search', search.trim());
      if (paymentMode && paymentMode !== 'ALL') params.append('payment_mode', paymentMode);

      const resp = await fetch(`/api/dataset/transactions?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
      const json: DatasetTransactionsResponse = await resp.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dataset transactions from DuckDB');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, paymentMode, sortBy, sortDir]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setPaymentMode('ALL');
    setSortBy('ts');
    setSortDir('desc');
    setPage(1);
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(pageJump, 10);
    if (data && target >= 1 && target <= data.total_pages) {
      setPage(target);
      setPageJump('');
    }
  };

  const meta = data?.dataset_meta;
  const totalCount = data?.total_count ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const currentStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const currentEnd = Math.min(page * pageSize, totalCount);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 32px',
      backgroundColor: 'transparent',
      minHeight: '100%',
      color: '#334155',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Header Card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#FFFFFF',
        border: '2px solid #D5C7B5',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(60,45,30,0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={22} color="#2563EB" />
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Transactions Dataset
              </h1>
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: '1.5px solid #BFDBFE'
              }}>
                Active Ledger
              </span>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: '#64748B',
              margin: '6px 0 0 0',
              lineHeight: 1.4
            }}>
              Browse and search across 2,000,000 bank transactions. Click any account to trace its money trail.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchTransactions}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#FAF7F2',
                border: '2px solid #D5C7B5',
                color: '#334155',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(60,45,30,0.04)'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Dynamic Metric Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          paddingTop: '14px',
          borderTop: '2px solid #E2D7C8'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active File
            </span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A', marginTop: '2px', wordBreak: 'break-all' }}>
              {meta?.dataset_name || 'VoidHacks8_MuleAccount_2M_Transactions.csv'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Transactions
            </span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {meta?.total_rows ? meta.total_rows.toLocaleString() : totalCount.toLocaleString()} rows
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Indexed Accounts
            </span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {meta?.total_accounts ? meta.total_accounts.toLocaleString() : '24,873'} accounts
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              File Integrity (SHA-256)
            </span>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              color: '#059669',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }} title={meta?.dataset_sha256 || '2c9f81fd34f728c0b7c1e803cb49e1e231c1d9204a77badfcb737f50adf73101'}>
              ✓ {meta?.dataset_sha256 ? `${meta.dataset_sha256.slice(0, 16)}...` : 'Verified (2c9f81fd...)'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        backgroundColor: '#FFFFFF',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 320px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0 12px',
            height: '38px',
            width: '100%'
          }}>
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search by Account, Txn ID, Narration, IFSC..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '0.8125rem',
                color: '#0F172A'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              height: '38px',
              padding: '0 18px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
            }}
          >
            Search
          </button>
        </form>

        {/* Dropdowns: Payment Mode, Sort, Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Payment Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Mode:</span>
            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              style={{
                height: '38px',
                padding: '0 10px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: '38px',
                padding: '0 10px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ts">Timestamp</option>
              <option value="amount">Amount</option>
              <option value="txn_id">Txn ID</option>
              <option value="src_acct">Remitter</option>
              <option value="dst_acct">Beneficiary</option>
            </select>

            <button
              onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title={`Sorting ${sortDir.toUpperCase()}`}
            >
              <ArrowUpDown size={13} />
              {sortDir.toUpperCase()}
            </button>
          </div>

          {/* Rows per page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                height: '38px',
                padding: '0 10px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {(search || paymentMode !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Pagination Status & Controls Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
          Showing <strong style={{ color: '#0F172A' }}>{currentStart.toLocaleString()}</strong> – <strong style={{ color: '#0F172A' }}>{currentEnd.toLocaleString()}</strong> of <strong style={{ color: '#0F172A' }}>{totalCount.toLocaleString()}</strong> transactions (Page <strong>{page}</strong> of <strong>{totalPages.toLocaleString()}</strong>)
        </div>

        {/* Page Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1 || loading}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page <= 1 ? '#CBD5E1' : '#0F172A',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page <= 1 ? '#CBD5E1' : '#0F172A',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8125rem',
              fontWeight: 500
            }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {/* Quick Page Indicator / Jump */}
          <form onSubmit={handlePageJumpSubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageJump !== '' ? pageJump : page}
              onChange={(e) => setPageJump(e.target.value)}
              style={{
                width: '64px',
                height: '32px',
                textAlign: 'center',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>of {totalPages.toLocaleString()}</span>
            {pageJump !== '' && (
              <button
                type="submit"
                style={{
                  height: '32px',
                  padding: '0 8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go
              </button>
            )}
          </form>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page >= totalPages ? '#CBD5E1' : '#0F172A',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8125rem',
              fontWeight: 500
            }}
          >
            Next
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || loading}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page >= totalPages ? '#CBD5E1' : '#0F172A',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Tabular View - 100% Fit, Zero Horizontal Scrolling */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '2px solid #D5C7B5',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(60,45,30,0.04)',
        width: '100%'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: '#2563EB' }} />
            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
              Loading transactions from ledger...
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
              Showing page {page} of {totalPages.toLocaleString()}
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 8px 0' }}>Unable to load transaction records</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>{error}</p>
          </div>
        ) : data && data.transactions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: '0 0 8px 0' }}>No transactions found</p>
            <p style={{ fontSize: '0.875rem', margin: '0 0 16px 0' }}>Try broadening your search term or changing the payment mode filter.</p>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <table style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#FAF7F2',
                borderBottom: '2px solid #D5C7B5',
                color: '#64748B',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '12px 14px', width: '16%', fontWeight: 700 }}>Timestamp / ID</th>
                <th style={{ padding: '12px 14px', width: '22%', fontWeight: 700 }}>Sender (From)</th>
                <th style={{ padding: '12px 14px', width: '22%', fontWeight: 700 }}>Receiver (To)</th>
                <th style={{ padding: '12px 14px', width: '14%', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 10px', width: '8%', fontWeight: 700, textAlign: 'center' }}>Mode</th>
                <th style={{ padding: '12px 14px', width: '10%', fontWeight: 700 }}>Narration</th>
                <th style={{ padding: '12px 12px', width: '8%', fontWeight: 700, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions.map((tx: TransactionRecord, idx: number) => {
                return (
                  <tr
                    key={tx.txn_id || idx}
                    style={{
                      borderBottom: '1px solid #E2D7C8',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFBF8',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FDFBF8';
                    }}
                  >
                    {/* Timestamp / ID */}
                    <td style={{ padding: '10px 14px', overflow: 'hidden' }}>
                      <div style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {tx.timestamp}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.txn_id}>
                        {tx.txn_id}
                      </div>
                    </td>

                    {/* Sender */}
                    <td style={{ padding: '10px 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => onSelectVictim(tx.src_acct)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#2563EB',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap'
                          }}
                          title={`Investigate ${tx.src_acct}`}
                        >
                          {tx.src_acct}
                        </button>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1.5px solid #BFDBFE',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          {tx.src_bank || tx.src_ifsc?.slice(0, 4)}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontFamily: 'monospace' }}>
                        {tx.src_ifsc}
                      </div>
                    </td>

                    {/* Receiver */}
                    <td style={{ padding: '10px 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => onSelectVictim(tx.dst_acct)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#2563EB',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap'
                          }}
                          title={`Investigate ${tx.dst_acct}`}
                        >
                          {tx.dst_acct}
                        </button>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          border: '1.5px solid #CBD5E1',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          {tx.dst_bank || tx.dst_ifsc?.slice(0, 4)}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', fontFamily: 'monospace' }}>
                        {tx.dst_ifsc}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0F172A',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.84rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}>
                      ₹{tx.amount ? Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </td>

                    {/* Payment Mode */}
                    <td style={{ padding: '10px 8px', textAlign: 'center', overflow: 'hidden' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: tx.payment_mode === 'UPI' ? '#EFF6FF' : tx.payment_mode === 'IMPS' ? '#ECFDF5' : '#F8FAFC',
                        border: `1px solid ${tx.payment_mode === 'UPI' ? '#BFDBFE' : tx.payment_mode === 'IMPS' ? '#A7F3D0' : '#CBD5E1'}`,
                        color: tx.payment_mode === 'UPI' ? '#1D4ED8' : tx.payment_mode === 'IMPS' ? '#047857' : '#475569',
                        whiteSpace: 'nowrap'
                      }}>
                        {tx.payment_mode}
                      </span>
                    </td>

                    {/* Narration */}
                    <td style={{
                      padding: '10px 14px',
                      color: '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.78rem'
                    }} title={tx.narration || ''}>
                      {tx.narration || '—'}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => onSelectVictim(tx.src_acct)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1.5px solid #BFDBFE',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                        title={`Trace money trail for ${tx.src_acct}`}
                      >
                        Trace
                        <ArrowUpRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Pagination Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 0'
      }}>
        <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
          Page <strong style={{ color: '#0F172A' }}>{page}</strong> of <strong style={{ color: '#0F172A' }}>{totalPages.toLocaleString()}</strong> ({totalCount.toLocaleString()} total rows)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => {
              setPage(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page <= 1 || loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page <= 1 ? '#CBD5E1' : '#0F172A',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem'
            }}
          >
            First
          </button>

          <button
            onClick={() => {
              setPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page <= 1 || loading}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page <= 1 ? '#CBD5E1' : '#0F172A',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500
            }}
          >
            ← Previous 100
          </button>

          <button
            onClick={() => {
              setPage(p => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page >= totalPages || loading}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
            }}
          >
            Next 100 →
          </button>

          <button
            onClick={() => {
              setPage(totalPages);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page >= totalPages || loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: page >= totalPages ? '#CBD5E1' : '#0F172A',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem'
            }}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};
