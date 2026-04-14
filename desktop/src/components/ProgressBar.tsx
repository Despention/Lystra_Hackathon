
import './ProgressBar.css';

interface Props {
  progress: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ progress, color, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className="progress-bar__fill"
        style={{
          width: `${clamped * 100}%`,
          backgroundColor: color ?? 'var(--accent)',
          height,
        }}
      />
    </div>
  );
}
