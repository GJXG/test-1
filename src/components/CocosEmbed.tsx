
import React, { useEffect, useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { log } from 'console';

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
let globalSetIframeUrl: ((url: string) => void) | null = null;

// 防抖机制相关变量
let gameLoadedProcessed = false;
let gameLoadedTimer: NodeJS.Timeout | null = null;
const GAME_LOADED_DEBOUNCE_DELAY = 100; // 100ms 防抖延迟

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

// 防抖的游戏加载处理函数 - 只处理用户信息和初始场景数据，不处理场景导航
const handleGameLoadedDebounced = (
  sendMessageToGame: (message: any) => void,
  sendUserEmail: (email: string, loginType?: number) => void,
  setIsConnected: (connected: boolean) => void
) => {
  // 清除之前的定时器
  if (gameLoadedTimer) {
    clearTimeout(gameLoadedTimer);
  }

  // 设置新的防抖定时器
  gameLoadedTimer = setTimeout(() => {
    console.log('React: 开始处理 GAME_LOADED 事件的用户信息和初始场景数据');
    
    // 设置连接状态 - 不再检查gameLoadedProcessed标志，确保每次都处理
    setIsConnected(true);
    console.log('React: 游戏iframe已加载');

    // 触发自定义事件，通知App组件iframe已加载完成
    const iframeLoadedEvent = new Event('iframe-loaded');
    window.dispatchEvent(iframeLoadedEvent);
    console.log('已触发iframe-loaded事件');

    // 检查是否有已登录的用户信息，如果有则发送邮箱
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');

    if (storedUserInfo && storedLoginStatus === 'true') {
      try {
        const userInfo = JSON.parse(storedUserInfo);
        if (userInfo.userId && userInfo.userId.includes('@')) {
          sendUserEmail(userInfo.userId, 1);
          console.log('React: 已发送用户登录信息到游戏');
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
    console.log('React: 已发送初始场景数据');

    // 设置gameLoadedProcessed为true，表示基本处理已完成
    // 但场景导航消息会在每次GAME_LOADED事件中单独处理
    gameLoadedProcessed = true;

  }, GAME_LOADED_DEBOUNCE_DELAY);
};

// 获取当前页面的场景ID
const getCurrentSceneId = (): string | null => {
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  
  try {
    // 根据当前路径确定场景ID
    if (currentPath === '/scene') {
      // Scene页面：从URL参数获取sceneId
      const sceneId = urlParams.get('sceneId') || 'MainMenu';
      
      // 映射场景ID到游戏引擎使用的ID
      const getGameSceneId = (id: string) => {
        const npcId = parseInt(id);
        
        // 牧场场景的NPC
        if ([10016, 10017, 10018, 10019, 10020, 10021].includes(npcId)) {
          return '4';
        }
        
        // 偶像场景的NPC
        if ([10012, 10009, 10006, 10022].includes(npcId)) {
          return '3';
        }
        
        return id;
      };
      
      const gameSceneId = getGameSceneId(sceneId);
      console.log(`React: Scene页面检测到场景ID: ${sceneId} -> 游戏场景ID: ${gameSceneId}`);
      return gameSceneId;
      
    } else if (currentPath === '/build-drama') {
      // BuildDrama页面：固定使用偶像场景ID (3)
      console.log('React: BuildDrama页面，使用固定场景ID: Custom');
      return 'Custom';
      
    } else if (currentPath === '/home' || currentPath === '/') {
      // 首页或根路径：使用默认场景
      console.log('React: 首页检测，使用默认场景ID: MainMenu');
      return 'MainMenu';
      
    } else {
      // 其他页面：不发送场景导航
      console.log(`React: 未知页面路径: ${currentPath}，不发送场景导航`);
      return null;
    }
  } catch (error) {
    console.error('React: 获取当前场景ID失败:', error);
    return null;
  }
};

// 重置防抖状态的函数，用于页面刷新或重新加载时
const resetGameLoadedState = () => {
  // 保留gameLoadedProcessed为true，确保基本处理只执行一次
  // 但场景导航消息会在每次GAME_LOADED事件中单独处理
  if (gameLoadedTimer) {
    clearTimeout(gameLoadedTimer);
    gameLoadedTimer = null;
  }
  console.log('React: 已重置 GAME_LOADED 定时器状态，但保持基本处理状态');
};

// 导出用于调试的函数
export const debugGameLoadedState = () => {
  console.log('React: 当前 GAME_LOADED 状态:', {
    gameLoadedProcessed,
    gameLoadedTimer: gameLoadedTimer !== null,
    GAME_LOADED_DEBOUNCE_DELAY
  });
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
        type: "SET_AUDIO",
        data: {
          action: "setAudio",
          audio: newMutedState ? "off" : "on"
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
          // 立即获取当前场景ID并发送场景导航消息（不使用防抖）
          const currentSceneId = getCurrentSceneId();
          if (currentSceneId) {
            // 延迟1秒发送场景导航消息，确保游戏引擎已准备好
            setTimeout(() => {
              sendMessageToGame({
                type: "SEND_CUSTOM_EVENT",
                data: {
                  action: "navigate",
                  target: currentSceneId
                }
              });
              console.log(`React: CocosProvider 已发送场景导航消息: ${currentSceneId}`);
            }, 1000);
          }
          
          // 使用防抖机制处理其他 GAME_LOADED 事件
          handleGameLoadedDebounced(sendMessageToGame, sendUserEmail, setIsConnected);
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

    // 监听页面可见性变化，当页面隐藏时发送静音操作（防重复发送）
    let lastVisibilityState = !document.hidden;
    
    const handleVisibilityChange = () => {
      const currentHidden = document.hidden;
      
      // 只在页面从可见变为隐藏时发送一次静音指令
      if (currentHidden && !lastVisibilityState) {
        sendMessageToGame({
          type: "SET_AUDIO",
          data: {
            action: "setAudio",
            audio: "off"
          }
        });
        console.log('React: 页面变为隐藏，发送静音指令');
      }
      
      lastVisibilityState = currentHidden;
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  // 固定iframe URL，不再允许更改
  const iframeUrl = 'https://dramai.world/webframe/';
  const cocosContext = useCocos();
  
  // 确保iframe在应用启动时就开始加载，设置为eager加载
  useEffect(() => {
    console.log('GlobalIframe: 组件挂载，开始预加载iframe，URL:', iframeUrl);
    
    // 立即尝试设置iframe属性
    const setupIframe = () => {
      if (iframeRef.current) {
        console.log('GlobalIframe: iframe ref已就绪，设置加载属性');
        
        // 确保iframe有src并立即加载
        if (!iframeRef.current.src || iframeRef.current.src === 'about:blank') {
          iframeRef.current.src = iframeUrl;
          console.log('GlobalIframe: 设置iframe src为:', iframeUrl);
        }
        
        // 设置loading属性为eager，确保立即加载
        iframeRef.current.loading = 'eager';
        
        // 设置优先级属性为high，提高加载优先级
        iframeRef.current.setAttribute('importance', 'high');
        
        console.log('GlobalIframe: iframe加载属性设置完成');
        return true;
      }
      return false;
    };
    
    // 立即尝试一次
    if (!setupIframe()) {
      // 如果iframe还没挂载，使用setTimeout在下一个事件循环中再试
      const retryTimer = setTimeout(() => {
        if (!setupIframe()) {
          console.warn('GlobalIframe: iframe ref在setTimeout后仍未就绪');
        }
      }, 0);
      
      return () => clearTimeout(retryTimer);
    }
  }, [iframeUrl]);
  
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
          type: "SET_AUDIO",
          data: {
            action: "setAudio",
            audio: newMutedState ? "off" : "on"
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
    // 移除iframe URL更新函数，不再允许更改URL
    // globalSetIframeUrl = setIframeUrl;
    return () => {
      globalSetShowIframe = null;
      globalSetPosition = null;
      globalSetIsMuted = null;
      // globalSetIframeUrl = null;
    };
  }, []);
  
  // 监听iframe显示状态变化，当隐藏时发送静音操作（只在状态变化时发送一次）
  const [lastMuteState, setLastMuteState] = useState<'hidden' | 'visible'>('visible');
  
  useEffect(() => {
    const currentState = (!showIframe || position === 'hidden') ? 'hidden' : 'visible';
    
    // 只在状态从可见变为隐藏时发送一次静音指令
    if (currentState === 'hidden' && lastMuteState === 'visible') {
      if (cocosContext && cocosContext.sendMessageToGame) {
        cocosContext.sendMessageToGame({
          type: "SET_AUDIO",
          data: {
            action: "setAudio",
            audio: "off"
          }
        });
        console.log('React: GlobalIframe状态变为隐藏，发送静音指令');
      }
    }
    
    setLastMuteState(currentState);
  }, [showIframe, position, cocosContext, lastMuteState]);
  
  return (
    <>
      {/* 单一iframe，根据position状态切换显示模式 */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className={
          position === 'hidden'
            ? "fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none border-0"
            : `fixed border-0 transition-opacity duration-500 z-[999] ${
                showIframe ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`
        }
        style={{
          // 由 CocosEmbed.positionIframeToContainer 负责 left/top/width/height
          zIndex: position === 'hidden' ? -1 : 999,
          borderRadius: position === 'container' ? '8px' : '0'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        // 设置为eager，确保立即加载，不延迟
        loading="eager"
        // 预加载提示
        title={position === 'hidden' ? "Game Embed Preloader (Loading)" : "Game Embed"}
        // 添加加载事件监听
        onLoad={() => console.log('GlobalIframe: iframe onLoad 事件触发')}
        onError={(e) => console.error('GlobalIframe: iframe onError 事件触发:', e)}
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
  iframeUrl?: string; // 添加自定义iframe URL的prop
}

const CocosEmbed: React.FC<CocosEmbedProps> = ({ className, children, sceneId, iframeUrl }) => {
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
        type: "SET_AUDIO",
        data: {
          action: "setAudio",
          audio: newMutedState ? "off" : "on"
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

  // 添加导航函数 - 只发送postMessage，不切换URL
  const navigateToScene = (target: string) => {
    sendMessageToGame({
      type: "SEND_CUSTOM_EVENT",
      data: {
        action: "navigate",
        target: target
      }
    });
    console.log(`Navigating to scene: ${target} (only sending postMessage, not changing URL)`);
  };

  // 定位iframe到容器（进入页面立即定位，避免黑屏）
  const positionIframeToContainer = () => {
    if (!containerRef.current || !iframeRef.current) return;

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
  };

  useEffect(() => {
    // 处理从 iframe 接收的消息
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data.type === 'GAME_LOADED') {
          // 立即获取当前场景ID并发送场景导航消息（不使用防抖）
          const currentSceneId = getCurrentSceneId();
          if (currentSceneId) {
            // 延迟1秒发送场景导航消息，确保游戏引擎已准备好
            setTimeout(() => {
              sendMessageToGame({
                type: "SEND_CUSTOM_EVENT",
                data: {
                  action: "navigate",
                  target: currentSceneId
                }
              });
              console.log(`React: CocosEmbed 已发送场景导航消息: ${currentSceneId}`);
            }, 1000);
          }
          
          // 使用防抖机制处理其他 GAME_LOADED 事件
          handleGameLoadedDebounced(sendMessageToGame, sendUserEmail, setIsConnected);
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

    // 监听页面可见性变化，当页面隐藏时发送静音操作（防重复发送）
    let lastVisibilityState = !document.hidden;
    
    const handleVisibilityChange = () => {
      const currentHidden = document.hidden;
      
      // 只在页面从可见变为隐藏时发送一次静音指令
      if (currentHidden && !lastVisibilityState) {
        sendMessageToGame({
          type: "SET_AUDIO",
          data: {
            action: "setAudio",
            audio: "off"
          }
        });
        console.log('React: CocosEmbed页面变为隐藏，发送静音指令');
      }
      
      lastVisibilityState = currentHidden;
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 组件挂载时显示iframe并定位到容器
  useEffect(() => {
    // 不再更新iframe URL，保持单一URL
    // 注释掉URL更新代码，只使用初始URL
    /* if (iframeUrl && globalSetIframeUrl) {
      globalSetIframeUrl(iframeUrl);
    } */
    
    // 先立即定位一次，减少黑屏窗口
    positionIframeToContainer();
    const timer = setTimeout(() => {
      setShowIframe(true);
      globalSetShowIframe?.(true);
      globalSetPosition?.('container');
      positionIframeToContainer();
    }, 200);
    
    // 监听窗口大小变化，重新定位iframe
    const handleResize = () => positionIframeToContainer();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      
      // 在组件卸载时向iframe发送静音操作（只在真正卸载时发送）
      // 注意：这里不发送静音指令，因为GlobalIframe的状态监听会处理
      console.log('React: CocosEmbed组件卸载');
      
      setShowIframe(false);
      if (globalSetShowIframe) {
        globalSetShowIframe(false);
      }
      if (globalSetPosition) {
        globalSetPosition('hidden');
      }
    };
  }, [iframeUrl]);

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
        
        {/* 静音按钮 - 已注释掉UI界面 */}
        {/* {showIframe && (
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
        )} */}
        
      {children}
      </div>
    </CocosContext.Provider>
  );
};

export default CocosEmbed;
