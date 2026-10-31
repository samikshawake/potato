import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, WifiOff } from 'lucide-react-native';
import { THEME } from '../constants/theme';

interface Props {
  minimal?: boolean;
}

export const OfflineIndicator: React.FC<Props> = ({ minimal = false }) => {
  if (minimal) {
    return (
      <View style={styles.minimalBadge}>
        <View style={styles.greenDot} />
        <Text style={styles.minimalText}>Offline-First</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <ShieldCheck size={14} color={THEME.colors.primary} />
        <Text style={styles.text}>100% On-Device • No Cloud Sync Required</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: THEME.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  text: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  minimalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  minimalText: {
    fontSize: 10,
    color: THEME.colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
