import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, LogOut, ChevronDown, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AppleLoginButton from './AppleLoginButton';
import useUserPoints from '@/hooks/useUserPoints';

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
  const [avatarError, setAvatarError] = React.useState(false);
  const [avatarLoading, setAvatarLoading] = React.useState(true);
  
  // 使用积分钩子
  const { points, loading: pointsLoading, error: pointsError, refreshPoints } = useUserPoints();

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

  const handleGoogleLoginSuccess = (userInfo: UserInfo) => {
    setLoading(false);
    onLogin?.(userInfo);
    // 登录成功后触发用户登录事件，以便更新积分
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('user-logged-in'));
    }, 500);
  };

  const handleGoogleLoginError = (error: any) => {
    setLoading(false);
    console.error('Google login failed:', error);
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('isSignedIn');
    navigate('/home');
    onLogout?.();
  };

  const toggleFold = () => {
    onFoldChange?.(!isFolded);
  };

  // 处理刷新积分
  const handleRefreshPoints = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshPoints();
  };

  return (
    <div className={cn("mt-4 relative", className)}>
      {/* Folding Button */}
      {isSignedIn && userInfo && (
        <button
          onClick={toggleFold}
          className="absolute -top-2 right-0 w-8 h-8 flex items-center justify-center bg-[#E6E0FF] rounded-full shadow-sm hover:bg-[#E6E0FF]/90 transition-all z-10"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-[#6B4EFF] transition-transform duration-300",
              isFolded ? "rotate-180" : ""
            )} 
          />
        </button>
      )}

      <div 
        className={cn(
          "transition-all duration-500",
          isFolded && isSignedIn && userInfo 
            ? "max-h-20 overflow-hidden bg-white rounded-2xl shadow-sm" 
            : "max-h-96 overflow-visible"
        )}
        style={{
          transitionTimingFunction: isFolded ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin" />
          </div>
        ) : isSignedIn && userInfo ? (
          <div className={cn(
            "bg-white rounded-2xl p-4 shadow-sm transition-opacity duration-300",
            isFolded ? "opacity-100" : "opacity-100"
          )}>
            <div className="flex flex-col">
              {/* 用户基本信息 */}
              <div className="flex flex-col gap-2 mb-3">
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
                      <div>📍 {userInfo.location}</div>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-0.5 bg-purple-50 rounded-lg inline-block transition-opacity duration-300",
                  isFolded ? "opacity-0" : "opacity-100"
                )}>
                  <span className="text-xs text-gray-400 font-medium">ID: {formatUserId(userInfo.id)}</span>
                </div>
              </div>

              {/* Premium 卡片 */}
              <div className={cn(
                "bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl p-2.5 border border-amber-100/50 mb-3 transition-opacity duration-300",
                isFolded ? "opacity-0" : "opacity-100"
              )}>
                <div className="flex items-center space-x-2 mb-0.5">
                  <div className="text-amber-700 font-bold text-base">DraMa.i Beta</div>
                  <div className="px-2 py-0.5 bg-amber-100 rounded-full">
                    <span className="text-xs text-amber-700">Active</span>
                  </div>
                </div>
              </div>

              {/* 积分卡片 */}
              <div className={cn(
                "bg-white rounded-xl py-2 px-3 border border-gray-100 flex items-center justify-between transition-opacity duration-300",
                isFolded ? "opacity-0" : "opacity-100"
              )}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <img src="/icons/imgMoneyIcon.png" alt="Money Icon" className="w-10 h-8" />
                  </div>
                  <div className="flex items-center">
                    {pointsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-700 mr-2" />
                    ) : (
                      <span className="text-amber-700 font-bold text-lg">{points}</span>
                    )}
                    {pointsError && <span className="text-xs text-red-500 ml-2">加载失败</span>}
                  </div>
                </div>
                <button 
                  onClick={handleRefreshPoints} 
                  className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                  title="刷新积分"
                >
                  <RefreshCw className="w-4 h-4 text-amber-700" />
                </button>
              </div>
              
              {/* 登出按钮 */}
              <button 
                onClick={handleLogout}
                className={cn(
                  "mt-1 flex items-center justify-center gap-2 p-0 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-300",
                  isFolded ? "opacity-0" : "opacity-100"
                )}
              >
                <LogOut size={18} />
                <span className="text-base">Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default UserInfoPanel; 