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
import { FeaturePlaceholder } from './features/FeaturePlaceholder';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { OverviewPage } from './features/overview/OverviewPage';
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
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route
                  path={paths.properties}
                  element={
                    <FeaturePlaceholder
                      title="Properties"
                      description="Property profiles, team assignment, archive workflow, and audit trail."
                      screenIds={['AG-PROPERTIES', 'AG-PROPERTY-DETAIL', 'AG-PROPERTY-CREATE', 'AG-PROPERTY-EDIT']}
                    />
                  }
                />
                <Route
                  path={paths.scanner}
                  element={
                    <FeaturePlaceholder
                      title="Guesthouse Scanner"
                      description="Scanner runs, findings with source, severity, confidence, and recommended actions."
                      screenIds={['AG-SCANNER', 'AG-SCANNER-RUN', 'AG-SCANNER-FINDINGS']}
                    />
                  }
                />
                <Route
                  path={paths.enquiries}
                  element={
                    <FeaturePlaceholder
                      title="Enquiries"
                      description="Enquiry records with classification, assignment, status, follow-up, and outcome."
                      screenIds={['AG-ENQUIRIES', 'AG-ENQUIRY-DETAIL']}
                    />
                  }
                />
                <Route
                  path={paths.inbox}
                  element={
                    <FeaturePlaceholder
                      title="Inbox"
                      description="Conversation timelines with drafts, approvals, human messages, and delivery results."
                      screenIds={['AG-INBOX', 'AG-CONVERSATION']}
                    />
                  }
                />
                <Route
                  path={paths.brain}
                  element={
                    <FeaturePlaceholder
                      title="Property Brain"
                      description="Versioned, verified knowledge facts grounded per property with review workflow."
                      screenIds={['AG-BRAIN', 'AG-KNOWLEDGE-ITEM']}
                    />
                  }
                />
                <Route
                  path={paths.tasks}
                  element={
                    <FeaturePlaceholder
                      title="Tasks"
                      description="Assigned work with due dates, comments, completion evidence, and overdue state."
                      screenIds={['AG-TASKS', 'AG-TASK-DETAIL']}
                    />
                  }
                />
                <Route
                  path={paths.journey}
                  element={
                    <FeaturePlaceholder
                      title="Guest Journey"
                      description="Journey event timeline. Automated messages stay disabled until configured and approved."
                      screenIds={['AG-JOURNEY']}
                    />
                  }
                />
                <Route
                  path={paths.reviews}
                  element={
                    <FeaturePlaceholder
                      title="Reviews"
                      description="Review tracking with response drafts that require approval before publication."
                      screenIds={['AG-REVIEWS', 'AG-REVIEW-RESPONSE']}
                    />
                  }
                />
                <Route
                  path={paths.content}
                  element={
                    <FeaturePlaceholder
                      title="Content"
                      description="Content calendar with draft, review, approved, published, and failed states."
                      screenIds={['AG-CONTENT']}
                    />
                  }
                />
                <Route
                  path={paths.reports}
                  element={
                    <FeaturePlaceholder
                      title="Reports"
                      description="Defined metrics with documented calculations and permission-checked exports."
                      screenIds={['AG-REPORTS', 'AG-EXPORT']}
                    />
                  }
                />
                <Route
                  path={paths.integrations}
                  element={
                    <FeaturePlaceholder
                      title="Integrations"
                      description="Integration registry with honest health states. Manual and CSV workflows first."
                      screenIds={['AG-INTEGRATIONS']}
                    />
                  }
                />
                <Route
                  path={paths.team}
                  element={
                    <FeaturePlaceholder
                      title="Team & Access"
                      description="Members, invitations, roles, property assignments, and revocation."
                      screenIds={['AG-TEAM', 'AG-INVITATIONS']}
                    />
                  }
                />
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
