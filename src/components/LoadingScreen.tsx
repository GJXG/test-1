import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { iframeRef } from './CocosEmbed';

const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Monitor iframe loading status without interfering with the loading process
  useEffect(() => {
    console.log('LoadingScreen: Monitoring iframe loading status');
    
    const checkIframeStatus = () => {
      if (iframeRef.current) {
        console.log('LoadingScreen: iframe mounted, src:', iframeRef.current.src);
        const docReadyState = iframeRef.current.contentDocument?.readyState;
        console.log('LoadingScreen: iframe document readyState:', docReadyState);
        return true;
      } else {
        console.log('LoadingScreen: Waiting for GlobalIframe to mount...');
        return false;
      }
    };
    
    // Check immediately
    if (!checkIframeStatus()) {
      // If iframe is not mounted yet, check status every 500ms
      const statusCheckInterval = setInterval(() => {
        if (checkIframeStatus()) {
          clearInterval(statusCheckInterval);
        }
      }, 500);
      
      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(statusCheckInterval);
        console.log('LoadingScreen: Stopped iframe status checking');
      }, 10000);
      
      return () => clearInterval(statusCheckInterval);
    }
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
    
    // Remove automatic timeout redirect, only enter home page after receiving GAME_LOADED event

    return () => {
      window.removeEventListener('message', handleMessage);
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