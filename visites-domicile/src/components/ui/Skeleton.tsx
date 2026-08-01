'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', className }: SkeletonProps) {
  return (
    <div className={className} style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

// Dashboard KPI skeleton
export function DashboardSkeleton() {
  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* KPI pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', padding: '8px 0' }}>
        {[120, 100, 140, 110, 130].map((w, i) => (
          <Skeleton key={i} width={w} height={32} borderRadius={999} />
        ))}
      </div>
      {/* Grid cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ marginBottom: '12px' }}><Skeleton width="60%" height={14} /></div>
            <div style={{ marginBottom: '8px' }}><Skeleton width="40%" height={32} /></div>
            <Skeleton width="80%" height={12} />
          </div>
        ))}
      </div>
      {/* RDV list */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}><Skeleton width="30%" height={16} /></div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
            <Skeleton width={48} height={48} borderRadius={12} />
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '6px' }}><Skeleton width="50%" height={13} /></div>
              <Skeleton width="70%" height={11} />
            </div>
            <Skeleton width={60} height={24} borderRadius={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Patients list skeleton
export function PatientsSkeleton() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '12px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <Skeleton width={44} height={44} borderRadius={999} />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '6px' }}><Skeleton width="60%" height={14} /></div>
                <Skeleton width="40%" height={11} />
              </div>
            </div>
            <div style={{ marginBottom: '6px' }}><Skeleton width="80%" height={11} /></div>
            <Skeleton width="60%" height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Planning skeleton
export function PlanningSkeleton() {
  return (
    <div style={{ padding: '0', overflow: 'hidden' }}>
      {/* Header jours */}
      <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: '1px solid #E2E8F0', padding: '12px 0' }}>
        <div />
        {[1,2,3,4,5,6,7].map(i => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ margin: '0 auto 4px' }}><Skeleton width="40%" height={11} /></div>
            <div style={{ margin: '0 auto' }}><Skeleton width="60%" height={20} borderRadius={999} /></div>
          </div>
        ))}
      </div>
      {/* Time slots */}
      {[7,8,9,10,11].map(h => (
        <div key={h} style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: '1px solid #F1F5F9', minHeight: '60px', alignItems: 'flex-start', padding: '4px 0' }}>
          <div style={{ padding: '4px 8px' }}>
            <Skeleton width={32} height={11} />
          </div>
          {h === 9 && <div style={{ padding: '4px' }}><Skeleton height={52} borderRadius={8} /></div>}
          {h === 9 && <div />}
          {h === 9 && <div style={{ padding: '4px' }}><Skeleton height={38} borderRadius={8} /></div>}
        </div>
      ))}
    </div>
  );
}

// Generic table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${80 / cols}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} style={{ padding: '14px 20px', borderBottom: ri < rows - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={ci} width={ci === 0 ? '25%' : `${60 / (cols-1)}%`} height={ci === 0 ? 14 : 11} />
          ))}
        </div>
      ))}
    </div>
  );
}
