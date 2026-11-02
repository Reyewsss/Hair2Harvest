// App.tsx
import { Routes, Route, Navigate } from "react-router";
import LoginPage from "../features/auth/components/login-page.tsx";
import AstrixDashboardDemo from "../features/overview/data/demo.tsx";

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
