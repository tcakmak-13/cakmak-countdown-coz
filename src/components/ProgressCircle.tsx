interface Props {
  label: string;
  percentage: number;
  size?: number;
}

export default function ProgressCircle({ label, percentage, size = 72 }: Props) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{ filter: 'drop-shadow(0 0 4px hsl(25 95% 53% / 0.5))' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold text-primary">
          {Math.round(percentage)}%
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight max-w-[72px] truncate">
        {label}
      </span>
    </div>
  );
}
