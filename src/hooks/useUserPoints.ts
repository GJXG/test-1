import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '@/services/websocket';
import { Commands } from '@/services/websocket';

interface UserPointsItem {
  goodsId: number;
  count: number;
}

export const useUserPoints = () => {
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // 处理积分数据响应
  const handlePointsResponse = useCallback((event: any) => {
    if (event.command === Commands.GET_USER_POINTS) {
      setLoading(false);
      
      if (event.code === 0 && event.data) {
        // 根据文档，积分数据在data数组中
        const pointsData = event.data as UserPointsItem[];
        if (pointsData && pointsData.length > 0) {
          // 查找积分项目并更新状态
          const pointsItem = pointsData.find(item => item.goodsId === 10101000);
          if (pointsItem) {
            setPoints(pointsItem.count);
            setError(null);
          } else {
            setError('未找到积分数据');
          }
        } else {
          setPoints(0);
        }
      } else {
        setError(event.message || '获取积分失败');
      }
    }
  }, []);

  // 获取积分数据
  const fetchPoints = useCallback(() => {
    // 检查用户是否已登录
    const isSignedIn = localStorage.getItem('isSignedIn') === 'true';
    const userInfo = localStorage.getItem('userInfo');
    
    if (!isSignedIn || !userInfo) {
      console.log('用户未登录，不获取积分');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // 注册监听
    websocketService.on(Commands.GET_USER_POINTS, handlePointsResponse);
    
    // 发送请求
    websocketService.getUserPoints().catch(err => {
      setLoading(false);
      setError(err.message || '获取积分请求失败');
    });
    
    return () => {
      // 清理监听
      websocketService.off(Commands.GET_USER_POINTS, handlePointsResponse);
    };
  }, [handlePointsResponse]);

  // 监听WebSocket连接状态变化
  const handleConnectionChange = useCallback(() => {
    if (websocketService.isConnectionOpen()) {
      console.log('WebSocket已连接，尝试获取积分');
      fetchPoints();
    }
  }, [fetchPoints]);

  // 组件挂载时设置监听
  useEffect(() => {
    // 添加连接状态监听
    window.addEventListener('websocket-connected', handleConnectionChange);
    
    // 如果连接已经建立，直接获取积分
    if (websocketService.isConnectionOpen()) {
      console.log('WebSocket已连接，初始化时获取积分');
      fetchPoints();
      setIsInitialized(true);
    }
    
    // 监听登录状态变化
    window.addEventListener('user-logged-in', fetchPoints);
    
    // 页面加载后延迟尝试获取积分（确保WebSocket连接和登录状态已恢复）
    const timer = setTimeout(() => {
      if (!isInitialized) {
        console.log('延迟获取积分');
        fetchPoints();
        setIsInitialized(true);
      }
    }, 2000);
    
    return () => {
      // 清理监听
      websocketService.off(Commands.GET_USER_POINTS, handlePointsResponse);
      window.removeEventListener('websocket-connected', handleConnectionChange);
      window.removeEventListener('user-logged-in', fetchPoints);
      clearTimeout(timer);
    };
  }, [fetchPoints, handleConnectionChange, handlePointsResponse, isInitialized]);

  return {
    points,
    loading,
    error,
    refreshPoints: fetchPoints
  };
};

export default useUserPoints; 