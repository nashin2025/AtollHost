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
import { KnowledgeEditorPage } from './features/brain/KnowledgeEditorPage';
import { ContentPage, ContentEditorPageWrapper } from './features/content/ContentPage';
import { EnquiriesPage, EnquiryDetailPageWrapper } from './features/enquiries/EnquiriesPage';
import { InboxPage } from './features/inbox/InboxPage';
import { IntegrationsPage } from './features/integrations/IntegrationsPage';
import { JourneyPage, JourneyDetailPageWrapper } from './features/journey/JourneyPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { AutomationsPage } from './features/automations/AutomationsPage';
import { OwnerPortalPage, OwnerWrapper, OwnerGuestPage, OwnerGuestDetailPageWrapper, OwnerReservationPage, OwnerReservationDetailPageWrapper, OwnerJourneyPage, OwnerBrainPage, OwnerKnowledgeApprovalPage, OwnerPropertyPage, OwnerPropertySettingsPageWrapper, OwnerIntegrationsPage, OwnerTeamPage } from './features/owner/OwnerPortalPage';
import { OwnerEnquiriesPage } from './features/owner/OwnerEnquiriesPage';
import { OwnerInboxPage } from './features/owner/OwnerInboxPage';
import { OwnerTasksPage } from './features/owner/OwnerTasksPage';
import { OwnerReviewsPage } from './features/owner/OwnerReviewsPage';
import { OwnerContentPage } from './features/owner/OwnerContentPage';
import { OwnerReportsPage } from './features/owner/OwnerReportsPage';
import { DashboardPage } from './features/overview/DashboardPage';
import { PrivacyPolicyPage } from './features/legal/PrivacyPolicyPage';
import { PropertiesPage, PropertyDetailPageWrapper, OnboardingChecklistPageWrapper } from './features/properties/PropertiesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ReviewsPage } from './features/reviews/ReviewsPage';
import { ScannerPage, ScannerSetupPage } from './features/scanner/ScannerPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TasksPage, TaskDetailPageWrapper } from './features/tasks/TasksPage';
import { TeamPage } from './features/team/TeamPage';
import { TermsOfServicePage } from './features/legal/TermsOfServicePage';
import { ToastProvider } from './components/ui/Toast';
import { GuestsPage, GuestDetailPageWrapper } from './features/guests/GuestsPage';
import { ReservationsPage, ReservationDetailPageWrapper } from './features/reservations/ReservationsPage';
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
                <Route index element={<DashboardPage />} />
                <Route
                  path={paths.properties}
                  element={<PropertiesPage />}
                />
                <Route
                  path={paths.propertyDetail}
                  element={<PropertyDetailPageWrapper />}
                />
                <Route
                  path={paths.propertyChecklist}
                  element={<OnboardingChecklistPageWrapper />}
                />
                <Route
                  path={paths.scanner}
                  element={<ScannerPage />}
                />
                <Route
                  path={paths.scannerSetup}
                  element={<ScannerSetupPage />}
                />
                <Route
                  path={paths.enquiries}
                  element={<EnquiriesPage />}
                />
                <Route
                  path={paths.enquiryDetail}
                  element={<EnquiryDetailPageWrapper />}
                />
                <Route
                  path={paths.inbox}
                  element={<InboxPage />}
                />
                <Route
                  path={paths.brain}
                  element={<BrainPage />}
                />
                <Route
                  path={paths.brainEditor}
                  element={<KnowledgeEditorPage />}
                />
                <Route path={paths.tasks} element={<TasksPage />} />
                <Route
                  path={paths.taskDetail}
                  element={<TaskDetailPageWrapper />}
                />
                <Route path={paths.journey} element={<JourneyPage />} />
                <Route
                  path={paths.journeyDetail}
                  element={<JourneyDetailPageWrapper />}
                />
                <Route path={paths.reviews} element={<ReviewsPage />} />
                <Route path={paths.content} element={<ContentPage />} />
                <Route
                  path={paths.contentEditor}
                  element={<ContentEditorPageWrapper />}
                />
                <Route path={paths.reports} element={<ReportsPage />} />
                <Route path={paths.integrations} element={<IntegrationsPage />} />
                <Route path={paths.team} element={<TeamPage />} />
                <Route path={paths.settings} element={<SettingsPage />} />
                <Route path={paths.guests} element={<GuestsPage />} />
                <Route
                  path={paths.guestDetail}
                  element={<GuestDetailPageWrapper />}
                />
                <Route path={paths.reservations} element={<ReservationsPage />} />
                <Route
                  path={paths.reservationDetail}
                  element={<ReservationDetailPageWrapper />}
                />
                <Route path={paths.automations} element={<AutomationsPage />} />
              </Route>
              <Route element={<OwnerWrapper />}>
                <Route path={paths.owner} element={<OwnerPortalPage />} />
                <Route path={paths.ownerEnquiries} element={<OwnerEnquiriesPage />} />
                <Route path={paths.ownerInbox} element={<OwnerInboxPage />} />
                <Route path={paths.ownerTasks} element={<OwnerTasksPage />} />
                <Route path={paths.ownerReviews} element={<OwnerReviewsPage />} />
                <Route path={paths.ownerContent} element={<OwnerContentPage />} />
                <Route path={paths.ownerReports} element={<OwnerReportsPage />} />
                <Route path={paths.ownerGuests} element={<OwnerGuestPage />} />
                <Route
                  path={paths.ownerGuestDetail}
                  element={<OwnerGuestDetailPageWrapper />}
                />
                <Route path={paths.ownerReservations} element={<OwnerReservationPage />} />
                <Route
                  path={paths.ownerReservationDetail}
                  element={<OwnerReservationDetailPageWrapper />}
                />
                <Route path={paths.ownerJourney} element={<OwnerJourneyPage />} />
                <Route path={paths.ownerBrain} element={<OwnerBrainPage />} />
                <Route path={paths.ownerKnowledgeApproval} element={<OwnerKnowledgeApprovalPage />} />
                <Route path={paths.ownerProperties} element={<OwnerPropertyPage />} />
                <Route
                  path={paths.ownerPropertySettings}
                  element={<OwnerPropertySettingsPageWrapper />}
                />
                <Route path={paths.ownerIntegrations} element={<OwnerIntegrationsPage />} />
                <Route path={paths.ownerTeam} element={<OwnerTeamPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to={paths.overview} replace />} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
