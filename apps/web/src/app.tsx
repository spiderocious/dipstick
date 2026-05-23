import { AppProviders } from './app.provider.tsx';
import { AppRoutes } from './app.routes.tsx';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
