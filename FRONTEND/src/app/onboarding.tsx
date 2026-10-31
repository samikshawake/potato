import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  PieChart,
  Calculator,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { MascotAvatar } from '../components/MascotAvatar';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  const steps = [
    {
      title: 'Understand Where Your Money Goes',
      description:
        'Categorize UPI, NEFT, and card spends automatically with zero cloud tracking. Keep your full financial history right on your device.',
      icon: <PieChart size={32} color={THEME.colors.primary} />,
      mood: 'cool' as const,
    },
    {
      title: 'Simulate Big Purchases Before Buying',
      description:
        'Ask questions like "Can I afford a laptop for ₹50,000 next month?" and get clear, math-backed feasibility scenarios.',
      icon: <Calculator size={32} color={THEME.colors.primary} />,
      mood: 'happy' as const,
    },
    {
      title: 'Explainable Insights, 100% Offline',
      description:
        'No mysterious black-box algorithms. Every recommendation shows the exact transactions and formula used to calculate it.',
      icon: <ShieldCheck size={32} color={THEME.colors.primary} />,
      mood: 'celebrate' as const,
    },
  ];

  const handleNext = () => {
    if (currentPage < steps.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      router.replace('/');
    }
  };

  const current = steps[currentPage];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Sparkles size={16} color={THEME.colors.primary} />
          </View>
          <Text style={styles.brandTitle}>CashCompass</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={styles.skipBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Mascot Center Stage */}
        <View style={styles.mascotContainer}>
          <MascotAvatar size={120} showShades={true} mood={current.mood} />
        </View>

        {/* Benefit Step Details */}
        <View style={styles.iconCircle}>{current.icon}</View>
        <Text style={styles.stepTitle}>{current.title}</Text>
        <Text style={styles.stepDescription}>{current.description}</Text>

        {/* Page Indicator Dots */}
        <View style={styles.indicatorsRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentPage === i ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.privacyNote}>
          <ShieldCheck size={14} color={THEME.colors.success} />
          <Text style={styles.privacyText}>
            Your financial data stays on your device.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {currentPage === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
  },
  mascotContainer: {
    marginBottom: THEME.spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.lg,
  },
  stepTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },
  stepDescription: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: THEME.spacing.xl,
  },
  indicatorsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: THEME.colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#D1C4E9',
  },
  footer: {
    gap: THEME.spacing.md,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.soft,
  },
  nextBtnText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: '#FFF',
  },
});
