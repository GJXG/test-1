import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Index from "./pages/Index";
import Scene from "./pages/Scene";
import BuildDrama from "./pages/BuildDrama";
import NotFound from "./pages/NotFound";
import Mobile from "./pages/Mobile";
import { GlobalIframe, CocosProvider, useCocos } from "./components/CocosEmbed";
import LoadingScreen from "./components/LoadingScreen";
import useIsMobile from './hooks/useIsMobile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityGuidelines from './pages/CommunityGuidelines';

const queryClient = new QueryClient();

// 添加一个IframeToggleButton组件
const IframeToggleButton: React.FC = () => {
  const { showIframe, setShowIframe } = useCocos();
  
  const handleToggle = () => {
    console.log('切换iframe显示状态:', !showIframe);
    setShowIframe(!showIframe);
  };
  
  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-[1002] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
      title={`当前状态: ${showIframe ? '显示' : '隐藏'}`}
    >
      {showIframe ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          隐藏游戏
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          显示游戏
        </>
      )}
    </button>
  );
};

const AppRoutes: React.FC = () => {
  const isMobile = useIsMobile();
  const { isConnected } = useCocos(); // 获取iframe连接状态

  // 检测到移动端时重定向到外部链接
  React.useEffect(() => {
    if (isMobile) {
      // 使用 replace 替换当前历史记录条目，避免后退时循环跳转
      window.location.replace('https://dramai.world/test/');
    }
  }, [isMobile]);

  // 保留原有的移动端组件逻辑（已注释，如需恢复移动端组件可取消注释）
  /*
  if (isMobile) {
    return (
      <Routes>
        <Route path="*" element={<Mobile />} />
      </Routes>
    );
  }
  */

  // 使用isConnected状态来确定是否已完成预加载
  // 当isConnected为true时，表示iframe已加载完成
  console.log('iframe连接状态:', isConnected ? '已连接' : '未连接');

  return (
    <>
      {/* 添加iframe控制按钮 */}
      <IframeToggleButton />
      <Routes>
        {/* LoadingScreen as initial route */}
        <Route path="/" element={<LoadingScreen />} />
        
        {/* Main app routes - 只有在iframe连接成功后才能访问 */}
        <Route path="/home" element={isConnected ? <Index /> : <Navigate replace to="/" />} />
        <Route path="/scene" element={isConnected ? <Scene /> : <Navigate replace to="/" />} />
        <Route path="/build-drama" element={isConnected ? <BuildDrama /> : <Navigate replace to="/" />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        
        {/* Redirect old routes */}
        <Route path="/index" element={<Navigate replace to="/home" />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
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

  // 添加iframe预加载状态监控
  const [iframePreloaded, setIframePreloaded] = React.useState(false);
  
  // 监听iframe加载完成事件
  React.useEffect(() => {
    const handleIframeLoaded = () => {
      console.log('iframe预加载完成，可以正常进入其他页面');
      setIframePreloaded(true);
    };
    
    // 监听自定义事件
    window.addEventListener('iframe-loaded', handleIframeLoaded);
    
    return () => {
      window.removeEventListener('iframe-loaded', handleIframeLoaded);
    };
  }, []);

  return (
    <>
      <CocosProvider>
        {/* 全局iframe预加载，在应用启动时就开始加载 */}
        <GlobalIframe/>
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
      </CocosProvider>
    </>
  );
};

export default App;
