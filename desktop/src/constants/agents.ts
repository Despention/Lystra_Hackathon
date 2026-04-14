export const agentMeta: Record<string, { label: string; icon: string; weight: number }> = {
  structural: { label: 'Структура', icon: 'IoLayers', weight: 0.20 },
  terminological: { label: 'Терминология', icon: 'IoBook', weight: 0.15 },
  logical: { label: 'Логика', icon: 'IoGitBranch', weight: 0.25 },
  completeness: { label: 'Полнота', icon: 'IoCheckboxOutline', weight: 0.25 },
  scientific: { label: 'Научность', icon: 'IoFlask', weight: 0.15 },
};

export const AGENT_NAMES = Object.keys(agentMeta);

export const severityIcons: Record<string, string> = {
  critical: 'IoAlertCircle',
  serious: 'IoWarning',
  warning: 'IoInformationCircle',
  advice: 'IoBulb',
};
