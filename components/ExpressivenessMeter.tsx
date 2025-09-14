'use client';

interface ExpressivenessMeterProps {
  value01: number;
  label?: string;
  showPercentage?: boolean;
}

export function ExpressivenessMeter({ 
  value01, 
  label = "Expressiveness",
  showPercentage = true 
}: ExpressivenessMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value01)) * 100);
  
  const containerStyle: React.CSSProperties = {
    background: '#f3f4f6',
    borderRadius: 6,
    height: 8,
    position: 'relative',
    overflow: 'hidden'
  };
  
  const barStyle: React.CSSProperties = {
    width: `${pct}%`,
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa, #34d399, #fbbf24)',
    borderRadius: 6,
    transition: 'width 0.3s ease-in-out'
  };
  
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div>
      <div aria-label={`${label} meter`} style={containerStyle}>
        <div style={barStyle} />
      </div>
      {showPercentage && (
        <div style={labelStyle}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  );
}
