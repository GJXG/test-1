import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { iframeRef, globalSetIframeUrl } from './CocosEmbed';

const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Ensure iframe is loaded with the correct URL
  useEffect(() => {
    // 使用更可靠的方法设置iframe URL
    const setupIframe = () => {
      // 1. 直接修改iframe的src属性
      if (iframeRef.current) {
        console.log('[LoadingScreen] 直接设置iframe.src: https://dramai.world/webframe/');
        iframeRef.current.src = "https://dramai.world/webframe/";
      }
      
      // 2. 同时也通过全局函数设置
      if (globalSetIframeUrl) {
        globalSetIframeUrl("https://dramai.world/webframe/");
        console.log('[LoadingScreen] 设置iframe URL: https://dramai.world/webframe/');
      }
      
      // 3. 存储当前页面的iframe配置到localStorage
      localStorage.setItem('currentIframeUrl', 'https://dramai.world/webframe/');
      localStorage.setItem('currentPage', 'loading');
    };
    
    // 立即执行一次
    setupIframe();
    
    // 再次延迟执行一次，以防第一次执行时iframe还未完全初始化
    const secondAttemptTimeout = setTimeout(setupIframe, 500);
    
    return () => {
      clearTimeout(secondAttemptTimeout);
    };
  }, []);

  // Simulate progress bar growth
  useEffect(() => {
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        // Simulate progress growth, but max to 90%, waiting for actual game loading to complete
        if (prev < 90) {
          return prev + Math.random() * 3;
        }
        return prev;
      });
    }, 300);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Listen for iframe load complete event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === 'GAME_LOADED') {
          // Game loading complete
          console.log('Game loaded successfully');
          setProgress(100);
          setLoaded(true);
          
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          
          // Wait a moment before redirecting, to let user see 100%
          setTimeout(() => {
            navigate('/home');
          }, 800);
        }
      } catch (error) {
        console.error('Error processing message from iframe:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // If no load complete message is received within 5 seconds, continue anyway
    const timeoutId = setTimeout(() => {
      if (!loaded) {
        console.log('Loading timeout, continuing anyway');
        setProgress(100);
        setLoaded(true);
        
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        
        setTimeout(() => {
          navigate('/home');
        }, 800);
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [navigate, loaded]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="w-full max-w-md space-y-4 px-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/logo.png" 
            alt="DraMai Logo" 
            className="h-20 w-auto object-contain animate-pulse"
          />
        </div>
        
        {/* Loading Text */}
        <h1 className="text-center text-2xl font-bold text-white whitespace-nowrap">
          Loading DraMa.i AI Drama Series
        </h1>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
          <div 
            className="bg-indigo-400 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(Math.round(progress), 100)}%` }}
          ></div>
        </div>
        
        {/* Progress Percentage */}
        <p className="text-center text-white mt-2">
          {Math.min(Math.round(progress), 100)}% Complete
        </p>
        
        {/* Status Message */}
        <p className="text-center text-indigo-200 text-sm animate-pulse mt-2">
          {loaded ? 'Ready! Redirecting...' : 'Initializing live streaming...'}
        </p>
        
        {/* Loading Messages */}
        <div className="mt-4 text-center">
          <p className="text-indigo-300 text-xs">
            {progress < 30 ? "Loading assets..." : 
             progress < 60 ? "Preparing the experience..." : 
             progress < 90 ? "Almost there..." : 
             "Ready to explore!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 