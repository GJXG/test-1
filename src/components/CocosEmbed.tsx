import React, { useEffect, useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// 创建上下文
interface CocosContextType {
  sendMessageToGame: (message: any) => void;
  isConnected: boolean;
  lastMessage: string;
  messageLog: string[];
  showIframe: boolean;
  setShowIframe: (show: boolean) => void;
  navigateToScene: (target: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
  sendUserEmail: (email: string, loginType?: number) => void;
}

export const CocosContext = createContext<CocosContextType | null>(null);

// 全局状态，确保 iframe 一直存在
export const iframeRef = React.createRef<HTMLIFrameElement>();
let isGlobalInitialized = false;
let globalSetShowIframe: ((show: boolean) => void) | null = null;
let globalSetPosition: ((position: 'hidden' | 'container') => void) | null = null;
let globalSetIsMuted: ((muted: boolean) => void) | null = null;
let globalToggleMute: (() => void) | null = null;

// 全局方法，用于发送消息到 iframe
const sendMessageToIframe = (message: any) => {
  try {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
      console.log('React: 发送数据到游戏iframe ->', message);
    } else {
      console.error('React: iframe contentWindow 未找到');
    }
  } catch (error) {
    console.error('发送消息到iframe失败:', error);
  }
};

export const useCocos = () => {
  const context = useContext(CocosContext);
  if (!context) {
    console.error('useCocos必须在CocosProvider内部使用');
    // 返回一个空对象，避免直接抛出错误导致应用崩溃
    return {
      sendMessageToGame: () => {},
      isConnected: false,
      lastMessage: '',
      messageLog: [],
      showIframe: false,
      setShowIframe: () => {},
      navigateToScene: () => {},
      isMuted: false,
      toggleMute: () => {},
      sendUserEmail: () => {}
    } as CocosContextType;
  }
  return context;
};

// 创建一个全局的CocosProvider，不参与iframe定位
export const CocosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [showIframe, setShowIframe] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // 初始化时从localStorage读取静音状态
  useEffect(() => {
    try {
      const storedMuteState = localStorage.getItem('isMuted');
      if (storedMuteState) {
        const isMuted = storedMuteState === 'true';
        setIsMuted(isMuted);
        if (globalSetIsMuted) {
          globalSetIsMuted(isMuted);
        }
      }
    } catch (error) {
      console.error('读取静音状态失败:', error);
    }
  }, []);

  const sendMessageToGame = (message: any) => {
    sendMessageToIframe(message);
    setMessageLog(prev => [...prev, `Sent: ${JSON.stringify(message)}`]);
  };

  const sendUserEmail = (email: string, loginType?: number) => {
    const userEmailMessage = {
      type: 'USER_LOGIN',
      action: 'setUserEmail',
      data: {
        email: email,
        timestamp: new Date().toISOString(),
        source: 'react_parent',
        loginType: loginType || 1
      }
    };
    sendMessageToGame(userEmailMessage);
    console.log('React: 发送用户邮箱到游戏 ->', email, '登录类型:', loginType || 1);
  };

  const toggleMute = () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      sendMessageToGame({
        type: "SEND_CUSTOM_EVENT",
        data: {
          action: "toggleMute",
          isMuted: newMutedState
        }
      });
      
      // 保存静音状态到localStorage
      localStorage.setItem('isMuted', String(newMutedState));
      
      // 同步GlobalIframe的静音状态
      if (globalSetIsMuted) {
        globalSetIsMuted(newMutedState);
      }
    } catch (error) {
      console.error('切换静音状态失败:', error);
    }
  };

  // 设置全局toggleMute函数
  useEffect(() => {
    globalToggleMute = toggleMute;
    return () => {
      globalToggleMute = null;
    };
  }, [isMuted]);

  const navigateToScene = (target: string) => {
    sendMessageToGame({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "navigate",
        target: target
      }
    });
    console.log(`Navigating to scene: ${target}`);
  };

  useEffect(() => {
    // 处理从 iframe 接收的消息
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data.type === 'GAME_LOADED') {
          setIsConnected(true);
          console.log('React: 游戏iframe已加载');
          
          // 检查是否有已登录的用户信息，如果有则发送邮箱
          const storedUserInfo = localStorage.getItem('userInfo');
          const storedLoginStatus = localStorage.getItem('isSignedIn');
          
          if (storedUserInfo && storedLoginStatus === 'true') {
            try {
              const userInfo = JSON.parse(storedUserInfo);
              if (userInfo.userId && userInfo.userId.includes('@')) {
                sendUserEmail(userInfo.userId, 1);
              }
            } catch (error) {
              console.error('解析用户信息失败:', error);
            }
          }
          
          // 发送初始场景数据
          sendMessageToGame({
            type: 'INIT_SCENE',
            data: {
              scenes: []
            }
          });
        }
        setLastMessage(JSON.stringify(event.data));
        setMessageLog(prev => [...prev, `Received: ${JSON.stringify(event.data)}`]);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    // 监听localStorage变化（用户登录状态变化）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          const userInfo = JSON.parse(event.newValue);
          const isSignedIn = localStorage.getItem('isSignedIn');
          
          if (isSignedIn === 'true' && userInfo.userId && userInfo.userId.includes('@')) {
            sendUserEmail(userInfo.userId, 1);
          }
        } catch (error) {
          console.error('处理用户登录状态变化失败:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <CocosContext.Provider value={{ 
      sendMessageToGame, 
      isConnected, 
      lastMessage, 
      messageLog,
      showIframe,
      setShowIframe,
      navigateToScene,
      isMuted,
      toggleMute,
      sendUserEmail
    }}>
      {children}
    </CocosContext.Provider>
  );
};

// 全局组件，管理唯一的iframe
export const GlobalIframe: React.FC = () => {
  const [showIframe, setShowIframe] = useState(false);
  const [position, setPosition] = useState<'hidden' | 'container'>('hidden');
  const [isMuted, setIsMuted] = useState(false);
  const cocosContext = useCocos();
  
  // 初始化时从localStorage读取静音状态
  useEffect(() => {
    try {
      const storedMuteState = localStorage.getItem('isMuted');
      if (storedMuteState) {
        setIsMuted(storedMuteState === 'true');
      }
    } catch (error) {
      console.error('读取静音状态失败:', error);
    }
  }, []);
  
  const toggleMute = () => {
    try {
      // 如果有全局toggleMute函数，优先使用它来保持状态同步
      if (globalToggleMute) {
        globalToggleMute();
        return;
      }
      
      // 如果没有全局函数，则自行处理
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      if (cocosContext) {
        cocosContext.sendMessageToGame({
          type: "SEND_CUSTOM_EVENT",
          data: {
            action: "toggleMute",
            isMuted: newMutedState
          }
        });
      }
      
      // 保存静音状态到localStorage
      localStorage.setItem('isMuted', String(newMutedState));
    } catch (error) {
      console.error('切换静音状态失败:', error);
    }
  };
  
  useEffect(() => {
    globalSetShowIframe = setShowIframe;
    globalSetPosition = setPosition;
    globalSetIsMuted = setIsMuted;
    return () => {
      globalSetShowIframe = null;
      globalSetPosition = null;
      globalSetIsMuted = null;
    };
  }, []);
  
  return (
    <>
      {/* 单一iframe，根据position状态切换显示模式 */}
      <iframe
        ref={iframeRef}
        src="https://dramai.world/webframe/"
        className={
          position === 'hidden' 
            ? "fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none border-0"
            : `fixed inset-0 w-full h-full border-0 transition-opacity duration-500 z-[999] ${
          showIframe ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`
        }
        style={{ 
          zIndex: position === 'hidden' ? -1 : 999,
          borderRadius: position === 'container' ? '8px' : '0'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        loading="lazy"
        title={position === 'hidden' ? "Game Embed Preloader" : "Game Embed"}
      />
      
      {/* 静音按钮 - 已隐藏但保留功能代码 */}
      {/* {showIframe && position === 'container' && (
        <button
          onClick={toggleMute}
          className="fixed top-3 left-3 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 z-[1001] backdrop-blur-sm"
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          )}
        </button>
      )} */}
    </>
  );
};

interface CocosEmbedProps {
  className?: string;
  children?: React.ReactNode;
  sceneId?: string;
}

const CocosEmbed: React.FC<CocosEmbedProps> = ({ className, children, sceneId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [showIframe, setShowIframe] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // 容器ref，用于iframe定位
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 初始化时从localStorage读取静音状态
  useEffect(() => {
    try {
      const storedMuteState = localStorage.getItem('isMuted');
      if (storedMuteState) {
        setIsMuted(storedMuteState === 'true');
      }
    } catch (error) {
      console.error('读取静音状态失败:', error);
    }
  }, []);

  const sendMessageToGame = (message: any) => {
    sendMessageToIframe(message);
    setMessageLog(prev => [...prev, `Sent: ${JSON.stringify(message)}`]);
  };

  const sendUserEmail = (email: string, loginType?: number) => {
    const userEmailMessage = {
      type: 'USER_LOGIN',
      action: 'setUserEmail',
      data: {
        email: email,
        timestamp: new Date().toISOString(),
        source: 'react_parent',
        loginType: loginType || 1 // 默认为1，谷歌为2，苹果为3
      }
    };
    sendMessageToGame(userEmailMessage);
    console.log('React: 发送用户邮箱到游戏 ->', email, '登录类型:', loginType || 1);
  };

  const toggleMute = () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      sendMessageToGame({
        type: "SEND_CUSTOM_EVENT",
        data: {
          action: "toggleMute",
          isMuted: newMutedState
        }
      });
      
      // 保存静音状态到localStorage
      localStorage.setItem('isMuted', String(newMutedState));
      
      // 同步GlobalIframe的静音状态
      if (globalSetIsMuted) {
        globalSetIsMuted(newMutedState);
      }
    } catch (error) {
      console.error('切换静音状态失败:', error);
    }
  };

  // 添加导航函数
  const navigateToScene = (target: string) => {
    sendMessageToGame({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "navigate",
        target: target
      }
    });
    console.log(`Navigating to scene: ${target}`);
  };

  // 定位iframe到容器
  const positionIframeToContainer = () => {
    if (containerRef.current && iframeRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      const iframe = iframeRef.current;
      iframe.style.position = 'fixed';
      iframe.style.left = `${rect.left}px`;
      iframe.style.top = `${rect.top}px`;
      iframe.style.width = `${rect.width}px`;
      iframe.style.height = `${rect.height}px`;
      iframe.style.zIndex = '1000';
      iframe.style.borderRadius = '8px';
    }
  };

  useEffect(() => {
    // 处理从 iframe 接收的消息
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data.type === 'GAME_LOADED') {
          setIsConnected(true);
          console.log('React: 游戏iframe已加载');
          
          // 检查是否有已登录的用户信息，如果有则发送邮箱
          const storedUserInfo = localStorage.getItem('userInfo');
          const storedLoginStatus = localStorage.getItem('isSignedIn');
          
          if (storedUserInfo && storedLoginStatus === 'true') {
            try {
              const userInfo = JSON.parse(storedUserInfo);
              if (userInfo.userId && userInfo.userId.includes('@')) {
                // 如果userId包含@符号，说明是邮箱格式
                sendUserEmail(userInfo.userId, 1); // 默认登录类型为1
              }
            } catch (error) {
              console.error('解析用户信息失败:', error);
            }
          }
          
          // 发送初始场景数据
          sendMessageToGame({
            type: 'INIT_SCENE',
            data: {
              scenes: []
            }
          });
        }
        setLastMessage(JSON.stringify(event.data));
        setMessageLog(prev => [...prev, `Received: ${JSON.stringify(event.data)}`]);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    // 监听localStorage变化（用户登录状态变化）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          const userInfo = JSON.parse(event.newValue);
          const isSignedIn = localStorage.getItem('isSignedIn');
          
          if (isSignedIn === 'true' && userInfo.userId && userInfo.userId.includes('@')) {
            // 用户刚刚登录，发送邮箱到游戏
            sendUserEmail(userInfo.userId, 1); // 默认登录类型为1
          }
        } catch (error) {
          console.error('处理用户登录状态变化失败:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 组件挂载时显示iframe并定位到容器
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIframe(true);
      if (globalSetShowIframe) {
        globalSetShowIframe(true);
      }
      if (globalSetPosition) {
        globalSetPosition('container');
      }
      positionIframeToContainer();
    }, 1000);
    
    // 监听窗口大小变化，重新定位iframe
    const handleResize = () => {
      positionIframeToContainer();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      setShowIframe(false);
      if (globalSetShowIframe) {
        globalSetShowIframe(false);
      }
      if (globalSetPosition) {
        globalSetPosition('hidden');
      }
    };
  }, []);

  // 当容器大小变化时重新定位iframe
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      positionIframeToContainer();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  return (
    <CocosContext.Provider value={{ 
      sendMessageToGame, 
      isConnected, 
      lastMessage, 
      messageLog,
      showIframe,
      setShowIframe,
      navigateToScene,
      isMuted,
      toggleMute,
      sendUserEmail
    }}>
      <div 
        ref={containerRef}
        className={cn("relative w-full h-full bg-white rounded-lg overflow-hidden", className)}
      >
        {/* 加载指示器 */}
        {!showIframe && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg">
            <div className="text-center text-gray-800">
              <div className="animate-spin h-8 w-8 border-4 border-gray-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm opacity-80">Loading Game...</p>
            </div>
          </div>
        )}
        
        {/* 静音按钮 */}
        {showIframe && (
          <button
            onClick={toggleMute}
            className="absolute top-3 left-3 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 z-[1001] backdrop-blur-sm"
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            )}
          </button>
        )}
        
      {children}
      </div>
    </CocosContext.Provider>
  );
};

export default CocosEmbed;
