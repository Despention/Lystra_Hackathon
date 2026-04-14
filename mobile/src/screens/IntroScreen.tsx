import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from '../contexts/ThemeContext';

interface Props {
  onDone: () => void;
}

export default function IntroScreen({ onDone }: Props) {
  const t = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade + slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 2.8s
    const timer = setTimeout(() => dismiss(), 2800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(onDone);
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={dismiss}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: Animated.multiply(fadeAnim, fadeOut),
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo block */}
        <View style={styles.logoBox}>
          <Text style={styles.logoTZ}>TZ</Text>
        </View>
        <Text style={styles.title}>Analyzer</Text>
        <Text style={styles.tagline}>{t('introTagline')}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        <Text style={styles.powered}>{t('introPowered')}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoTZ: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 28,
  },
  powered: {
    fontSize: 13,
    color: '#475569',
  },
});
