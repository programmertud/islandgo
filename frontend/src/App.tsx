import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import AgencyPortal from './pages/AgencyPortal';
import CustomerPortal from './pages/CustomerPortal';
import SuperAdminPortal from './pages/SuperAdminPortal';
import ToursCatalog from './pages/ToursCatalog';
import TourDetails from './pages/TourDetails';
import TrackBooking from './pages/TrackBooking';
import { AuthProvider } from './context/AuthContext';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Packages from './pages/Packages';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import CustomerLayout from './layouts/CustomerLayout';
import CustomerBookings from './pages/CustomerBookings';
import CustomerPackages from './pages/CustomerPackages';
import CustomerTourDetails from './pages/CustomerTourDetails';
import CustomerNotifications from './pages/CustomerNotifications';
import ProfileSettings from './pages/ProfileSettings';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/tours" element={<ToursCatalog />} />
              <Route path="/tours/:id" element={<TourDetails />} />
              <Route path="/track" element={<TrackBooking />} />
            </Route>

            {/* Customer Routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="/customer/dashboard" element={<CustomerPortal />} />
              <Route path="/customer/packages" element={<CustomerPackages />} />
              <Route path="/customer/packages/:id" element={<CustomerTourDetails />} />
              <Route path="/customer/bookings" element={<CustomerBookings />} />
              <Route path="/customer/notifications" element={<CustomerNotifications />} />
              <Route path="/customer/settings" element={<ProfileSettings />} />
            </Route>

            {/* Admin / Agency Routes (Protected) */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<ProfileSettings />} />
              {/* Keep old portals for fallback or transition if needed */}
              <Route path="/agency" element={<AgencyPortal />} />
              <Route path="/admin" element={<SuperAdminPortal />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
