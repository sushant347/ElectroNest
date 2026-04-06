import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, RefreshCw, AlertCircle, X, ChevronLeft, ChevronRight,
  Filter, Calendar, SlidersHorizontal
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { TableRowsSkeleton } from '../../components/Common/SkeletonLoader';

const ACTION_COLORS = {
  INSERT: { bg: '#DCFCE7', color: '#16A34A' },
  CREATE: { bg: '#DCFCE7', color: '#16A34A' },
  UPDATE: { bg: '#DBEAFE', color: '#2563EB' },
  DELETE: { bg: '#FEE2E2', color: '#DC2626' },
  READ:   { bg: '#F3F4F6', color: '#6B7280' },
  LOGIN:  { bg: '#F3E8FF', color: '#7C3AED' },
};

const ALL_ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'INSERT', 'LOGIN'];
const TABLE_OPTIONS = [
  '', 'accounts_customuser', 'Suppliers', 'Products', 'Orders', 'Categories',
];

function ActionBadge({ action }) {
  const upper = (action || '').toUpperCase();
  const cfg = ACTION_COLORS[upper] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {action || '—'}
    </span>
  );
}

function parseVal(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

const SKIP_FIELDS = new Set(['password', 'last_login']);

function fmtJson(obj) {
  if (!obj) return '';
  const filtered = Object.fromEntries(
    Object.entries(obj).filter(([k]) => !SKIP_FIELDS.has(k))
  );
  return JSON.stringify(filtered, null, 2);
}

function DiffViewer({ oldValues, newValues, action }) {
  const [open, setOpen] = useState(false);
  const old = parseVal(oldValues);
  const nw  = parseVal(newValues);

  const isCreate = action === 'CREATE' || action === 'INSERT';
  const isDelete = action === 'DELETE';

  // For UPDATE: count changed fields for badge
  let changedCount = 0;
  if (!isCreate && !isDelete && old && nw) {
    const keys = [...new Set([...Object.keys(old), ...Object.keys(nw)])].filter(k => !SKIP_FIELDS.has(k));
    changedCount = keys.filter(k => JSON.stringify(old[k]) !== JSON.stringify(nw[k])).length;
  }

  if (!old && !nw) return <span style={{ color: '#D1D5DB' }}>—</span>;

  const btnColor  = isCreate ? '#16A34A' : isDelete ? '#DC2626' : '#2563EB';
  const btnBg     = isCreate ? '#F0FDF4' : isDelete ? '#FEF2F2' : '#EFF6FF';
  const btnBorder = isCreate ? '#BBF7D0' : isDelete ? '#FECACA' : '#BFDBFE';

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 11px', borderRadius: 7, cursor: 'pointer',
          fontSize: '0.74rem', fontWeight: 700, transition: 'all 0.15s',
          background: open ? btnBg : '#F8FAFC',
          border: `1.5px solid ${open ? btnBorder : '#E5E7EB'}`,
          color: open ? btnColor : '#6B7280',
        }}
      >
        <span style={{ fontSize: '0.6rem' }}>{open ? '▼' : '▶'}</span>
        {isCreate ? 'New Record' : isDelete ? 'Deleted' : 'View Changes'}
        {!isCreate && !isDelete && changedCount > 0 && (
          <span style={{ background: '#F97316', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: '0.62rem', fontWeight: 800, lineHeight: '16px' }}>
            {changedCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400 }}>
          {/* BEFORE block — show for UPDATE and DELETE */}
          {!isCreate && old && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #FECACA' }}>
              <div style={{ background: '#FEF2F2', padding: '5px 12px', fontSize: '0.67rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #FECACA' }}>
                ● Before
              </div>
              <pre style={{ margin: 0, padding: '10px 12px', background: '#FFFAFA', fontSize: '0.72rem', fontFamily: 'monospace', color: '#7F1D1D', overflowX: 'auto', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {fmtJson(old)}
              </pre>
            </div>
          )}

          {/* AFTER block — show for UPDATE and CREATE */}
          {!isDelete && nw && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #BBF7D0' }}>
              <div style={{ background: '#F0FDF4', padding: '5px 12px', fontSize: '0.67rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #BBF7D0' }}>
                ● After
              </div>
              <pre style={{ margin: 0, padding: '10px 12px', background: '#F7FFF9', fontSize: '0.72rem', fontFamily: 'monospace', color: '#14532D', overflowX: 'auto', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {fmtJson(nw)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (tableFilter) params.table_name = tableFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await adminAPI.getLogs(params);
      setLogs(res.data?.results || res.data || []);
      setPage(1);
    } catch {
      setError('Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, tableFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const hasFilters = search || actionFilter || tableFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setTableFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Action counts for quick stats
  const actionCounts = logs.reduce((acc, log) => {
    const a = (log.action || '').toUpperCase();
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});

  // Pagination
  const totalPages = Math.ceil(logs.length / perPage);
  const paged = logs.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title"><FileText size={24} /> System Logs</h1>
          <p className="sl-subtitle">
            Audit trail of all system activities
            {hasFilters && <> &nbsp;·&nbsp; <span style={{ color: '#2563EB' }}>{logs.length} results</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`sl-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
          >
            <SlidersHorizontal size={15} /> Filters
            {hasFilters && <span className="sl-filter-dot" />}
          </button>
          <button className="sl-refresh" onClick={fetchLogs}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick action filter chips */}
      <div className="sl-action-chips">
        {ALL_ACTIONS.map(a => {
          const cfg = ACTION_COLORS[a] || { bg: '#F3F4F6', color: '#6B7280' };
          const count = a ? (actionCounts[a] || 0) : logs.length;
          return (
            <button
              key={a || 'all'}
              className={`sl-chip ${actionFilter === a ? 'active' : ''}`}
              style={actionFilter === a ? { background: cfg.color, color: '#fff', borderColor: cfg.color } : {}}
              onClick={() => { setActionFilter(a); setPage(1); }}
            >
              {a || 'All'} <span className="sl-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="sl-search-bar">
        <Search size={15} color="#9CA3AF" />
        <input
          type="text"
          placeholder="Search by action, table, or user..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sl-search-input"
        />
        {search && <button className="sl-clear" onClick={() => setSearch('')}><X size={13} /></button>}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="sl-filter-panel">
          <div className="sl-filter-row">
            <div className="sl-filter-group">
              <label><Filter size={12} /> Action Type</label>
              <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="sl-select">
                <option value="">All Actions</option>
                {['CREATE', 'UPDATE', 'DELETE', 'INSERT', 'LOGIN'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="sl-filter-group">
              <label><FileText size={12} /> Table / Module</label>
              <select value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(1); }} className="sl-select">
                <option value="">All Tables</option>
                {TABLE_OPTIONS.filter(Boolean).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sl-filter-group">
              <label><Calendar size={12} /> Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="sl-date-input"
              />
            </div>
            <div className="sl-filter-group">
              <label><Calendar size={12} /> Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="sl-date-input"
              />
            </div>
          </div>
          {hasFilters && (
            <button className="sl-clear-all" onClick={clearFilters}>
              <X size={13} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Action Stats Bar */}
      {!loading && logs.length > 0 && (
        <div className="sl-stats-bar">
          {Object.entries(actionCounts).map(([action, count]) => {
            const cfg = ACTION_COLORS[action] || { bg: '#F3F4F6', color: '#6B7280' };
            return (
              <div key={action} className="sl-stat-pill" style={{ background: cfg.bg, color: cfg.color }}>
                {action}: <strong>{count}</strong>
              </div>
            );
          })}
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>
            {logs.length} total entries
          </span>
        </div>
      )}

      {error && <div className="sl-error"><AlertCircle size={15} /> {error}</div>}

      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>Table / Module</th>
              <th>Record ID</th>
              <th>Changed By</th>
              <th>Timestamp</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableRowsSkeleton rows={8} columns={7} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
                {hasFilters ? 'No logs match your filters' : 'No audit logs found'}
              </td></tr>
            ) : paged.map((log, i) => (
              <tr key={log.id || i}>
                <td style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600 }}>
                  {(page - 1) * perPage + i + 1}
                </td>
                <td><ActionBadge action={log.action} /></td>
                <td>
                  {log.table_name ? (
                    <span className="sl-table-name">{log.table_name}</span>
                  ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                <td>
                  {log.record_id
                    ? <code className="sl-record-id">#{log.record_id}</code>
                    : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                <td>
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                    {log.changed_by
                      ? log.changed_by.split('(')[0].trim()
                      : <span style={{ color: '#D1D5DB' }}>—</span>}
                  </span>
                  {log.changed_by && log.changed_by.includes('(') && (
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      {log.changed_by.match(/\(([^)]+)\)/)?.[1] || ''}
                    </div>
                  )}
                </td>
                <td>
                  {log.timestamp ? (
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                        {new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                <td className="sl-changes-cell">
                  {log.old_values || log.new_values ? (
                    <DiffViewer oldValues={log.old_values} newValues={log.new_values} action={(log.action || '').toUpperCase()} />
                  ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sl-pagination">
          <span className="sl-page-info">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, logs.length)} of {logs.length} entries
          </span>
          <div className="sl-page-btns">
            <button className="sl-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            {(() => {
              const range = [];
              const delta = 2;
              for (let p = Math.max(1, page - delta); p <= Math.min(totalPages, page + delta); p++) {
                range.push(p);
              }
              return range.map(p => (
                <button key={p} className={`sl-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ));
            })()}
            <button className="sl-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="sl-page-info">Page {page} of {totalPages}</span>
        </div>
      )}

      <style>{`
        .sl-page { padding: 28px 32px 40px; max-width: 1440px; margin: 0 auto; }
        .sl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .sl-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .sl-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .sl-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-weight: 600; cursor: pointer; color: #374151; font-size: 0.82rem; transition: all 0.2s; }
        .sl-refresh:hover { border-color: #2563EB; color: #2563EB; }

        .sl-filter-toggle { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; color: #6B7280; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; position: relative; }
        .sl-filter-toggle:hover, .sl-filter-toggle.active { border-color: #2563EB; color: #2563EB; background: #EFF6FF; }
        .sl-filter-dot { width: 7px; height: 7px; border-radius: 50%; background: #DC2626; position: absolute; top: 6px; right: 6px; }

        .sl-action-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .sl-chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; color: #6B7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .sl-chip:hover { border-color: #2563EB; color: #2563EB; }
        .sl-chip.active { border-color: currentColor; }
        .sl-chip-count { font-weight: 800; font-size: 0.75rem; opacity: 0.8; }

        .sl-search-bar { display: flex; align-items: center; gap: 10px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 16px; margin-bottom: 12px; transition: border-color 0.2s; }
        .sl-search-bar:focus-within { border-color: #2563EB; }
        .sl-search-input { flex: 1; border: none; outline: none; font-size: 0.88rem; color: #1e293b; background: transparent; }
        .sl-clear { background: none; border: none; cursor: pointer; color: #9CA3AF; display: flex; padding: 0; }
        .sl-clear:hover { color: #DC2626; }

        .sl-filter-panel { background: #F8FAFC; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
        .sl-filter-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
        .sl-filter-group { display: flex; flex-direction: column; gap: 5px; }
        .sl-filter-group label { font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px; }
        .sl-select, .sl-date-input { padding: 8px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.83rem; color: #374151; background: #fff; font-family: inherit; cursor: pointer; }
        .sl-select:focus, .sl-date-input:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .sl-clear-all { display: flex; align-items: center; gap: 5px; margin-top: 12px; padding: 7px 14px; border: 1px solid #FECACA; border-radius: 8px; background: #FEF2F2; color: #DC2626; font-size: 0.78rem; font-weight: 600; cursor: pointer; }

        .sl-stats-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; padding: 10px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
        .sl-stat-pill { font-size: 0.78rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; }

        .sl-error { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.85rem; margin-bottom: 14px; }
        .sl-spin { animation: slSpin 1s linear infinite; }
        @keyframes slSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        .sl-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; }
        .sl-table { width: 100%; border-collapse: collapse; }
        .sl-table th { padding: 11px 14px; text-align: left; font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; white-space: nowrap; }
        .sl-table td { padding: 11px 14px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .sl-table tr:last-child td { border-bottom: none; }
        .sl-table tr:hover td { background: #FAFAFA; }

        .sl-table-name { font-size: 0.82rem; font-weight: 500; color: #374151; font-family: monospace; background: #F3F4F6; padding: 2px 8px; border-radius: 5px; }
        .sl-record-id { font-size: 0.78rem; font-weight: 700; color: #2563EB; background: #EFF6FF; padding: 2px 8px; border-radius: 5px; font-family: monospace; }

        .sl-changes-cell { max-width: 220px; }
        .sl-details summary { cursor: pointer; font-size: 0.78rem; font-weight: 600; color: #2563EB; list-style: none; }
        .sl-details summary::-webkit-details-marker { display: none; }
        .sl-details summary::before { content: '▶ '; font-size: 0.65rem; }
        .sl-details[open] summary::before { content: '▼ '; }
        .sl-changes-content { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
        .sl-change-block { border-radius: 6px; padding: 6px 8px; }
        .sl-change-block.old { background: #FEF2F2; }
        .sl-change-block.new { background: #F0FDF4; }
        .sl-change-label { display: block; font-size: 0.68rem; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-bottom: 2px; }
        .sl-change-block code { font-size: 0.72rem; color: #374151; word-break: break-all; font-family: monospace; }

        .sl-pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
        .sl-page-info { font-size: 0.78rem; color: #6B7280; font-weight: 500; }
        .sl-page-btns { display: flex; gap: 3px; }
        .sl-page-btn { min-width: 32px; height: 32px; border-radius: 7px; border: 1px solid #d1d5db; background: #fff; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.82rem; font-weight: 600; padding: 0 4px; transition: all 0.15s; }
        .sl-page-btn:hover:not(:disabled) { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
        .sl-page-btn.active { background: #2563EB; color: #fff; border-color: #2563EB; }
        .sl-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 768px) {
          .sl-page { padding: 12px; }
          .sl-header { flex-direction: column; gap: 8px; }
          .sl-filter-row { flex-direction: column; }
          .sl-action-chips { gap: 4px; }
          .sl-chip { padding: 5px 10px; font-size: 0.73rem; }
          .sl-table th, .sl-table td { padding: 8px 10px; font-size: 0.78rem; }
          .sl-changes-cell { max-width: 160px; }
          .sl-pagination { flex-direction: column; align-items: center; gap: 8px; }
          .sl-stats-bar { padding: 8px 10px; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
