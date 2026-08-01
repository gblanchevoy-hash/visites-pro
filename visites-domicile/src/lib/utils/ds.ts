// Design System tokens — same across all pages
export const DS = {
  page: { background: '#F8FAFC', padding: '32px' },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
    padding: '24px',
  },
  cardSection: {
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  iconBox: (color: string, bg: string) => ({
    width: '40px', height: '40px', borderRadius: '12px',
    background: bg, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
    color,
  }),
  label: { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' },
  input: {
    width: '100%', padding: '11px 14px', background: '#F8FAFC',
    border: '1.5px solid #E2E8F0', borderRadius: '10px',
    fontSize: '14px', color: '#0F172A', outline: 'none', fontFamily: 'inherit',
  },
  btnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 24px', background: '#2563EB', color: '#FFFFFF',
    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '10px 20px', background: '#F8FAFC', color: '#374151',
    border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  sectionTitle: { fontSize: '15px', fontWeight: 600, color: '#0F172A' },
  sectionSub:   { fontSize: '12px', color: '#94A3B8', marginTop: '2px' },
  infoBox: (color: string, bg: string, border: string) => ({
    padding: '14px 16px', background: bg, border: `1px solid ${border}`,
    borderRadius: '12px', fontSize: '12px', color, lineHeight: '1.6',
  }),
};
