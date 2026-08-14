import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueueHistoryBridge } from "./components/QueueHistoryBridge";
import { AppLayout } from "./layouts/AppLayout";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmptyPage } from "./pages/EmptyPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { QueuePage } from "./pages/QueuePage";
import { SchedulerPage } from "./pages/SchedulerPage";
import { SettingsPage } from "./pages/SettingsPage";
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
            <Route path={ROUTES.queue} element={<QueuePage />} />
            <Route path={ROUTES.history} element={<HistoryPage />} />
            <Route path={ROUTES.favorites} element={<FavoritesPage />} />
            <Route path={ROUTES.scheduler} element={<SchedulerPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route path={ROUTES.about} element={<AboutPage />} />
            <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <QueueHistoryBridge />
      <Toaster richColors closeButton />
    </ErrorBoundary>
  );
}
