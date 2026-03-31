import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// Import Modules
import KanwilManager from "./pages/modules/KanwilManager";
import TechnicianManager from "./pages/modules/TechnicianManager";
import AssetInventory from "./pages/modules/AssetInventory";
import MaintenanceTracker from "./pages/modules/MaintenanceTracker";

// Simple Protected Route Component
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Layout>{() => <Dashboard />}</Layout></ProtectedRoute>} />
      
      {/* 4 Core Maintenance Modules */}
      <Route path="/kanwil" element={<ProtectedRoute><Layout>{() => <KanwilManager />}</Layout></ProtectedRoute>} />
      <Route path="/technicians" element={<ProtectedRoute><Layout>{() => <TechnicianManager />}</Layout></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Layout>{() => <AssetInventory />}</Layout></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><Layout>{() => <MaintenanceTracker />}</Layout></ProtectedRoute>} />

      <Route path="*" element={<h1>404 Halaman Tidak Ditemukan</h1>} />
    </Routes>
  );
}

