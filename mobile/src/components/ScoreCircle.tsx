import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  score: number;
  size?: number;
}

export default function ScoreCircle({ score, size = 120 }: Props) {
  const theme = useTheme();
  const color = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <Text style={[styles.score, { color, fontSize: size * 0.3 }]}>
        {Math.round(score)}
      </Text>
      <Text style={[styles.label, { color: theme.text.tertiary }]}>из 100</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  score: { fontWeight: '700' },
  label: { fontSize: 12, marginTop: 2 },
});
