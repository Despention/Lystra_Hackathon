
import './Spinner.css';

interface Props {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export default function Spinner({ size = 'medium', color, className = '' }: Props) {
  const style = color ? { borderTopColor: color } : undefined;

  return (
    <div
      className={`spinner spinner--${size} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}
