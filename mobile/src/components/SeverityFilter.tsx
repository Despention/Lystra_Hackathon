import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { severityIcons } from '../constants/agents';

const FILTERS = ['all', 'critical', 'serious', 'warning', 'advice'] as const;
const SEVERITY_COLORS = {
  critical: '#EF4444',
  serious:  '#F97316',
  warning:  '#F59E0B',
  advice:   '#6B7280',
};
const LABELS = {
  all: 'Все',
  critical: 'Критично',
  serious: 'Серьёзно',
  warning: 'Замечания',
  advice: 'Советы',
};

interface Props {
  selected: string;
  onSelect: (value: string) => void;
  counts?: Record<string, number>;
}

export default function SeverityFilter({ selected, onSelect, counts }: Props) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={styles.container}>
        {FILTERS.map((f) => {
          const isActive = selected === f;
          const activeColor = f === 'all' ? theme.accent : SEVERITY_COLORS[f] ?? theme.accent;
          const count = f === 'all' ? undefined : counts?.[f];

          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.pill,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isActive && { borderColor: activeColor, backgroundColor: activeColor + '20' },
              ]}
              onPress={() => onSelect(f)}
            >
              {f !== 'all' && (
                <Ionicons
                  name={severityIcons[f] as any}
                  size={13}
                  color={isActive ? activeColor : theme.text.tertiary}
                />
              )}
              <Text
                style={[
                  styles.label,
                  { color: isActive ? activeColor : theme.text.secondary },
                  isActive && styles.labelActive,
                ]}
              >
                {LABELS[f]}{count != null ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, paddingRight: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: { fontSize: 13 },
  labelActive: { fontWeight: '600' },
});
