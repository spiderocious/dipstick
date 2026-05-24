import { BRANCH_SEGMENT, ROUTES } from '@dipstick/core';
import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@shared/auth';

// Public auth screens (no shell)
const LoginScreen = lazy(() => import('@features/auth/screen/login-screen.tsx').then((m) => ({ default: m.LoginScreen })));
const RegisterScreen = lazy(() => import('@features/auth/screen/register-screen.tsx').then((m) => ({ default: m.RegisterScreen })));
const VerifyScreen = lazy(() => import('@features/auth/screen/verify-screen.tsx').then((m) => ({ default: m.VerifyScreen })));

// Layouts
const BareLayout = lazy(() => import('@features/shell/screen/bare-layout.tsx').then((m) => ({ default: m.BareLayout })));
const ShellScreen = lazy(() => import('@features/shell/screen/shell-screen.tsx').then((m) => ({ default: m.ShellScreen })));

// Full-width pages (no sidebar): branches list, overview, settings
const BranchesScreen = lazy(() => import('@features/branches/screen/branches-screen.tsx').then((m) => ({ default: m.BranchesScreen })));
const RollupScreen = lazy(() => import('@features/rollup/screen/rollup-screen.tsx').then((m) => ({ default: m.RollupScreen })));
const SettingsScreen = lazy(() => import('@features/settings/screen/settings-screen.tsx').then((m) => ({ default: m.SettingsScreen })));
const OrgSettingsScreen = lazy(() => import('@features/settings/screen/org-settings-screen.tsx').then((m) => ({ default: m.OrgSettingsScreen })));
const RolesScreen = lazy(() => import('@features/roles/screen/roles-screen.tsx').then((m) => ({ default: m.RolesScreen })));

// In-branch screens (under the sidebar shell)
const BranchDetailScreen = lazy(() => import('@features/branches/screen/branch-detail-screen.tsx').then((m) => ({ default: m.BranchDetailScreen })));
const DaybookScreen = lazy(() => import('@features/daybook/screen/daybook-screen.tsx').then((m) => ({ default: m.DaybookScreen })));
const ShiftDetailScreen = lazy(() => import('@features/daybook/screen/shift-detail-screen.tsx').then((m) => ({ default: m.ShiftDetailScreen })));
const DeliveriesScreen = lazy(() => import('@features/deliveries/screen/deliveries-screen.tsx').then((m) => ({ default: m.DeliveriesScreen })));
const DeliveryDetailScreen = lazy(() => import('@features/deliveries/screen/delivery-detail-screen.tsx').then((m) => ({ default: m.DeliveryDetailScreen })));
const PricingScreen = lazy(() => import('@features/pricing/screen/pricing-screen.tsx').then((m) => ({ default: m.PricingScreen })));
const ExpensesScreen = lazy(() => import('@features/expenses/screen/expenses-screen.tsx').then((m) => ({ default: m.ExpensesScreen })));
const StaffScreen = lazy(() => import('@features/staff/screen/staff-screen.tsx').then((m) => ({ default: m.StaffScreen })));
const RosterScreen = lazy(() => import('@features/staff/screen/roster-screen.tsx').then((m) => ({ default: m.RosterScreen })));
const AuditScreen = lazy(() => import('@features/audit/screen/audit-screen.tsx').then((m) => ({ default: m.AuditScreen })));

const PreviewScreen = lazy(() => import('@features/preview/screen/preview-screen.tsx').then((m) => ({ default: m.PreviewScreen })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

const BRANCH_BASE = ROUTES.BRANCH(':branchId');

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path={ROUTES.LOGIN} element={<Lazy><LoginScreen /></Lazy>} />
      <Route path={ROUTES.REGISTER} element={<Lazy><RegisterScreen /></Lazy>} />
      <Route path={ROUTES.VERIFY} element={<Lazy><VerifyScreen /></Lazy>} />
      <Route path={ROUTES.PREVIEW} element={<Lazy><PreviewScreen /></Lazy>} />

      {/* Authed, full-width (no sidebar): branches list is home; overview + settings standalone */}
      <Route
        element={
          <AuthGuard>
            <Lazy>
              <BareLayout />
            </Lazy>
          </AuthGuard>
        }
      >
        <Route path={ROUTES.BRANCHES} element={<Lazy><BranchesScreen /></Lazy>} />
        <Route path={ROUTES.DASHBOARD} element={<Lazy><RollupScreen /></Lazy>} />
        <Route path={ROUTES.SETTINGS} element={<Lazy><SettingsScreen /></Lazy>} />
        <Route path={ROUTES.SETTINGS_ORG} element={<Lazy><OrgSettingsScreen /></Lazy>} />
        <Route path={ROUTES.SETTINGS_ROLES} element={<Lazy><RolesScreen /></Lazy>} />
      </Route>

      {/* Authed, in-branch (sidebar shell) */}
      <Route
        element={
          <AuthGuard>
            <Lazy>
              <ShellScreen />
            </Lazy>
          </AuthGuard>
        }
      >
        <Route path={BRANCH_BASE} element={<Lazy><BranchDetailScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.DAYBOOK}`} element={<Lazy><DaybookScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.SHIFT}`} element={<Lazy><ShiftDetailScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.DELIVERIES}`} element={<Lazy><DeliveriesScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.DELIVERY}`} element={<Lazy><DeliveryDetailScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.PRICING}`} element={<Lazy><PricingScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.EXPENSES}`} element={<Lazy><ExpensesScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.STAFF}`} element={<Lazy><StaffScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.ROSTER}`} element={<Lazy><RosterScreen /></Lazy>} />
        <Route path={`${BRANCH_BASE}/${BRANCH_SEGMENT.AUDIT}`} element={<Lazy><AuditScreen /></Lazy>} />
      </Route>

      {/* Home + unknown → branches list (the new landing) */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.BRANCHES} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.BRANCHES} replace />} />
    </Routes>
  );
}
