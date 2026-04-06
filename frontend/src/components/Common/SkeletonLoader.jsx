import './SkeletonLoader.css';

export function SkeletonBlock({ width = '100%', height = 14, radius = 8, className = '', style = {} }) {
  return (
    <div
      className={`skl-block ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3, lineHeight = 12, gap = 8, lastWidth = '65%' }) {
  return (
    <div className="skl-stack" style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={`skl-text-${index}`}
          width={index === lines - 1 ? lastWidth : '100%'}
          height={lineHeight}
          radius={6}
        />
      ))}
    </div>
  );
}

export function CenteredSkeleton({ minHeight = '60vh' }) {
  return (
    <div className="skl-centered" style={{ minHeight }}>
      <div className="skl-surface">
        <SkeletonBlock width={140} height={20} />
        <SkeletonBlock width="75%" height={12} />
        <SkeletonText lines={3} lineHeight={10} lastWidth="55%" />
      </div>
    </div>
  );
}

export function HeaderSkeleton({ titleWidth = 220, subtitleWidth = 300, showAction = true }) {
  return (
    <div className="skl-header">
      <div className="skl-stack" style={{ flex: 1, minWidth: 0 }}>
        <SkeletonBlock width={titleWidth} height={18} />
        <SkeletonBlock width={subtitleWidth} height={12} />
      </div>
      {showAction && <SkeletonBlock width={92} height={34} radius={10} style={{ flexShrink: 0 }} />}
    </div>
  );
}

export function CardGridSkeleton({ cards = 4, columns = 'repeat(auto-fit, minmax(180px, 1fr))', minHeight = 120 }) {
  return (
    <div className="skl-grid" style={{ gridTemplateColumns: columns }}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={`skl-card-${index}`} className="skl-card" style={{ minHeight }}>
          <SkeletonBlock width={`${60 + (index * 11) % 30}%`} height={14} />
          <div style={{ height: 10 }} />
          <SkeletonText lines={2} lineHeight={10} lastWidth="55%" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="skl-table-shell">
      <div className="skl-table-head" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonBlock
            key={`skl-head-${colIndex}`}
            width={`${55 + (colIndex * 9) % 35}%`}
            height={10}
            radius={6}
          />
        ))}
      </div>
      <div className="skl-table-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`skl-row-${rowIndex}`}
            className="skl-table-row"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBlock
                key={`skl-cell-${rowIndex}-${colIndex}`}
                width={`${45 + ((rowIndex * 17 + colIndex * 11) % 45)}%`}
                height={colIndex % 2 === 0 ? 12 : 14}
                radius={6}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skl-table-row-${rowIndex}`}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={`skl-table-cell-${rowIndex}-${colIndex}`}>
              <SkeletonBlock
                width={`${45 + ((rowIndex * 13 + colIndex * 17) % 40)}%`}
                height={colIndex % 2 === 0 ? 12 : 14}
                radius={6}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
