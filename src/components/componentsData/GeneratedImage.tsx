// src/GeneratedImage.tsx

import { useState, useEffect } from 'react';

// 1. 定义漫画图片的 TypeScript 类型接口
export interface GeneratedImage {
  Id: number;
  ImgUrl: string;
}

// 2. 封装成一个自定义 Hook
export const useGeneratedImages = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMangaData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // --- 主要修改在这里 ---
        // 直接访问URL，fetch默认就是GET请求，无需任何多余参数
        const response = await fetch('https://dramai.world/npc/getPythonGenImg');

        // 检查服务器响应状态，如果不是成功状态 (例如 404, 500)
        if (!response.ok) {
          // 抛出错误，这个错误会被下面的 catch 捕获
          throw new Error(`网络请求失败，状态码: ${response.status}`);
        }
        
        const data: GeneratedImage[] = await response.json();
        setImages(data);

      } catch (e: unknown) {
        // 这里会捕获上面 throw 的错误
        // (e instanceof Error ? e.message : 'An unknown error occurred.') 是更稳妥的写法
        setError(e instanceof Error ? e.message : '发生未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMangaData();
  }, []);

  // 3. 从 Hook 返回组件所需要的所有信息
  return { images, isLoading, error };
};