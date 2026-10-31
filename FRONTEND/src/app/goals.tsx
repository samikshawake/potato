import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Award,
  Coffee,
  Trophy,
  Plus,
  X,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  PiggyBank,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { SavingsGoalCard } from '../components/SavingsGoalCard';
import { MascotAvatar } from '../components/MascotAvatar';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function GoalsScreen() {
  const router = useRouter();
  const {
    goals,
    badges,
    mission,
    addGoal,
    contributeToGoal,
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newInitial, setNewInitial] = useState('');

  const handleCreateGoal = () => {
    const target = parseFloat(newTarget);
    const initial = parseFloat(newInitial) || 0;
    if (!newTitle.trim() || isNaN(target) || target <= 0) return;

    addGoal({
      title: newTitle.trim(),
      targetAmount: target,
      currentAmount: initial,
      deadlineDate: '2027-01-31',
      category: 'Personal Goal',
      icon: 'laptop',
      isCompleted: initial >= target,
      monthlyContribution: Math.ceil(target / 6),
    });

    setNewTitle('');
    setNewTarget('');
    setNewInitial('');
    setShowAddModal(false);
  };

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
        <Text style={styles.headerTitle}>Gamified Savings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={18} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Level & XP Hero Card (matching reference image Screen E) */}
        <View style={styles.levelCard}>
          <View style={styles.levelLeft}>
            {/* Golden Star Badge */}
            <View style={styles.goldBadgeCircle}>
              <Award size={28} color="#D97706" />
            </View>
            <View>
              <Text style={styles.levelTitle}>Level 7</Text>
              <Text style={styles.xpText}>9,450 XP</Text>
            </View>
          </View>

          <View style={styles.levelRight}>
            <Text style={styles.savedStreakAmount}>₹7,900</Text>
            <View style={styles.streakBadge}>
              <TrendingUp size={10} color={THEME.colors.success} />
              <Text style={styles.streakBadgeText}>+3%</Text>
            </View>
          </View>
        </View>

        {/* Today's Mission Card (matching reference image Screen E) */}
        <View style={styles.missionCard}>
          <View style={styles.missionLeft}>
            <View style={styles.coffeeCircle}>
              <Coffee size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle}>{mission.title}</Text>
              <Text style={styles.missionSubtitle}>{mission.subtitle}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.skipMissionBtn} activeOpacity={0.7}>
            <Text style={styles.skipMissionText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Badges Carousel / Showcase (matching reference image Screen E) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          <TouchableOpacity style={styles.showMoreBtn}>
            <Text style={styles.showMoreText}>Show more</Text>
            <ChevronRight size={14} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesScroll}
        >
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeItemCard}>
              <View style={styles.badgeIconHolder}>
                {badge.icon === 'fox_trophy' ? (
                  <MascotAvatar size={42} showShades={true} />
                ) : badge.icon === 'coffee' ? (
                  <Coffee size={24} color="#B45309" />
                ) : (
                  <PiggyBank size={24} color={THEME.colors.primary} />
                )}
              </View>
              <Text style={styles.badgeTitle}>{badge.title}</Text>
              <Text style={styles.badgeSavedText}>
                {formatINR(badge.savedAmount)} Saved
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* #1 Monthly Savings Trophy Card (matching reference image Screen E) */}
        <View style={styles.trophyBannerCard}>
          <View style={styles.trophyIconHolder}>
            <Trophy size={28} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trophyRankText}>#1 October Savings</Text>
            <Text style={styles.trophyAmount}>₹24,000.00</Text>
            <Text style={styles.trophyDates}>
              01 Oct - 31 Oct • 12 streak days
            </Text>
          </View>
        </View>

        {/* Active Savings Goals List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Target Goals</Text>
          <TouchableOpacity
            style={styles.showMoreBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.showMoreText}>+ Add Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.map((goal) => (
          <SavingsGoalCard
            key={goal.id}
            goal={goal}
            onPressAddMoney={() => contributeToGoal(goal.id, 2000)}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Savings Goal</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputField}
              placeholder="Goal Name (e.g. Goa Trip, New Phone)"
              placeholderTextColor={THEME.colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Target Amount in ₹ (e.g. 50000)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={newTarget}
              onChangeText={setNewTarget}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Initial Deposit in ₹ (optional)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={newInitial}
              onChangeText={setNewInitial}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateGoal}
            >
              <Text style={styles.submitBtnText}>Start Tracking Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 24,
  },
  levelCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.md,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  goldBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  levelTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  xpText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  levelRight: {
    alignItems: 'flex-end',
  },
  savedStreakAmount: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
    gap: 3,
    marginTop: 4,
  },
  streakBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  missionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: THEME.spacing.md,
  },
  missionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    flex: 1,
  },
  coffeeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  missionSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  skipMissionBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  skipMissionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  showMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  badgesScroll: {
    gap: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
  },
  badgeItemCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    alignItems: 'center',
    width: 105,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  badgeIconHolder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  badgeSavedText: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  trophyBannerCard: {
    backgroundColor: '#FEF9C3',
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FDE047',
    marginBottom: THEME.spacing.lg,
  },
  trophyIconHolder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyRankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854D0E',
    textTransform: 'uppercase',
  },
  trophyAmount: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
    color: '#713F12',
    marginVertical: 1,
  },
  trophyDates: {
    fontSize: 10,
    color: '#A16207',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.hover,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  inputField: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 12,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    ...THEME.shadows.soft,
  },
  submitBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFF',
  },
});
