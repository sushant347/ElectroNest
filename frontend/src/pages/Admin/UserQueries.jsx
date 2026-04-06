import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MessageSquare, RefreshCw, Search, Mail, Phone, User,
  Clock, CheckCircle2, XCircle, Eye,
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import { TableRowsSkeleton } from '../../components/Common/SkeletonLoader'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const statusColors = {
  NEW: { bg: '#FEF3C7', color: '#B45309' },
  IN_PROGRESS: { bg: '#DBEAFE', color: '#1D4ED8' },
  RESOLVED: { bg: '#DCFCE7', color: '#15803D' },
  CLOSED: { bg: '#F3F4F6', color: '#4B5563' },
}

function StatusBadge({ status }) {
  const cfg = statusColors[status] || statusColors.CLOSED
  return (
    <span style={{
      fontSize: '0.72rem',
      fontWeight: 700,
      borderRadius: 99,
      padding: '4px 10px',
      background: cfg.bg,
      color: cfg.color,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {(status || '').replace('_', ' ').toLowerCase()}
    </span>
  )
}

export default function UserQueries() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  const fetchQueries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      const res = await adminAPI.getUserQueries(params)
      setQueries(res.data?.results || res.data || [])
    } catch {
      setError('Failed to load user queries.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { fetchQueries() }, [fetchQueries])

  const stats = useMemo(() => {
    const total = queries.length
    const unread = queries.filter(q => !q.is_read).length
    const newCount = queries.filter(q => q.status === 'NEW').length
    const inProgress = queries.filter(q => q.status === 'IN_PROGRESS').length
    return { total, unread, newCount, inProgress }
  }, [queries])

  const markAsRead = async (id) => {
    try {
      await adminAPI.markUserQueryRead(id)
      fetchQueries()
      if (selected?.id === id) {
        const refreshed = await adminAPI.getUserQuery(id)
        setSelected(refreshed.data)
      }
    } catch {
      setError('Failed to mark as read.')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateUserQuery(id, { status, is_read: true })
      fetchQueries()
      const refreshed = await adminAPI.getUserQuery(id)
      setSelected(refreshed.data)
    } catch {
      setError('Failed to update query status.')
    }
  }

  return (
    <div className="uq-page">
      <div className="uq-header">
        <div>
          <h1 className="uq-title"><MessageSquare size={22} /> User Query</h1>
          <p className="uq-sub">Messages submitted from Contact Us form.</p>
        </div>
        <button className="uq-refresh" onClick={fetchQueries}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="uq-stats">
        <div className="uq-stat"><span>Total</span><strong>{stats.total}</strong></div>
        <div className="uq-stat"><span>Unread</span><strong>{stats.unread}</strong></div>
        <div className="uq-stat"><span>New</span><strong>{stats.newCount}</strong></div>
        <div className="uq-stat"><span>In Progress</span><strong>{stats.inProgress}</strong></div>
      </div>

      <div className="uq-filters">
        <div className="uq-search-wrap">
          <Search size={15} color="#9CA3AF" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, subject, phone..."
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="uq-error">{error}</div>}

      <div className="uq-grid">
        <div className="uq-table-wrap">
          <table className="uq-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowsSkeleton rows={6} columns={5} />
              ) : queries.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#9CA3AF' }}>No user queries found.</td></tr>
              ) : queries.map(q => (
                <tr key={q.id} className={selected?.id === q.id ? 'active' : ''} onClick={() => setSelected(q)}>
                  <td>
                    <div className="uq-name-cell">
                      <span>{q.first_name} {q.last_name}</span>
                      {!q.is_read && <span className="uq-dot" title="Unread" />}
                    </div>
                  </td>
                  <td className="uq-subject-cell">{q.subject}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td>{new Date(q.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {!q.is_read && (
                      <button className="uq-read-btn" onClick={(e) => { e.stopPropagation(); markAsRead(q.id) }}>
                        <Eye size={13} /> Mark Read
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="uq-detail">
          {!selected ? (
            <div className="uq-empty">Select a query to view details.</div>
          ) : (
            <>
              <div className="uq-detail-head">
                <h3>{selected.subject}</h3>
                <StatusBadge status={selected.status} />
              </div>
              <div className="uq-meta">
                <div><User size={14} /> {selected.first_name} {selected.last_name || ''}</div>
                <div><Mail size={14} /> {selected.email}</div>
                <div><Phone size={14} /> {selected.phone || 'N/A'}</div>
                <div><Clock size={14} /> {new Date(selected.created_at).toLocaleString()}</div>
              </div>

              <div className="uq-message-box">{selected.message}</div>

              <div className="uq-detail-submeta">
                <div><strong>Source:</strong> {selected.source_page || 'N/A'}</div>
                <div><strong>IP:</strong> {selected.ip_address || 'N/A'}</div>
              </div>

              <div className="uq-actions">
                <button className="inprog" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}><Clock size={14} /> In Progress</button>
                <button className="resolved" onClick={() => updateStatus(selected.id, 'RESOLVED')}><CheckCircle2 size={14} /> Resolve</button>
                <button className="closed" onClick={() => updateStatus(selected.id, 'CLOSED')}><XCircle size={14} /> Close</button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .uq-page { padding: 28px 32px 40px; max-width: 1500px; margin: 0 auto; }
        .uq-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
        .uq-title { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.45rem; font-weight: 800; color: #111827; }
        .uq-sub { margin: 4px 0 0; color: #6B7280; font-size: 0.86rem; }
        .uq-refresh { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 8px; padding: 8px 14px; font-size: 0.82rem; font-weight: 600; cursor: pointer; }

        .uq-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 14px; }
        .uq-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
        .uq-stat span { color: #6B7280; font-size: 0.78rem; }
        .uq-stat strong { color: #111827; font-size: 1rem; }

        .uq-filters { display: grid; grid-template-columns: 1fr 220px; gap: 10px; margin-bottom: 14px; }
        .uq-search-wrap { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; }
        .uq-search-wrap input { border: none; outline: none; width: 100%; font-size: 0.86rem; color: #1F2937; }
        .uq-filters select { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 8px 10px; font-size: 0.85rem; }

        .uq-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; border-radius: 8px; padding: 9px 12px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 600; }

        .uq-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
        .uq-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: auto; }
        .uq-table { width: 100%; border-collapse: collapse; }
        .uq-table th, .uq-table td { padding: 10px 12px; font-size: 0.82rem; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: top; }
        .uq-table th { font-size: 0.74rem; color: #6B7280; text-transform: uppercase; letter-spacing: .04em; background: #F8FAFC; }
        .uq-table tbody tr { cursor: pointer; }
        .uq-table tbody tr:hover { background: #FFFBEB; }
        .uq-table tbody tr.active { background: #FEF3C7; }
        .uq-name-cell { display: flex; align-items: center; gap: 7px; }
        .uq-dot { width: 8px; height: 8px; background: #F97316; border-radius: 50%; }
        .uq-subject-cell { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .uq-read-btn { border: 1px solid #fed7aa; background: #fff7ed; color: #c2410c; border-radius: 7px; padding: 4px 7px; display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; }

        .uq-detail { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; min-height: 360px; }
        .uq-empty { color: #94A3B8; font-size: .85rem; display: flex; align-items: center; justify-content: center; height: 100%; }
        .uq-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .uq-detail-head h3 { margin: 0; color: #111827; font-size: 1.02rem; font-weight: 700; }
        .uq-meta { display: flex; flex-direction: column; gap: 6px; color: #4B5563; font-size: .8rem; margin-bottom: 10px; }
        .uq-meta > div { display: flex; align-items: center; gap: 7px; }
        .uq-message-box { border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 10px; padding: 10px 12px; white-space: pre-wrap; color: #1F2937; line-height: 1.6; font-size: .86rem; min-height: 140px; }
        .uq-detail-submeta { margin-top: 10px; color: #6B7280; font-size: .76rem; display: grid; gap: 5px; }
        .uq-actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
        .uq-actions button { border: none; border-radius: 8px; padding: 8px 11px; display: inline-flex; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700; cursor: pointer; }
        .uq-actions .inprog { background: #DBEAFE; color: #1D4ED8; }
        .uq-actions .resolved { background: #DCFCE7; color: #15803D; }
        .uq-actions .closed { background: #F3F4F6; color: #4B5563; }

        @media (max-width: 1180px) {
          .uq-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .uq-page { padding: 16px; }
          .uq-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .uq-filters { grid-template-columns: 1fr; }
          .uq-subject-cell { max-width: 160px; }
        }
      `}</style>
    </div>
  )
}
