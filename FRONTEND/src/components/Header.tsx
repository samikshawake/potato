import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Plus, ShieldCheck } from 'lucide-react-native';
import { THEME } from '../constants/theme';

interface Props {
  userName?: string;
  onPressAdd?: () => void;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export const Header: React.FC<Props> = ({
  userName = 'Parth',
  onPressAdd,
  onPressNotifications,
  onPressProfile,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Avatar & Greeting */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={onPressProfile}
        activeOpacity={0.8}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
        </View>
        <View>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Hey, {userName}</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Offline & Private</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Quick Add + Notification Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressAdd}
          activeOpacity={0.7}
        >
          <Plus size={18} color={THEME.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressNotifications}
          activeOpacity={0.7}
        >
          <Bell size={18} color={THEME.colors.textPrimary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primaryLight,
  },
  avatarText: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.soft,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.danger,
  },
});
