import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AppleLoginButton from './AppleLoginButton';
import { websocketService, Commands } from '@/services/websocket';

interface UserInfo {
  userId: string;
  id: string;
  location: string;
  avatar: string;
  points: number;
}

interface UserInfoPanelProps {
  className?: string;
  isSignedIn?: boolean;
  userInfo?: UserInfo | null;
  onLogin?: (userInfo: UserInfo) => void;
  onLogout?: () => void;
  isFolded?: boolean;
  onFoldChange?: (folded: boolean) => void;
}

const UserInfoPanel: React.FC<UserInfoPanelProps> = ({ 
  className, 
  isSignedIn = false,
  userInfo = null,
  onLogin,
  onLogout,
  isFolded = false,
  onFoldChange
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [avatarError, setAvatarError] = React.useState(false);
  const [avatarLoading, setAvatarLoading] = React.useState(true);
  const [loginAddress, setLoginAddress] = React.useState<string | null>(null);

  // 添加处理ID显示的函数
  const formatUserId = (id: string) => {
    return id.length > 10 ? `${id.substring(0, 10)}...` : id;
  };

  // 处理头像加载错误
  const handleAvatarError = () => {
    setAvatarError(true);
    setAvatarLoading(false);
  };

  // 处理头像加载成功
  const handleAvatarLoad = () => {
    setAvatarLoading(false);
  };

  // 重置头像错误状态当userInfo变化时
  React.useEffect(() => {
    setAvatarError(false);
    setAvatarLoading(true);
  }, [userInfo?.avatar]);

  // 监听登录响应获取地址信息
  useEffect(() => {
    const handleLoginResponse = (event: any) => {
      if (event.code === 0 && event.data) {
        // 从登录响应中获取地址信息
        const address = event.data.address;
        if (address) {
          setLoginAddress(address);
          
          // 更新localStorage中的userInfo
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            try {
              const userInfoObj = JSON.parse(storedUserInfo);
              userInfoObj.location = address;
              localStorage.setItem('userInfo', JSON.stringify(userInfoObj));
            } catch (error) {
              console.error('解析用户信息失败:', error);
            }
          }
        }
      }
    };

    // 注册登录响应事件处理
    websocketService.on(Commands.LOGIN, handleLoginResponse);
    
    return () => {
      // 移除事件监听
      websocketService.off(Commands.LOGIN, handleLoginResponse);
    };
  }, []);

  const handleGoogleLoginSuccess = (userInfo: UserInfo) => {
    setLoading(false);
    setError(null);
    onLogin?.(userInfo);
  };

  const handleGoogleLoginError = (error: any) => {
    setLoading(false);
    console.error('Google login failed:', error);
    setError(error.error_description || 'Login failed, please try again later');
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('isSignedIn');
    navigate('/home');
    onLogout?.();
  };

  const handleRetry = () => {
    setError(null);
  };

  const toggleFold = () => {
    onFoldChange?.(!isFolded);
  };

  // 显示地址，优先使用从服务器获取的地址
  const displayLocation = loginAddress || userInfo?.location || 'Unknown';

  return (
    <div className={cn("mt-4 relative", className)}>
      {/* Folding Button */}
      {isSignedIn && userInfo && (
        <button
          onClick={toggleFold}
          className="absolute -top-2 right-0 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-50 transition-all z-10"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform duration-300",
              isFolded ? "rotate-180" : ""
            )} 
          />
        </button>
      )}

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isFolded && isSignedIn && userInfo ? "h-16 overflow-hidden" : "h-auto"
      )}>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin" />
          </div>
        ) : isSignedIn && userInfo ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col">
              {/* 用户基本信息 */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-drama-lavender overflow-hidden ring-2 ring-purple-100 flex-shrink-0">
                    {!avatarError && userInfo.avatar ? (
                      <img
                        src={userInfo.avatar}
                        alt="User avatar"
                        className="h-full w-full object-cover"
                        onError={handleAvatarError}
                        onLoad={handleAvatarLoad}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        {avatarLoading && userInfo.avatar && !avatarError ? (
                          <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {userInfo.userId.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-gray-800 -mt-3 truncate">{userInfo.userId}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      <div>📍 {displayLocation}</div>
                    </div>
                  </div>
                </div>
                <div className="px-2 py-0.5 bg-purple-50 rounded-lg inline-block">
                  <span className="text-xs text-gray-400 font-medium">ID: {userInfo.id}</span>
                </div>
              </div>

              {/* Premium 卡片 */}
              <div className="bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl p-2.5 border border-amber-100/50 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-amber-700 font-bold text-sm">DraMai Premium</div>
                  <div className="px-2 py-0.5 bg-amber-100 rounded-full">
                    <span className="text-xs text-amber-700">Active</span>
                  </div>
                </div>
              </div>

              {/* 积分卡片 */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <img src="/icons/imgMoneyIcon.png" alt="Money Icon" className="w-10 h-8" />
                  </div>
                  <span className="text-amber-700 font-bold text-lg">{userInfo.points}</span>
                </div>
                <button className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                  <span className="text-amber-700 text-sm font-medium">Earn More →</span>
                </button>
              </div>
              
              {/* 登出按钮 */}
              <button 
                onClick={handleLogout}
                className="mt-1 flex items-center justify-center gap-2 p-0 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                <span className="text-base">Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <GoogleLoginButton
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
              />
              <AppleLoginButton
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserInfoPanel; 