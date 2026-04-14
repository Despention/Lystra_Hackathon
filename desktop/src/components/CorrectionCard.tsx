import { useTranslation } from '../contexts/ThemeContext';
import Badge from './Badge';
import type { Correction } from '../types/analysis';
import './CorrectionCard.css';

interface DiffWord {
  word: string;
  type: 'same' | 'removed' | 'added';
}

function computeWordDiff(original: string, suggested: string): { origDiff: DiffWord[]; suggDiff: DiffWord[] } {
  const origWords = original.split(/\s+/).filter(Boolean);
  const suggWords = suggested.split(/\s+/).filter(Boolean);

  // Build LCS table
  const m = origWords.length;
  const n = suggWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === suggWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const origDiff: DiffWord[] = [];
  const suggDiff: DiffWord[] = [];
  let i = m;
  let j = n;

  const origStack: DiffWord[] = [];
  const suggStack: DiffWord[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === suggWords[j - 1]) {
      origStack.push({ word: origWords[i - 1], type: 'same' });
      suggStack.push({ word: suggWords[j - 1], type: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      suggStack.push({ word: suggWords[j - 1], type: 'added' });
      j--;
    } else {
      origStack.push({ word: origWords[i - 1], type: 'removed' });
      i--;
    }
  }

  origStack.reverse().forEach((w) => origDiff.push(w));
  suggStack.reverse().forEach((w) => suggDiff.push(w));

  return { origDiff, suggDiff };
}

interface Props {
  correction: Correction;
  index: number;
}

export default function CorrectionCard({ correction, index }: Props) {
  const t = useTranslation();
  const { origDiff, suggDiff } = computeWordDiff(correction.original_text, correction.suggested_text);

  return (
    <div className="correction-card">
      <div className="correction-card__header">
        <span className="correction-card__index">#{index + 1}</span>
        <span className="correction-card__section">{correction.section}</span>
        <Badge severity={correction.severity} />
      </div>

      <div className="correction-card__diff">
        <div className="correction-card__diff-col">
          <span className="correction-card__diff-label">{t('originalText')}</span>
          <p className="correction-card__diff-text">
            {origDiff.map((w, i) => (
              <span key={i} className={w.type === 'removed' ? 'diff-removed' : 'diff-same'}>
                {w.word}{' '}
              </span>
            ))}
          </p>
        </div>
        <div className="correction-card__diff-col">
          <span className="correction-card__diff-label">{t('suggestedText')}</span>
          <p className="correction-card__diff-text">
            {suggDiff.map((w, i) => (
              <span key={i} className={w.type === 'added' ? 'diff-added' : 'diff-same'}>
                {w.word}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="correction-card__reason">
        <span className="correction-card__reason-label">{t('correctionReason')}:</span>{' '}
        {correction.reason}
      </div>
    </div>
  );
}
