import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Calculator,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { MascotAvatar } from '../components/MascotAvatar';
import { queryLocalAssistant, AssistantMessage } from '../services/assistantEngine';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { llamaClient } from '../../../src/ml/llamaClient';

export default function AssistantScreen() {
  const router = useRouter();
  const { user, transactions, totalBalance, modelStatus } = useFinance();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputQuery, setInputQuery] = useState('');

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      timestamp: '10:00 AM',
      text: `Hey ${
        user?.fullName || 'Parth'
      }! I'm Finny, your offline personal finance assistant powered by the on-device Llama + SentencePiece tokenizer engine and deterministic cash-flow math.`,
      calculationCard: {
        title: 'Ready for Explainable Analysis',
        metrics: [
          { label: 'Tracked Balance', value: formatINR(totalBalance) },
          { label: 'Local Transactions', value: `${transactions.length} items` },
        ],
        verdict: 'Ask me anything about affordability, recurring bills, or spending trends.',
      },
      suggestedQuestions: [
        'Can I afford a laptop next month?',
        'Where did my money go?',
        'What are my recurring payments?',
        'Why did my spending increase?',
        'How much can I save?',
      ],
    },
  ]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg: AssistantMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query,
    };

    const intent = await llamaClient.parsePlanIntent(query);
    const reply = queryLocalAssistant(query, transactions, totalBalance);
    if (reply.calculationCard) {
      reply.calculationCard.explanation = `${reply.calculationCard.explanation || ''} [Tokenized ${
        intent.tokensEncoded
      } subwords in ${intent.inferenceMs}ms via ${modelStatus.fileName}]`.trim();
    }

    setMessages((prev) => [...prev, userMsg, reply]);
    setInputQuery('');

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
        <View style={styles.headerCenter}>
          <MascotAvatar size={34} showShades={true} />
          <View>
            <Text style={styles.headerTitle}>CashCompass AI Assistant</Text>
            <View style={styles.offlineRow}>
              <View style={styles.greenDot} />
              <Text style={styles.offlineText}>100% On-Device Engine</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  isUser ? styles.userWrapper : styles.assistantWrapper,
                ]}
              >
                {!isUser && (
                  <View style={styles.assistantAvatar}>
                    <MascotAvatar size={28} showShades={true} />
                  </View>
                )}

                <View style={styles.bubbleContainer}>
                  {/* Text Bubble */}
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userText : styles.assistantText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        styles.timestampText,
                        isUser ? styles.userTimestamp : styles.assistantTimestamp,
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>

                  {/* Calculation Card if assistant replied with math */}
                  {msg.calculationCard && (
                    <View style={styles.calcCard}>
                      <View style={styles.calcHeader}>
                        <Calculator size={14} color={THEME.colors.primary} />
                        <Text style={styles.calcTitle}>
                          {msg.calculationCard.title}
                        </Text>
                      </View>

                      <View style={styles.metricsGrid}>
                        {msg.calculationCard.metrics.map((m, idx) => (
                          <View key={idx} style={styles.metricItem}>
                            <Text style={styles.metricLabel}>{m.label}</Text>
                            <Text
                              style={[
                                styles.metricVal,
                                m.isHighlight && { color: THEME.colors.primary, fontWeight: '800' },
                              ]}
                            >
                              {m.value}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {msg.calculationCard.verdict && (
                        <View style={styles.verdictBox}>
                          <Text style={styles.verdictText}>
                            {msg.calculationCard.verdict}
                          </Text>
                        </View>
                      )}

                      {msg.calculationCard.explanation && (
                        <Text style={styles.calcExplanation}>
                          {msg.calculationCard.explanation}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Suggested Question Chips (Assistant prompts) */}
                  {msg.suggestedQuestions && (
                    <View style={styles.suggestedQuestionsBox}>
                      <Text style={styles.suggestedTitle}>Suggested Questions:</Text>
                      <View style={styles.chipsWrap}>
                        {msg.suggestedQuestions.map((q, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionChip}
                            onPress={() => handleSendMessage(q)}
                            activeOpacity={0.7}
                          >
                            <Sparkles size={12} color={THEME.colors.primary} />
                            <Text style={styles.suggestionChipText}>{q}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Dock */}
        <View style={styles.inputDock}>
          <TextInput
            style={styles.dockInput}
            placeholder="Ask: 'Can I afford a laptop next month?'..."
            placeholderTextColor={THEME.colors.textMuted}
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputQuery.trim() && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputQuery.trim()}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="assistant" onSelectTab={handleNavChange} />
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
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.card,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.base,
    paddingBottom: 24,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.base,
    gap: 8,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    marginTop: 4,
  },
  bubbleContainer: {
    maxWidth: '85%',
  },
  bubble: {
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: THEME.colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  messageText: {
    fontSize: THEME.typography.sizes.xs,
    lineHeight: 20,
  },
  userText: {
    color: '#FFF',
    fontWeight: '500',
  },
  assistantText: {
    color: THEME.colors.textPrimary,
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  assistantTimestamp: {
    color: THEME.colors.textMuted,
  },
  calcCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    ...THEME.shadows.card,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  calcTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  metricsGrid: {
    gap: 4,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  metricVal: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  verdictBox: {
    backgroundColor: THEME.colors.background,
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  verdictText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primaryDark,
  },
  calcExplanation: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  suggestedQuestionsBox: {
    marginTop: 10,
  },
  suggestedTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  suggestionChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  inputDock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 8,
  },
  dockInput: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.soft,
  },
  sendBtnDisabled: {
    backgroundColor: '#C8B5F9',
  },
});
