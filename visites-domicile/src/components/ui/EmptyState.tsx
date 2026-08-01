'use client';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, secondaryLabel, secondaryHref }: EmptyStateProps) {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '320px', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '16px', lineHeight: 1 }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', letterSpacing: '-.3px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65, maxWidth: '320px', marginBottom: '28px' }}>
        {description}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && actionHref && (
          <button onClick={() => router.push(actionHref)}
            style={{ padding: '10px 22px', background: 'linear-gradient(175deg,#2563EB,#1D4ED8)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.25)', fontFamily: 'inherit' }}>
            {actionLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <button onClick={() => router.push(secondaryHref)}
            style={{ padding: '10px 22px', background: '#F8FAFC', color: '#374151', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
