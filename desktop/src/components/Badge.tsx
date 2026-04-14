import React from 'react';
import { IoAlertCircle, IoWarning, IoInformationCircle, IoBulb } from 'react-icons/io5';
import './Badge.css';

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <IoAlertCircle />,
  serious: <IoWarning />,
  warning: <IoInformationCircle />,
  advice: <IoBulb />,
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '\u041A\u0440\u0438\u0442\u0438\u0447\u043D\u043E',
  serious: '\u0421\u0435\u0440\u044C\u0451\u0437\u043D\u043E',
  warning: '\u0417\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0435',
  advice: '\u0421\u043E\u0432\u0435\u0442',
};

interface Props {
  severity: string;
}

export default function Badge({ severity }: Props) {
  const icon = SEVERITY_ICONS[severity] ?? <IoInformationCircle />;
  const label = SEVERITY_LABELS[severity] ?? severity;
  const variant = ['critical', 'serious', 'warning', 'advice'].includes(severity) ? severity : 'advice';

  return (
    <span className={`badge badge--${variant}`}>
      <span className="badge__icon">{icon}</span>
      <span className="badge__text">{label}</span>
    </span>
  );
}
