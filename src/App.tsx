import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccessDeniedPage } from './features/access-denied/AccessDeniedPage';
import { AcceptInvitationPage } from './features/auth/AcceptInvitationPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { BrainPage } from './features/brain/BrainPage';
import { ContentPage } from './features/content/ContentPage';
import { EnquiriesPage } from './features/enquiries/EnquiriesPage';
import { FeaturePlaceholder } from './features/FeaturePlaceholder';
import { InboxPage } from './features/inbox/InboxPage';
import { IntegrationsPage } from './features/integrations/IntegrationsPage';
import { JourneyPage } from './features/journey/JourneyPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { PrivacyPolicyPage } from './features/legal/PrivacyPolicyPage';
import { PropertiesPage } from './features/properties/PropertiesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ReviewsPage } from './features/reviews/ReviewsPage';
import { ScannerPage } from './features/scanner/ScannerPage';
import { TasksPage } from './features/tasks/TasksPage';
import { TeamPage } from './features/team/TeamPage';
import { TermsOfServicePage } from './features/legal/TermsOfServicePage';
import { ToastProvider } from './components/ui/Toast';
import { paths } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <Routes>
            <Route path={paths.signIn} element={<SignInPage />} />
            <Route path={paths.signUp} element={<SignUpPage />} />
            <Route
              path={paths.forgotPassword}
              element={<ForgotPasswordPage />}
            />
            <Route
              path={paths.resetPassword}
              element={<ResetPasswordPage />}
            />
            <Route
              path={paths.acceptInvitation}
              element={<AcceptInvitationPage />}
            />
            <Route path={paths.onboarding} element={<OnboardingPage />} />
            <Route path={paths.accessDenied} element={<AccessDeniedPage />} />
            <Route path={paths.termsOfService} element={<TermsOfServicePage />} />
            <Route path={paths.privacyPolicy} element={<PrivacyPolicyPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route
                  path={paths.properties}
                  element={<PropertiesPage />}
                />
                <Route
                  path={paths.scanner}
                  element={<ScannerPage />}
                />
                <Route
                  path={paths.enquiries}
                  element={<EnquiriesPage />}
                />
                <Route
                  path={paths.inbox}
                  element={<InboxPage />}
                />
                <Route
                  path={paths.brain}
                  element={<BrainPage />}
                />
                <Route path={paths.tasks} element={<TasksPage />} />
                <Route path={paths.journey} element={<JourneyPage />} />
                <Route path={paths.reviews} element={<ReviewsPage />} />
                <Route path={paths.content} element={<ContentPage />} />
                <Route path={paths.reports} element={<ReportsPage />} />
                <Route path={paths.integrations} element={<IntegrationsPage />} />
                <Route path={paths.team} element={<TeamPage />} />
                <Route
                  path={paths.settings}
                  element={
                    <FeaturePlaceholder
                      title="Settings"
                      description="Organization settings and workspace preferences."
                      screenIds={['AG-SETTINGS', 'AG-AUDIT-LOG']}
                    />
                  }
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to={paths.overview} replace />} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
