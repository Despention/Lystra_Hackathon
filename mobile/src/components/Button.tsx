import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary && { backgroundColor: theme.accent },
        isOutline && { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
        !isPrimary && !isOutline && { backgroundColor: theme.accentLight },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : theme.accent} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && { color: '#fff' },
            isOutline && { color: theme.text.secondary },
            !isPrimary && !isOutline && { color: theme.accent },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600' },
});
