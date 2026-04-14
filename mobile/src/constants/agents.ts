export const agentMeta: Record<string, { label: string; icon: string; weight: number }> = {
  structural: { label: 'Структура', icon: 'layers-outline', weight: 0.20 },
  terminological: { label: 'Терминология', icon: 'book-outline', weight: 0.15 },
  logical: { label: 'Логика', icon: 'git-branch-outline', weight: 0.25 },
  completeness: { label: 'Полнота', icon: 'checkbox-outline', weight: 0.25 },
  scientific: { label: 'Научность', icon: 'flask-outline', weight: 0.15 },
};

export const AGENT_NAMES = Object.keys(agentMeta);

export const severityIcons: Record<string, string> = {
  critical: 'alert-circle',
  serious: 'warning',
  warning: 'information-circle',
  advice: 'bulb-outline',
};
