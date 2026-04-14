import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  progress: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ progress, color, height = 8 }: Props) {
  const theme = useTheme();
  const fillColor = color ?? theme.accent;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { height, backgroundColor: theme.border }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 4, overflow: 'hidden' },
  fill: { borderRadius: 4 },
});
