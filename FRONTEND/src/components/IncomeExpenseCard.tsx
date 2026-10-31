import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Pencil, Check, X } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';

interface Props {
  startingSalary: number;
  pocketMoney: number;
  income: number;
  expenses: number;
  onSaveIncome?: (startingSalary: number, pocketMoney: number) => void;
}

export const IncomeExpenseCard: React.FC<Props> = ({
  startingSalary,
  pocketMoney,
  income,
  expenses,
  onSaveIncome,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(startingSalary));
  const [pocketInput, setPocketInput] = useState(String(pocketMoney));

  useEffect(() => {
    if (!isEditing) {
      setSalaryInput(String(startingSalary));
      setPocketInput(String(pocketMoney));
    }
  }, [startingSalary, pocketMoney, isEditing]);

  const handleSave = () => {
    const parsedSal = Math.max(0, parseFloat(salaryInput) || 0);
    const parsedPocket = Math.max(0, parseFloat(pocketInput) || 0);
    onSaveIncome?.(parsedSal, parsedPocket);
    setIsEditing(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Total Income Card = Starting Salary + Pocket Money */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F8F0' }]}>
              <ArrowDownLeft size={16} color={THEME.colors.success} />
            </View>
            {onSaveIncome && !isEditing && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setIsEditing(true)}
                accessibilityLabel="Edit starting salary and pocket money"
              >
                <Pencil size={12} color={THEME.colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.label}>Total Income</Text>
          <Text style={[styles.amount, { color: THEME.colors.success }]}>
            {formatINR(income)}
          </Text>
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownLine}>
              <Text style={styles.breakdownKey}>Starting Salary</Text>
              <Text style={styles.breakdownVal}>{formatINR(startingSalary)}</Text>
            </View>
            <View style={styles.breakdownLine}>
              <Text style={styles.breakdownKey}>+ Pocket Money</Text>
              <Text style={styles.breakdownVal}>{formatINR(pocketMoney)}</Text>
            </View>
          </View>
        </View>

        {/* Total Expenses Card */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FDEDF0' }]}>
              <ArrowUpRight size={16} color={THEME.colors.danger} />
            </View>
          </View>
          <Text style={styles.label}>Expenses</Text>
          <Text style={[styles.amount, { color: THEME.colors.danger }]}>
            −{formatINR(expenses)}
          </Text>
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownLine}>
              <Text style={styles.breakdownKey}>Income</Text>
              <Text style={styles.breakdownVal}>{formatINR(income)}</Text>
            </View>
            <View style={styles.breakdownLine}>
              <Text style={styles.breakdownKey}>− Expenses</Text>
              <Text style={styles.breakdownVal}>{formatINR(expenses)}</Text>
            </View>
          </View>
        </View>
      </View>

      {isEditing && (
        <View style={styles.editorCard}>
          <View style={styles.editorInputsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.editorLabel}>Starting Salary (₹)</Text>
              <TextInput
                style={styles.editorInput}
                keyboardType="numeric"
                value={salaryInput}
                onChangeText={setSalaryInput}
                placeholder="0"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editorLabel}>Pocket Money (₹)</Text>
              <TextInput
                style={styles.editorInput}
                keyboardType="numeric"
                value={pocketInput}
                onChangeText={setPocketInput}
                placeholder="0"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>
          </View>
          <View style={styles.editorActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsEditing(false)}
            >
              <X size={14} color={THEME.colors.textSecondary} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={14} color="#FFF" />
              <Text style={styles.saveBtnText}>Update Income</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
    gap: THEME.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  editBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
  },
  breakdownBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    gap: 2,
  },
  breakdownLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownKey: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 10,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  editorCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
    ...THEME.shadows.soft,
  },
  editorInputsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  editorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  editorInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: THEME.spacing.sm,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
