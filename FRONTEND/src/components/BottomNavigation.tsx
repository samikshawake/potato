import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, ArrowLeftRight, Calculator, PieChart, MessageSquareCode } from 'lucide-react-native';
import { THEME } from '../constants/theme';

export type NavTab = 'home' | 'transactions' | 'simulator' | 'insights' | 'assistant';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNavigation: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'transactions' as const, label: 'Activity', icon: ArrowLeftRight },
    { id: 'simulator' as const, label: 'Simulator', icon: Calculator },
    { id: 'insights' as const, label: 'Insights', icon: PieChart },
    { id: 'assistant' as const, label: 'Assistant', icon: MessageSquareCode },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconHolder, isActive && styles.activeIconHolder]}>
                <Icon
                  size={20}
                  color={isActive ? THEME.colors.primary : THEME.colors.textSecondary}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingBottom: 8,
    paddingTop: 6,
    ...THEME.shadows.card,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.sm,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.md,
    minWidth: 60,
  },
  activeTabButton: {},
  iconHolder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconHolder: {
    backgroundColor: THEME.colors.lavenderLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  activeTabLabel: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
