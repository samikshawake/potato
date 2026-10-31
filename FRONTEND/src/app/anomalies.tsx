import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function AnomaliesScreen() {
  const router = useRouter();
  const { anomalies, reviewAnomaly } = useFinance();

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'transactions':
        router.push('/transactions');
        break;
      case 'simulator':
        router.push('/simulator');
        break;
      case 'insights':
        router.push('/insights');
        break;
      case 'assistant':
        router.push('/assistant');
        break;
    }
  };

  const pending = anomalies.filter((a) => a.status === 'PENDING');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unusual Transaction Alerts</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{pending.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Explaining Anomaly Detection vs Fraud */}
        <View style={styles.infoBanner}>
          <AlertTriangle size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Statistical Variance Detection</Text>
            <Text style={styles.infoText}>
              We flag transactions that exceed your category baseline to help you catch unexpected bill increases or large one-off expenses. These are not assumed to be fraud.
            </Text>
          </View>
        </View>

        {anomalies.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.categoryBadge}>{item.category} • {item.date}</Text>
              </View>
              <Text style={styles.amountText}>{formatINR(item.amount)}</Text>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>

            <View style={styles.baselineRow}>
              <Text style={styles.baselineLabel}>Category Typical Average:</Text>
              <Text style={styles.baselineVal}>{formatINR(item.typicalAverage)}</Text>
            </View>

            {item.status === 'PENDING' ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => reviewAnomaly(item.id, 'CONFIRMED')}
                >
                  <CheckCircle2 size={14} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Confirm Legitimate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.ignoreBtn}
                  onPress={() => reviewAnomaly(item.id, 'DISMISSED')}
                >
                  <XCircle size={14} color={THEME.colors.textSecondary} />
                  <Text style={styles.ignoreBtnText}>Ignore Alert</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.reviewedRow}>
                <ShieldCheck size={14} color={THEME.colors.success} />
                <Text style={styles.reviewedText}>
                  Reviewed by you: {item.status === 'CONFIRMED' ? 'Verified legitimate' : 'Alert dismissed'}
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="home" onSelectTab={handleNavChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    backgroundColor: '#FFFBEB',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: THEME.spacing.md,
  },
  infoTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  infoText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  categoryBadge: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  reasonBox: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginVertical: THEME.spacing.sm,
  },
  reasonText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    lineHeight: 16,
  },
  baselineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  baselineLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  baselineVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  confirmBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  ignoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.background,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ignoreBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  reviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  reviewedText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.success,
  },
});
