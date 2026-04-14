import React from 'react';
import { IoAlertCircle, IoWarning, IoInformationCircle, IoBulb } from 'react-icons/io5';
import './SeverityFilter.css';

const FILTERS = ['all', 'critical', 'serious', 'warning', 'advice'] as const;

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  serious: '#F97316',
  warning: '#F59E0B',
  advice: '#6B7280',
};

const LABELS: Record<string, string> = {
  all: '\u0412\u0441\u0435',
  critical: '\u041A\u0440\u0438\u0442\u0438\u0447\u043D\u043E',
  serious: '\u0421\u0435\u0440\u044C\u0451\u0437\u043D\u043E',
  warning: '\u0417\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F',
  advice: '\u0421\u043E\u0432\u0435\u0442\u044B',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <IoAlertCircle />,
  serious: <IoWarning />,
  warning: <IoInformationCircle />,
  advice: <IoBulb />,
};

interface Props {
  selected: string;
  onSelect: (value: string) => void;
  counts?: Record<string, number>;
}

export default function SeverityFilter({ selected, onSelect, counts }: Props) {
  return (
    <div className="severity-filter">
      {FILTERS.map((f) => {
        const isActive = selected === f;
        const activeColor = f === 'all' ? 'var(--accent)' : SEVERITY_COLORS[f] ?? 'var(--accent)';
        const count = f === 'all' ? undefined : counts?.[f];

        return (
          <button
            key={f}
            className={`severity-filter__pill ${isActive ? 'severity-filter__pill--active' : ''}`}
            onClick={() => onSelect(f)}
            style={isActive ? {
              borderColor: activeColor,
              backgroundColor: `${SEVERITY_COLORS[f] ?? 'var(--accent)'}20`,
              color: activeColor,
            } : undefined}
          >
            {f !== 'all' && (
              <span
                className="severity-filter__pill-icon"
                style={{ color: isActive ? activeColor : 'var(--text-tertiary)' }}
              >
                {SEVERITY_ICONS[f]}
              </span>
            )}
            {LABELS[f]}{count != null ? ` (${count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
