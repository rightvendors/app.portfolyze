// src/routes/index.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../App';
import MobileAuthForm from '../components/MobileAuthForm';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/auth" element={<MobileAuthForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
