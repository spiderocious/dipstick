import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ROUTES } from '@dipstick/core';

import { HomeScreen } from '@features/home/home-screen.tsx';

const PreviewScreen = lazy(() =>
  import('@features/preview/screen/preview-screen.tsx').then((m) => ({
    default: m.PreviewScreen,
  })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<HomeScreen />} />
      <Route
        path={ROUTES.PREVIEW}
        element={
          <Suspense fallback={null}>
            <PreviewScreen />
          </Suspense>
        }
      />
      <Route path="*" element={<HomeScreen />} />
    </Routes>
  );
}
