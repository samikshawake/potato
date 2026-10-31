/**
 * CashCompass Frontend Module Exports
 * Re-exports UI views, inline CSV/PDF uploader, auth screen, and security/legal components.
 */

export { default as CashCompassApp } from '../src/App';
export { AuthScreen } from '../src/components/AuthScreen';
export { InlineStatementUploader } from '../src/components/InlineStatementUploader';
export { AffordabilityPlannerView } from '../src/components/AffordabilityPlannerView';
export { TransactionsAndAnomaliesView } from '../src/components/TransactionsAndAnomaliesView';
export { SecurityAndComplianceView } from '../src/components/SecurityAndComplianceView';
export { LlamaRuntimeView } from '../src/components/LlamaRuntimeView';
export { StatementUploadModal } from '../src/components/StatementUploadModal';
export { CookieConsentBanner } from '../src/components/CookieConsentBanner';
export { LegalDocumentModal } from '../src/components/LegalDocumentModal';
export { MonthlyTrendAndForecastChart, CategoryBreakdownList } from '../src/components/Charts';
