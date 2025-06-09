import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Index from "./pages/Index";
import Scene from "./pages/Scene";
import NotFound from "./pages/NotFound";
import Mobile from "./pages/Mobile";
import { GlobalIframe, CocosProvider } from "./components/CocosEmbed";
import LoadingScreen from "./components/LoadingScreen";
import useIsMobile from './hooks/useIsMobile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityGuidelines from './pages/CommunityGuidelines';

const queryClient = new QueryClient();

const AppRoutes: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Routes>
        <Route path="*" element={<Mobile />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* LoadingScreen as initial route */}
      <Route path="/" element={<LoadingScreen />} />
      
      {/* Main app routes */}
      <Route path="/home" element={<Index />} />
      <Route path="/scene" element={<Scene />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/community-guidelines" element={<CommunityGuidelines />} />
      
      {/* Redirect old routes */}
      <Route path="/index" element={<Navigate replace to="/home" />} />
      
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  // 添加全局错误处理器来忽略COOP警告
  React.useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // 检查是否是COOP相关的错误
      const message = args.join(' ');
      if (message.includes('Cross-Origin-Opener-Policy') || 
          message.includes('window.closed')) {
        // 忽略COOP相关的警告，这些通常不影响实际功能
        return;
      }
      // 其他错误正常显示
      originalConsoleError.apply(console, args);
    };

    // 清理函数
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <>
      <CocosProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </GoogleOAuthProvider>
        <GlobalIframe/>
      </CocosProvider>
    </>
  );
};

export default App;
