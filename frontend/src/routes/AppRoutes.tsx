import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { RoleRoute } from './RoleRoute';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { FacultyLayout } from '../layouts/FacultyLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Auth Pages
import { LoginPage, UnauthorizedPage, NotFoundPage } from '../pages/auth';

// Student Pages
import {
  StudentDashboard,
  LabSearchPage,
  LabDetailsPage,
  CreateBookingPage,
  MyBookingsPage,
  BookingDetailsPage,
  CampusRoutePage,
  ProfilePage,
} from '../pages/student';

// Faculty Pages
import { FacultyDashboard } from '../pages/faculty';

// Admin Pages
import {
  AdminDashboard,
  AdminLabListPage,
  AdminLabDetailsPage,
  AdminResourceListPage,
  AddResourcePage,
  AdminResourceDetailsPage,
  AdminMaintenanceListPage,
  AdminAllBookingsPage,
  AdminMonitoringPage,
  AdminReportsPage,
} from '../pages/admin';

export const AppRoutes: React.FC = () => {
  const { role, isAuthenticated } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'faculty') return '/faculty/dashboard';
    return '/student/dashboard';
  };

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />

      {/* Public Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* STUDENT ROUTES */}
      <Route
        path="/student"
        element={
          <RoleRoute allowedRoles={['student']}>
            <StudentLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="labs" element={<LabSearchPage />} />
        <Route path="labs/:labId" element={<LabDetailsPage />} />
        <Route path="bookings/create" element={<CreateBookingPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="route/:bookingId" element={<CampusRoutePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* FACULTY ROUTES */}
      <Route
        path="/faculty"
        element={
          <RoleRoute allowedRoles={['faculty']}>
            <FacultyLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="labs" element={<LabSearchPage />} />
        <Route path="labs/:labId" element={<LabDetailsPage />} />
        <Route path="bookings/create" element={<CreateBookingPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="route/:bookingId" element={<CampusRoutePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={['admin']}>
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="labs" element={<AdminLabListPage />} />
        <Route path="labs/:labId" element={<AdminLabDetailsPage />} />
        <Route path="resources" element={<AdminResourceListPage />} />
        <Route path="resources/create" element={<AddResourcePage />} />
        <Route path="resources/add" element={<AddResourcePage />} />
        <Route path="resources/:resourceId" element={<AdminResourceDetailsPage />} />
        <Route path="maintenance" element={<AdminMaintenanceListPage />} />
        <Route path="bookings" element={<AdminAllBookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="route/:bookingId" element={<CampusRoutePage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
