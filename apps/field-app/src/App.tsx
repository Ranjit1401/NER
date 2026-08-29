import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { RoleSelection } from './pages/RoleSelection';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { OfficerReportIncident } from './pages/OfficerReportIncident';
import { OfficerReports } from './pages/OfficerReports';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverTrip } from './pages/DriverTrip';
import { DriverMap } from './pages/DriverMap';
import { DriverReportProblem } from './pages/DriverReportProblem';
import { DriverEmergency } from './pages/DriverEmergency';
import { DriverProfile } from './pages/DriverProfile';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/officer-dashboard" element={<OfficerDashboard />} />
        <Route path="/officer/report-incident" element={<OfficerReportIncident />} />
        <Route path="/officer/reports" element={<OfficerReports />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/driver/trip" element={<DriverTrip />} />
        <Route path="/driver/map" element={<DriverMap />} />
        <Route path="/driver/report-problem" element={<DriverReportProblem />} />
        <Route path="/driver/emergency" element={<DriverEmergency />} />
        <Route path="/driver/profile" element={<DriverProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
