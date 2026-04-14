import React from 'react';
import Spinner from './Spinner';
import './Button.css';

interface Props {
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Button({
  title,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  className = '',
  style,
}: Props) {
  return (
    <button
      className={`button button--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading ? (
        <Spinner size="small" color={variant === 'primary' ? '#fff' : undefined} />
      ) : (
        <>
          {icon && <span className="button__icon">{icon}</span>}
          {title}
        </>
      )}
    </button>
  );
}
