import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { POSPage } from "./pages/POSPage";
import { InventoryPage } from "./pages/InventoryPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { BehaviorPage } from "./pages/BehaviorPage";
import { QueuePage } from "./pages/QueuePage";
import { ForecastPage } from "./pages/ForecastPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: () => <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: DashboardPage },
      { path: "pos", Component: POSPage },
      { path: "transactions", Component: TransactionsPage },
      { path: "inventory", Component: InventoryPage },
      { path: "alerts", Component: AlertsPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "customers", Component: CustomersPage },
      { path: "behavior", Component: BehaviorPage },
      { path: "queue", Component: QueuePage },
      { path: "forecast", Component: ForecastPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);