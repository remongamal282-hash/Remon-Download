import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmptyPage } from "./pages/EmptyPage";
import { initializeSettings } from "./stores/settingsStore";
import { ROUTES } from "./constants/routes";

export function App() {
  useEffect(() => {
    initializeSettings();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.queue} element={<EmptyPage pageKey="queue" />} />
            <Route path={ROUTES.history} element={<EmptyPage pageKey="history" />} />
            <Route path={ROUTES.favorites} element={<EmptyPage pageKey="favorites" />} />
            <Route path={ROUTES.scheduler} element={<EmptyPage pageKey="scheduler" />} />
            <Route path={ROUTES.settings} element={<EmptyPage pageKey="settings" />} />
            <Route path={ROUTES.about} element={<AboutPage />} />
            <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors closeButton />
    </ErrorBoundary>
  );
}
