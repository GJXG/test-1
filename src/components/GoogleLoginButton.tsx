import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { cn } from '@/lib/utils';
import { websocketService } from '@/services/websocket';
import { useCocos } from './CocosEmbed';

interface GoogleLoginButtonProps {
  className?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className,
  onSuccess,
  onError
}) => {
  const { sendUserEmail } = useCocos();
  
  const login = useGoogleLogin({
    onSuccess: (response) => {
      // 获取用户信息
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${response.access_token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          // 构造Google用户对象，模拟原有的getBasicProfile()方法
          const googleUser = {
            getBasicProfile: () => ({
              getEmail: () => data.email,
              getName: () => data.name,
              getId: () => data.sub
            })
          };
          
          // 调用WebSocket的Google登录方法
          websocketService.googleLogin(googleUser);
          
          // 处理用户信息用于UI显示
          const userInfo = {
            userId: data.email,
            id: data.sub,
            location: 'Unknown',
            avatar: data.picture,
            points: 0
          };
          
          console.log('Google login user info:', {
            email: data.email,
            name: data.name,
            picture: data.picture,
            userInfo
          });
          
          // 保存到 localStorage（用于UI状态）
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          localStorage.setItem('isSignedIn', 'true');
          
          // 新增：立即发送用户邮箱到游戏iframe
          if (data.email) {
            try {
              sendUserEmail(data.email, 2); // 谷歌登录类型为2
              console.log('Google登录成功，已发送邮箱到游戏:', data.email, '登录类型: 2');
            } catch (error) {
              console.error('发送邮箱到游戏失败:', error);
            }
          }
          
          // 调用成功回调
          onSuccess?.(userInfo);
        })
        .catch((error) => {
          console.error('Error fetching user info:', error);
          onError?.(error);
        });
    },
    onError: (error) => {
      // 忽略COOP相关的错误，这些通常不影响实际功能
      if (error && typeof error === 'object' && 'error' in error) {
        const errorMessage = error.error || '';
        if (errorMessage.includes('Cross-Origin-Opener-Policy') || 
            errorMessage.includes('window.closed')) {
          console.warn('COOP warning (可以忽略):', error);
          return; // 不调用onError回调，避免显示错误给用户
        }
      }
      console.error('Login Failed:', error);
      onError?.(error);
    },
    flow: 'implicit'
  });

  return (
    <button
      onClick={() => login()}
      className={cn(
        "w-full p-3 rounded-lg bg-white text-gray-700 font-medium text-lg hover:bg-gray-50 transition-colors border border-gray-200 flex items-center justify-center gap-2",
        className
      )}
    >
      <img
        src="https://www.google.com/favicon.ico"
        alt="Google"
        className="w-5 h-5"
      />
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton; 