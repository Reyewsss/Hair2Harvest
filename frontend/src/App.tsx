// App.tsx
import { Routes, Route, Navigate } from "react-router";
import LoginPage from "./pages/auth/login-page.tsx";
import AstrixDashboardDemo from "./components/watermelon/astrix-dashboard/demo";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard/*" element={<AstrixDashboardDemo />} />
    </Routes>
  );
};

export default App;
