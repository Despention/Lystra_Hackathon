
import { useTheme } from '../contexts/ThemeContext';
import './ScoreCircle.css';

interface Props {
  score: number;
  size?: number;
}

export default function ScoreCircle({ score, size = 120 }: Props) {
  const theme = useTheme();
  const color = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, Math.round(score)));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="score-circle" style={{ width: size, height: size }}>
      <svg className="score-circle__svg" width={size} height={size}>
        <circle
          className="score-circle__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-circle__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="score-circle__content">
        <span className="score-circle__value" style={{ color, fontSize: size * 0.3 }}>
          {Math.round(score)}
        </span>
        <span className="score-circle__label">{'\u0438\u0437 100'}</span>
      </div>
    </div>
  );
}
