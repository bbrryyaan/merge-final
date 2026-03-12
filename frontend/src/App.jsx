import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import BudgetLayout from "./pages/budget/BudgetLayout";
import BudgetOverviewPage from "./pages/budget/BudgetOverviewPage";
import BudgetCalendarPage from "./pages/budget/BudgetCalendarPage";
import BudgetTransactionsPage from "./pages/budget/BudgetTransactionsPage";
import BudgetAffordabilityPage from "./pages/budget/BudgetAffordabilityPage";
import MoneyBuddyPage from "./pages/MoneyBuddy/MoneyBuddyPage";
import CoursesPage from "./pages/Courses/CoursesPage";
import FutureSimulatorPage from "./pages/FutureSimulator/FutureSimulatorPage";
import SubscriptionRadarPage from "./pages/SubscriptionRadar/SubscriptionRadarPage";
import AnalysisPage from "./pages/budget/AnalysisPage"; //$$$$$$
import SettingsPage from "./pages/budget/SettingsPage";
import { useAuth } from "./context/useAuth";
import CampusSplitterPage from "./pages/CampusSplitter/CampusSplitterPage";
import SystemDocsPage from "./pages/SystemDocs/SystemDocsPage";
import MapFeaturePage from "./pages/MapFeature/MapFeaturePage";
import NetBalancePrompt from "./components/NetBalancePrompt";

const FullScreenLoader = () => (
  <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-4 border-indigo-500/40 border-t-indigo-400 animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if ((user.netBalance === undefined || user.netBalance === null) && 
      (user.cashBalance === undefined || user.cashBalance === null) &&
      (user.savingsBalance === undefined || user.savingsBalance === null)) {
    return <NetBalancePrompt />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <FullScreenLoader />;
  }

  return isAuthenticated ? <Navigate to="/dashboard/overview" replace /> : children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <BudgetLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<BudgetOverviewPage />} />
          <Route path="campus-split" element={<CampusSplitterPage />} />
          <Route path="analysis" element={<AnalysisPage />} /> 
          <Route path="affordability" element={<BudgetAffordabilityPage />} />
          <Route path="moneybuddy" element={<MoneyBuddyPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="simulator" element={<FutureSimulatorPage />} />
          <Route path="trends" element={<SubscriptionRadarPage />} />
          <Route path="calendar" element={<BudgetCalendarPage />} />
          <Route path="transactions" element={<BudgetTransactionsPage />} />
          <Route path="system-logic" element={<SystemDocsPage />} />
          <Route path="map" element={<MapFeaturePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
