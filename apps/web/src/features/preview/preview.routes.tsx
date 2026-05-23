import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@dipstick/core';

const PreviewScreen = lazy(() =>
  import('./screen/preview-screen.tsx').then((m) => ({ default: m.PreviewScreen })),
);

// Dev-facing design-system storybook for @dipstick/ui. Registered standalone in
// app.routes.tsx; this object is the canonical definition if routes move to a
// RouteObject tree later.
export const previewRoutes: RouteObject = {
  path: ROUTES.PREVIEW,
  Component: PreviewScreen,
};
