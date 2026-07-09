import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { LicenseGate } from '@/components/LicenseGate';
import { AppKeyGate } from '@/components/AppKeyGate';
import { routes } from './routes';

const App: React.FC = () => {
  // routes array එකෙන් පරණ මුල් පිටුව ("/") තියෙන Route එක අයින් කරනවා
  const filteredRoutes = routes.filter(route => route.path !== '/');

  return (
    <Router>
      <AuthProvider>
        {/* AppKeyGate is inside Router+AuthProvider so it can auto-login and navigate */}
        <AppKeyGate>
          <RouteGuard>
            <LicenseGate>
              <IntersectObserver />
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">
                  <Routes>
                    {/* මුල් පිටුවට ("/") ආපු ගමන් කෙලින්ම Billing පිටුවට Redirect කරනවා */}
                    <Route path="/" element={<Navigate to="/billing" replace />} />
                    
                    {/* ඉතිරි සියලුම POS පිටු (Billing, Products, Login ආදිය) සාමාන්‍ය පරිදි ලෝඩ් වෙනවා */}
                    {filteredRoutes.map((route, index) => (
                      <Route
                        key={index}
                        path={route.path}
                        element={route.element}
                      />
                    ))}
                    
                    {/* වැරදි ලින්ක් එකක් ගැහුවොත් Login පිටුවට යනවා */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </main>
              </div>
              <Toaster />
            </LicenseGate>
          </RouteGuard>
        </AppKeyGate>
      </AuthProvider>
    </Router>
  );
};
