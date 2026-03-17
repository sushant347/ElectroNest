export default function RoleBadge({ role }) {
  const roleConfig = {
    customer: { label: 'Customer', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
    owner: { label: 'Owner', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    warehouse: { label: 'Warehouse', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    admin: { label: 'Admin', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  };
  const cfg = roleConfig[role] || roleConfig.customer;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'capitalize',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      letterSpacing: '0.3px',
    }}>
      {cfg.label}
    </span>
  );
}
