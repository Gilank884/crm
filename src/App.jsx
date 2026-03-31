// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";

// Import Modules
import KanwilManager from "./pages/modules/KanwilManager";
import TechnicianManager from "./pages/modules/TechnicianManager";
import AssetInventory from "./pages/modules/AssetInventory";
import MaintenanceTracker from "./pages/modules/MaintenanceTracker";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Layout>{() => <Dashboard />}</Layout>} />
      
      {/* 4 Core Maintenance Modules */}
      <Route path="/kanwil" element={<Layout>{() => <KanwilManager />}</Layout>} />
      <Route path="/technicians" element={<Layout>{() => <TechnicianManager />}</Layout>} />
      <Route path="/assets" element={<Layout>{() => <AssetInventory />}</Layout>} />
      <Route path="/maintenance" element={<Layout>{() => <MaintenanceTracker />}</Layout>} />

      <Route path="*" element={<h1>404 Halaman Tidak Ditemukan</h1>} />
    </Routes>
  );
}

