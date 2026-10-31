import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ExpoRouterProvider, usePathname } from './shims/expo-router';
import { registerAlertListener } from './shims/react-native';
import { FinanceProvider, useFinance } from '../FRONTEND/src/context/FinanceContext';
import { MascotAvatar } from '../FRONTEND/src/components/MascotAvatar';
import {
  LegalPolicyModal,
  CookieConsentBanner,
} from '../FRONTEND/src/components/LegalComplianceModal';

// Original CashCompass Screens + Auth & Security Screens
import HomeScreen from '../FRONTEND/src/app/index';
import TransactionsScreen from '../FRONTEND/src/app/transactions';
import SimulatorScreen from '../FRONTEND/src/app/simulator';
import InsightsScreen from '../FRONTEND/src/app/insights';
import AssistantScreen from '../FRONTEND/src/app/assistant';
import AnomaliesScreen from '../FRONTEND/src/app/anomalies';
import RecurringScreen from '../FRONTEND/src/app/recurring';
import GoalsScreen from '../FRONTEND/src/app/goals';
import AnalysisScreen from '../FRONTEND/src/app/analysis';
import SettingsScreen from '../FRONTEND/src/app/settings';
import OnboardingScreen from '../FRONTEND/src/app/onboarding';
import AuthScreen from '../FRONTEND/src/app/auth';
import SecurityComplianceScreen from '../FRONTEND/src/app/security';
import SmartRadarScreen from '../FRONTEND/src/app/smart-radar';

interface AlertState {
  title: string;
  message?: string;
  buttons?: { text?: string; onPress?: () => void; style?: string }[];
}

const InAppAlertDialog: React.FC = () => {
  const [alertData, setAlertData] = useState<AlertState | null>(null);

  useEffect(() => {
    registerAlertListener((payload) => {
      setAlertData(payload);
    });
    return () => registerAlertListener(null);
  }, []);

  useEffect(() => {
    if (!alertData) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertData(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alertData]);

  if (!alertData) return null;

  const actions =
    alertData.buttons && alertData.buttons.length > 0
      ? alertData.buttons
      : [{ text: 'OK' }];

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cc-alert-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#171725]/55 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAlertData(null);
      }}
    >
      <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-xl border border-[#ECEAF3]">
        <h3 id="cc-alert-title" className="text-base font-bold text-[#171725]">
          {alertData.title}
        </h3>
        {alertData.message && (
          <p className="mt-2 text-xs leading-relaxed text-[#6E6D7A] whitespace-pre-line">
            {alertData.message}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          {actions.map((btn, idx) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAlertData(null);
                  btn.onPress?.();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-opacity active:opacity-80 ${
                  isDestructive
                    ? 'bg-[#EF4444] text-white'
                    : isCancel
                    ? 'bg-[#F0EAFE] text-[#7654E8]'
                    : 'bg-[#7654E8] text-white'
                }`}
              >
                {btn.text || 'OK'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CashCompassViewport: React.FC = () => {
  const { user, authReady } = useFinance();
  const pathname = usePathname();

  if (!authReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F6FC] px-6 text-center">
        <MascotAvatar mood="happy" size={68} />
        <p className="mt-4 text-sm font-bold text-[#171725]">CashCompass</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#F7F6FC]">
        <div className="flex-1 flex flex-col min-h-0">
          <AuthScreen />
        </div>
        <CookieConsentBanner />
        <LegalPolicyModal />
        <InAppAlertDialog />
      </div>
    );
  }

  const renderActiveRoute = () => {
    switch (pathname) {
      case '/':
        return <HomeScreen />;
      case '/transactions':
        return <TransactionsScreen />;
      case '/simulator':
        return <SimulatorScreen />;
      case '/insights':
        return <InsightsScreen />;
      case '/assistant':
        return <AssistantScreen />;
      case '/anomalies':
        return <AnomaliesScreen />;
      case '/recurring':
        return <RecurringScreen />;
      case '/goals':
        return <GoalsScreen />;
      case '/analysis':
        return <AnalysisScreen />;
      case '/settings':
        return <SettingsScreen />;
      case '/security':
        return <SecurityComplianceScreen />;
      case '/smart-radar':
        return <SmartRadarScreen />;
      case '/onboarding':
        return <OnboardingScreen />;
      case '/auth':
        return <AuthScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div
      id="main-workspace"
      className="flex-1 flex flex-col min-h-0 relative bg-[#F7F6FC]"
    >
      <div className="flex-1 flex flex-col min-h-0">{renderActiveRoute()}</div>
      <CookieConsentBanner />
      <LegalPolicyModal />
      <InAppAlertDialog />
    </div>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <ExpoRouterProvider initialRoute="/">
          <div className="min-h-dvh w-full bg-[#ECEAF6] flex justify-center">
            <a
              href="#main-workspace"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#7654E8] focus:text-white focus:text-xs focus:font-bold"
            >
              Skip to main content
            </a>
            <main className="w-full sm:max-w-[460px] h-dvh bg-[#F7F6FC] sm:shadow-2xl sm:border-x sm:border-[#E2DFF0] relative overflow-hidden flex flex-col">
              <CashCompassViewport />
            </main>
          </div>
        </ExpoRouterProvider>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
