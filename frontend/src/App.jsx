import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import AdminLayout from './components/AdminLayout';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CourtsPage from './pages/CourtsPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCourts from './pages/admin/AdminCourts';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPricing from './pages/admin/AdminPricing';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & User routes - with Navbar + Footer + BottomNav */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/courts" element={<CourtsPage />} />
                    <Route path="/book/:courtId" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
                    <Route path="/my-bookings" element={<PrivateRoute><MyBookingsPage /></PrivateRoute>} />
                  </Routes>
                </main>
                <Footer />
                <BottomNav />
              </div>
            }
          />

          {/* Admin routes - with AdminLayout (sidebar) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="courts" element={<AdminCourts />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#0D9D57', secondary: 'white' },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
