import { useState } from 'react';
import { IoDocumentText, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import './SummaryCard.css';

interface Props {
  summary: string;
}

export default function SummaryCard({ summary }: Props) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="summary-card">
      <button
        className="summary-card__header"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <IoDocumentText className="summary-card__icon" />
        <span className="summary-card__title">{t('documentSummary')}</span>
        <span className="summary-card__chevron">
          {expanded ? <IoChevronUp /> : <IoChevronDown />}
        </span>
      </button>
      {expanded && (
        <p className="summary-card__text">{summary}</p>
      )}
    </div>
  );
}
