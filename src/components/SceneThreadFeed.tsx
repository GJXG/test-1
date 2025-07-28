import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AIPost, TweetComment } from '@/types/drama';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Heart, ChevronDown, ChevronUp, Share2, Send, Maximize, Volume2, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getNpcName, NpcName } from "@/config/npc";
import { websocketService } from '@/services/websocket';
import { Commands } from '@/services/websocket';

//导入的漫画数据
import {useGeneratedImages } from "./componentsData/GeneratedImage"

const MangaViewer = ()=>{

}


interface SceneThreadFeedProps {
  posts: AIPost[];
  className?: string;
  isSignedIn?: boolean;
  loading?: boolean;
  onVote?: (tweetId: number, optionIndex: number) => void;
  onLike?: (tweetId: number) => void;
  onComment?: (tweetId: number, comment: string) => void;
  roomId?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  selectedEpisode?: number | null;
  selectedComicEpisode?: number | null; // 添加selectedComicEpisode prop
  showManga?: boolean; // 添加showManga prop

}


// 进度条颜色列表
const BAR_COLORS = [
  'bg-red-300',    // 0
  'bg-blue-200',   // 1
  'bg-yellow-300', // 2
  'bg-green-300',  // 3
  'bg-purple-300', // 4
  'bg-pink-300',   // 5
];

const SceneThreadFeed: React.FC<SceneThreadFeedProps> = ({
  posts,
  className,
  isSignedIn = false,
  loading = false,
  onVote,
  onLike,
  onComment,
  roomId = 0,
  currentPage = 0,
  onPageChange,
  selectedEpisode = null,
  selectedComicEpisode = null, // 从props中获取selectedComicEpisode
  showManga = false // 从props中获取showManga，默认为false（显示推文）
}) => {
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [chosenOptions, setChosenOptions] = useState<Record<number, number>>({});
  const [localLikes, setLocalLikes] = useState<Record<number, boolean>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<number, boolean>>({});
  const [videoLoading, setVideoLoading] = useState<Record<number, boolean>>({});
  const [videoErrors, setVideoErrors] = useState<Record<number, string>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  
  // 懒加载相关状态
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const pageSize = 10; // 每页显示10条推文，与后端请求保持一致
  // 添加锁机制，防止重复触发加载
  const isLoadingRef = useRef<boolean>(false);
  
  const [expandedCommentCounts, setExpandedCommentCounts] = useState<Record<number, number>>({});
  const COMMENTS_PER_PAGE = 10;
  const INITIAL_COMMENTS = 3;

  //漫画相关数据
  const { images, isLoading: imagesLoading, error: imagesError } = useGeneratedImages();
  
  // 监听交叉观察器，用于检测底部加载元素是否进入视口
  useEffect(() => {
    if (!loadingRef.current || loading || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        // 添加锁检查，确保不会重复触发
        if (target.isIntersecting && !loading && !loadingMore && hasMore && !isLoadingRef.current) {
          // 当加载元素进入视口，且当前没有正在加载，且还有更多数据时，加载更多
          handleLoadMore();
        }
      },
      { threshold: 0.1 } // 当10%的元素可见时触发
    );
    
    observer.observe(loadingRef.current);
    
    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [loading, loadingMore, hasMore, posts.length]);
  
  // 当posts发生变化时，重新评估是否还有更多数据
  useEffect(() => {
    // 检查posts是否有新数据
    console.log(`组件posts更新: 当前数据量: ${posts.length}, 当前页码: ${currentPage}`);
    
    // 新的判断逻辑：
    // 1. 如果当前是第一页(currentPage=0)，且有数据，则认为可能有更多数据
    // 2. 如果是翻页加载(currentPage>0)，则主要根据数据量是否等于pageSize来判断
    
    if (currentPage === 0) {
      // 初始页面加载
      if (posts.length > 0) {
        // 如果有数据，认为可能有更多
        console.log(`初始页有${posts.length}条数据，可能有更多数据`);
        setHasMore(true);
      } else {
        // 没有数据
        console.log('初始页无数据');
        setHasMore(false);
      }
    } else {
      // 翻页加载，判断是否还有更多数据
      // 这里的判断基于每页应该返回pageSize条数据的假设
      // 如果返回的数据量小于pageSize，则认为没有更多数据了
      if (posts.length >= pageSize) {
        console.log(`当前共有${posts.length}条数据，页码${currentPage}，可能还有更多数据`);
        setHasMore(true);
      } else {
        console.log(`当前共有${posts.length}条数据，页码${currentPage}，没有更多数据了`);
        setHasMore(false);
      }
    }
    
    // 如果正在加载更多，但是已经有了数据，则结束加载状态
    if (loadingMore && posts.length > 0) {
      console.log('检测到新数据已加载，结束loadingMore状态');
      setLoadingMore(false);
    }
  }, [posts, currentPage, pageSize, loadingMore]);

  // 加载更多数据
  const handleLoadMore = useCallback(() => {
    // 如果已经在加载中，直接返回
    if (loadingMore || !hasMore || loading || isLoadingRef.current) {
      console.log('无法加载更多:', {
        loadingMore,
        hasMore,
        loading,
        isLoadingLocked: isLoadingRef.current
      });
      return;
    }
    
    // 设置加载锁
    isLoadingRef.current = true;
    console.log('加载更多数据，当前页：', currentPage, '已设置加载锁');
    setLoadingMore(true);
    
    // 调用父组件的onPageChange函数加载下一页
    onPageChange?.(currentPage + 1);
    
    // 短暂延迟后检查是否有新数据并释放锁
    setTimeout(() => {
      setLoadingMore(false);
      
      // 延迟释放锁，确保不会立即触发下一次加载
      setTimeout(() => {
        isLoadingRef.current = false;
        console.log('释放加载锁，允许下一次加载');
      }, 1000);
    }, 3000); // 增加延迟时间确保数据有足够时间加载
  }, [currentPage, loadingMore, hasMore, loading, posts.length, onPageChange, pageSize]);

  // 处理滚动到底部事件（作为备用方案，增强用户体验）
  const handleScroll = useCallback(() => {
    if (!feedRef.current || loading || loadingMore || !hasMore || isLoadingRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    // 当滚动到距离底部100px时，提前加载更多
    if (scrollHeight - scrollTop - clientHeight < 100) {
      handleLoadMore();
    }
  }, [loading, loadingMore, hasMore, handleLoadMore]);
  
  // 添加滚动事件监听
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleVote = (post: AIPost, optionIndex: number) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to vote"
      });
      return;
    }

    if (post.choose) {
      toast({
        title: "Already voted",
        description: "You have already voted on this thread"
      });
      return;
    }

    setChosenOptions(prev => ({
      ...prev,
      [post.id]: optionIndex
    }));

    onVote?.(post.id, optionIndex);
  };

  const handleLike = (post: AIPost) => {
    // if (!isSignedIn) {
    //   toast({
    //     title: "Please sign in",
    //     description: "You need to sign in to like posts"
    //   });
    //   return;
    // }

    setLocalLikes(prev => ({
      ...prev,
      [post.id]: !post.like
    }));

    onLike?.(post.id);
  };

  const toggleExpand = (postId: number) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleCommentChange = (postId: number, value: string) => {
    setNewComment(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  const handleCommentSubmit = (post: AIPost) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to comment"
      });
      return;
    }

    if (!newComment[post.id]?.trim()) return;

    // 移除本地评论计数更新，改为依赖服务器端数据同步
    // setLocalCommentCounts(prev => ({
    //   ...prev,
    //   [post.id]: (prev[post.id] || 0) + 1
    // }));

    onComment?.(post.id, newComment[post.id]);

    setNewComment(prev => ({
      ...prev,
      [post.id]: ""
    }));
  };

  const formatTime = (timestamp: number) => {
    // 确保时间戳是合法的
    if (!timestamp || isNaN(timestamp)) {
      console.error('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    try {
      // API返回的时间戳格式不是标准的毫秒时间戳
      // 检查时间戳的位数，如果小于13位，可能是秒级时间戳或其他格式
      let date;
      
      if (timestamp < 10000000000) { // 小于10位数，可能是相对时间或特殊格式
        // 假设这是相对于某个基准日期的秒数
        // 这里我们使用当前日期作为基准，减去相应的秒数
        const now = new Date();
        date = new Date(now.getTime() - timestamp * 1000); // 将秒转换为毫秒
      } else {
        // 假设是标准的毫秒时间戳
        date = new Date(timestamp);
      }
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.error('Invalid date from timestamp:', timestamp);
        return 'Invalid date';
      }
      
      // 将时间戳转换为YYYY-MM-DD格式
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error';
    }
  };

const timeAgo = (timestamp: number) => {
      if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        console.error('Invalid timestamp provided:', timestamp);
        return 'Just now'; // Fallback for invalid timestamps
      }
    
      //const now = new Date();
      const secondsAgo = Math.floor(timestamp / 1000); // Use .getTime() for clarity
      const minutesAgo = Math.floor(secondsAgo / 60);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const daysAgo = Math.floor(hoursAgo / 24);
      const yearsAgo = Math.floor(daysAgo / 365);
    
      if (yearsAgo >= 1) {
        return `${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`;
      } else if (daysAgo >= 1) {
        return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
      } else if (hoursAgo >= 1) {
        return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      } else if (minutesAgo >= 1) {
        return `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
      } else {
        return `${secondsAgo} second${secondsAgo !== 1 ? 's' : ''} ago`;
      }
    }
  const isPostLiked = (post: AIPost) => {
    return localLikes[post.id] !== undefined ? localLikes[post.id] : post.like;
  };

  const parseOptionText = (optionText: string) => {
    // 解析选项格式 "A: 选项内容"
    const match = optionText.match(/^([A-Z]):\s*(.+)$/);
    if (match) {
      return {
        letter: match[1],
        content: match[2]
      };
    }
    return {
      letter: "",
      content: optionText
    };
  };

  // 从图片/视频URL中提取文件名称（不包含扩展名）
  const getImageNameFromUrl = (mediaUrl: string): string => {
    if (!mediaUrl) return 'No Media';
    
    try {
      // 从URL中提取文件名
      const filename = mediaUrl.split('/').pop() || '';
      
      // 匹配 EP{数字}-{数字}.{扩展名} 格式并提取名称部分（支持多种文件格式）
      const match = filename.match(/^(EP\d+-\d+)\.(png|jpg|jpeg|mp4|avi|mov|webm)$/i);
      if (match) {
        return match[1]; // 返回 EP15-7 这样的格式
      }
      
      // 如果不匹配预期格式，返回文件名（去掉扩展名）
      return filename.replace(/\.[^/.]+$/, '') || 'Unknown';
    } catch (error) {
      console.error('Failed to extract media name from URL:', error);
      return 'Error';
    }
  };

  const handleExpandComments = (postId: number) => {
    setExpandedCommentCounts(prev => {
      const currentCount = prev[postId] || INITIAL_COMMENTS;
      const totalComments = posts.find(p => p.id === postId)?.tweetCommentVoList.length || 0;
      
      // 如果当前显示的数量小于总评论数，则增加显示数量
      if (currentCount < totalComments) {
        // 如果剩余评论数小于等于COMMENTS_PER_PAGE，则显示所有评论
        const nextCount = Math.min(currentCount + COMMENTS_PER_PAGE, totalComments);
        return { ...prev, [postId]: nextCount };
      }
      // 如果已经显示所有评论，则折叠回初始数量
      return { ...prev, [postId]: INITIAL_COMMENTS };
    });
  };

  const renderComment = (comment: TweetComment, level = 0) => (
    <div key={comment.id} className={`flex items-start space-x-3 ${level > 0 ? 'ml-8' : ''} py-0 border-b border-gray-100 last:border-b-0`}>
      <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-200 mt-2">
        {comment.authorAvatar && (
          <img
            src={comment.authorAvatar}
            alt={`${comment.nickName} avatar`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 -mt-0.5">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{comment.nickName}</span>
          {comment.createTime && (
            <span className="text-xs text-gray-500">{timeAgo(comment.createTime)}</span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-[-6px]">{comment.content}</p>
        
        {/* 嵌套评论 - 支持两种字段名 */}
        {(comment.tweetCommentVoList || comment.tweetCommentVo) && (
          <div className="mt-0 space-y-0">
            {(comment.tweetCommentVoList || comment.tweetCommentVo || []).map(reply => 
              renderComment(reply, level + 1)
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderComments = (post: AIPost) => {
    const comments = post.tweetCommentVoList;
    const expandedCount = expandedCommentCounts[post.id] || INITIAL_COMMENTS;
    const hasMoreComments = comments.length > expandedCount;

    return (
      <div className="mt-4 space-y-0">
        {comments.slice(0, expandedCount).map(comment => renderComment(comment))}
        
        {hasMoreComments && (
          <button
            onClick={() => handleExpandComments(post.id)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center space-x-1"
          >
            <span>Show {Math.min(COMMENTS_PER_PAGE, comments.length - expandedCount)} more comments</span>
            <ChevronDown size={16} />
          </button>
        )}
        
        {expandedCount > INITIAL_COMMENTS && (
          <button
            onClick={() => handleExpandComments(post.id)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center space-x-1"
          >
            <span>Show less</span>
            <ChevronUp size={16} />
          </button>
        )}
      </div>
    );
  };

  const toggleVideoPlayback = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const videoElement = videoRefs.current[postId];
    
    if (!videoElement) return;
    
    if (videoElement.paused) {
      // 在播放当前视频之前，先暂停其他所有正在播放的视频
      Object.keys(videoRefs.current).forEach(key => {
        const otherPostId = parseInt(key);
        const otherVideo = videoRefs.current[otherPostId];
        
        // 暂停其他视频（除了当前要播放的视频）
        if (otherVideo && otherPostId !== postId && !otherVideo.paused) {
          otherVideo.pause();
          console.log(`Pausing video ${otherPostId} to play video ${postId}`);
        }
      });
      
      // 更新所有其他视频的播放状态为false
      setPlayingVideos(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          const otherPostId = parseInt(key);
          if (otherPostId !== postId) {
            newState[otherPostId] = false;
          }
        });
        return newState;
      });
      
      // 播放当前视频
      videoElement.play().then(() => {
        setPlayingVideos(prev => ({ ...prev, [postId]: true }));
        console.log(`Playing video ${postId}`);
      }).catch(error => {
        console.error("Error playing video:", error);
        toast({
          title: "Video playback error",
          description: "Could not play the video"
        });
      });
    } else {
      // 暂停当前视频
      videoElement.pause();
      setPlayingVideos(prev => ({ ...prev, [postId]: false }));
      console.log(`Pausing video ${postId}`);
    }
  };

  const toggleFullscreen = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const videoElement = videoRefs.current[postId];
    
    if (!videoElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error("Error exiting fullscreen:", err);
      });
    } else {
      videoElement.requestFullscreen().catch(err => {
        console.error("Error requesting fullscreen:", err);
        toast({
          title: "Fullscreen error",
          description: "Could not enter fullscreen mode"
        });
      });
    }
  };

  const handleVideoError = (postId: number, e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e);
    setVideoErrors(prev => ({ 
      ...prev, 
      [postId]: "Failed to load video" 
    }));
    setVideoLoading(prev => ({ ...prev, [postId]: false }));
  };

  const handleVideoLoadStart = (postId: number) => {
    setVideoLoading(prev => ({ ...prev, [postId]: true }));
    setVideoErrors(prev => ({ ...prev, [postId]: "" }));
  };

  const handleVideoLoadedData = (postId: number) => {
    setVideoLoading(prev => ({ ...prev, [postId]: false }));
  };

  const handleVideoPlay = (postId: number) => {
    // 当视频开始播放时，暂停其他所有正在播放的视频
    Object.keys(videoRefs.current).forEach(key => {
      const otherPostId = parseInt(key);
      const otherVideo = videoRefs.current[otherPostId];
      
      // 暂停其他视频（除了当前要播放的视频）
      if (otherVideo && otherPostId !== postId && !otherVideo.paused) {
        otherVideo.pause();
        console.log(`Auto-pausing video ${otherPostId} because video ${postId} started playing`);
      }
    });
    
    // 更新所有其他视频的播放状态为false
    setPlayingVideos(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        const otherPostId = parseInt(key);
        if (otherPostId !== postId) {
          newState[otherPostId] = false;
        }
      });
      // 设置当前视频为播放状态
      newState[postId] = true;
      return newState;
    });
    
    console.log(`Video ${postId} started playing`);
  };

  const retryVideoLoad = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const videoElement = videoRefs.current[postId];
    if (!videoElement) return;
    
    setVideoErrors(prev => ({ ...prev, [postId]: "" }));
    setVideoLoading(prev => ({ ...prev, [postId]: true }));
    
    // Force reload the video
    videoElement.load();
  };

  // 添加一个新的useEffect专门监控posts的变化
  useEffect(() => {
    console.log(`🖥️ [SceneThreadFeed] posts数组变化 - 长度: ${posts.length}, 页码: ${currentPage}`);
    if (posts.length > 0) {
      // 记录所有ID，便于对比
      const allIds = posts.map(p => p.id).join(', ');
      console.log(`🖥️ [SceneThreadFeed] 当前所有posts IDs: ${allIds}`);
      
      // 检查前5条和后5条，避免日志太长
      const firstFew = posts.slice(0, Math.min(5, posts.length));
      console.log(`🖥️ [SceneThreadFeed] 前${firstFew.length}条数据:`, 
        firstFew.map(p => ({ id: p.id, content: p.content.substring(0, 20) })));
      
      if (posts.length > 5) {
        const lastFew = posts.slice(-Math.min(5, posts.length - 5));
        console.log(`🖥️ [SceneThreadFeed] 后${lastFew.length}条数据:`, 
          lastFew.map(p => ({ id: p.id, content: p.content.substring(0, 20) })));
      }
    }
  }, [posts, currentPage]);

  // 优化渲染，减少不必要的重新计算
  const postsList = React.useMemo(() => {
    console.log(`🖥️ [SceneThreadFeed] 渲染postsList - 数据长度: ${posts.length}`);
    
    // 记录排序前的时间信息
    if (posts.length > 0) {
      const firstPost = posts[0];
      const lastPost = posts[posts.length - 1];
      console.log(`🔄 [SceneThreadFeed] 排序前 - 第一条: ID=${firstPost.id}, 媒体=${firstPost.imgUrl || firstPost.videoUrl}`);
      console.log(`🔄 [SceneThreadFeed] 排序前 - 最后一条: ID=${lastPost.id}, 媒体=${lastPost.imgUrl || lastPost.videoUrl}`);
    }
    
    // 提取媒体信息的函数
    const getMediaInfo = (post: AIPost): { epNumber: number, sequence: number } => {
      // 默认值
      const defaultInfo = { epNumber: 9999, sequence: 9999 };
      
      // 检查函数，从URL中提取EP编号和序列号
      const extractInfo = (url: string | undefined): { epNumber: number, sequence: number } | null => {
        if (!url) return null;
        
        // 尝试匹配 EP数字-数字 格式
        const match = url.match(/EP(\d+)-(\d+)\.(png|jpg|jpeg|mp4|avi|mov)/i);
        if (match) {
          return {
            epNumber: parseInt(match[1]),  // EP编号
            sequence: parseInt(match[2])   // 序列号
          };
        }
        return null;
      };
      
      // 优先从图片URL提取
      const imgInfo = extractInfo(post.imgUrl);
      if (imgInfo) return imgInfo;
      
      // 如果图片URL没有提取到，尝试从视频URL提取
      const videoInfo = extractInfo(post.videoUrl);
      if (videoInfo) return videoInfo;
      
      // 都没提取到，返回默认值
      return defaultInfo;
    };
    
    // 临时修改：不进行排序，直接使用原始数组
    const sortedPosts = [...posts];
    
    // 原排序代码（暂时注释掉）
    // // 按照EP编号和序列号排序
    // const sortedPosts = [...posts].sort((a, b) => {
    //   const infoA = getMediaInfo(a);
    //   const infoB = getMediaInfo(b);
    //   
    //   // 首先按EP编号排序
    //   if (infoA.epNumber !== infoB.epNumber) {
    //     return infoA.epNumber - infoB.epNumber;
    //   }
    //   
    //   // 如果EP编号相同，按序列号排序
    //   return infoA.sequence - infoB.sequence;
    // });
    
    // 记录原始数据信息
    if (sortedPosts.length > 0) {
      console.log(`🔄 [SceneThreadFeed] 原始数据顺序:`);
      sortedPosts.forEach((post, index) => {
        const mediaUrl = post.imgUrl || post.videoUrl || 'no-media';
        console.log(`   ${index+1}. ID=${post.id}, 媒体=${mediaUrl}`);
      });
    }
    
    const result = sortedPosts.map(post => (
      <div
        key={post.id}
        className="bg-white dark:bg-gray-800 transition hover:shadow-md"
      >
        {/* Hidden: NPC名称、头像和内容 */}
        {/* 
        <div className="flex items-start space-x-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mt-3">
            {
              <img
                src={`/images/scene/headDir_${post.npcId}.png`}
                alt={`${post.npcName || 'NPC'} avatar`}
                className="h-full w-full object-cover"
              />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-[#4A95E7] text-base capitalize">
                {getNpcName(post.npcId)}
              </span>
              <span className="text-gray-400 text-sm">{timeAgo(post.createTime)}</span>
            </div>
            <p className="text-gray-600 text-sm mt-0.3 line-clamp-2 leading-[0.8]">
              {post.content}
            </p>
          </div>
        </div>
        */}
        
        {post.videoUrl ? (
          <div className="overflow-hidden relative group">
            <video
              ref={el => { videoRefs.current[post.id] = el; }}
              src={post.videoUrl}
              className="w-full h-auto object-cover"
              controls
              controlsList="nodownload"
              preload="metadata"
              playsInline
              poster={post.imgUrl || undefined}
              onClick={(e) => e.stopPropagation()}
              onPlay={() => handleVideoPlay(post.id)}
              onPause={() => setPlayingVideos(prev => ({ ...prev, [post.id]: false }))}
              onEnded={() => setPlayingVideos(prev => ({ ...prev, [post.id]: false }))}
              onError={e => handleVideoError(post.id, e)}
              onLoadStart={() => handleVideoLoadStart(post.id)}
              onLoadedData={() => handleVideoLoadedData(post.id)}
            >
              <source src={post.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {videoLoading[post.id] && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Loader2 size={32} className="text-white animate-spin" />
                  <span className="text-white text-sm mt-2">Loading video...</span>
                </div>
              </div>
            )}
            
            {videoErrors[post.id] && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="flex flex-col items-center text-center p-4">
                  <AlertTriangle size={32} className="text-red-500 mb-2" />
                  <span className="text-white text-sm mb-3">{videoErrors[post.id]}</span>
                  <button 
                    className="px-4 py-2 bg-white text-black text-sm rounded-md hover:bg-gray-100" 
                    onClick={(e) => retryVideoLoad(post.id, e)}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            
            {!playingVideos[post.id] && !videoLoading[post.id] && !videoErrors[post.id] && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={(e) => toggleVideoPlayback(post.id, e)}
              >
                <div className="w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                  <Play size={28} className="text-gray-800 ml-1" />
                </div>
              </div>
            )}
            
            {/* Floating containers at bottom of video */}
            <div className="absolute bottom-2 left-2 right-12 flex items-center justify-between">
              {/* Left side: Comment and Like containers */}
              <div className="flex items-center space-x-2">
                {/* Comment container */}
                <div className="flex items-center space-x-2">
                  <button 
                    className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                    onClick={() => toggleExpand(post.id)}
                  >
                    <MessageSquare size={16} />
                    <span className="text-xs">{post.commentCount}</span>
                  </button>
                  {post.commentCount > 0 && (
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="bg-white hover:bg-gray-100 text-black p-1 rounded-md transition-colors shadow-sm"
                      title={expandedPosts[post.id] ? "折叠评论" : "展开评论"}
                    >
                      {expandedPosts[post.id] ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Like container */}
                <button 
                  className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                  onClick={() => handleLike(post)}
                >
                  <Heart size={16} className={isPostLiked(post) ? "fill-red-500 text-red-500" : ""} />
                  <span className="text-xs">{post.likeCount}</span>
                </button>
              </div>

              {/* Right side: Tag container */}
              <div className="bg-white text-black px-2 py-1 rounded-md text-xs shadow-sm">
                {getImageNameFromUrl(post.videoUrl)}
              </div>
            </div>
            
            <div className="absolute bottom-2 right-2">
              <button
                className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                onClick={(e) => toggleFullscreen(post.id, e)}
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        ) : post.imgUrl && (
          <div className="overflow-hidden relative">
            <img
              src={post.imgUrl}
              alt="Post image"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            {/* Floating containers at bottom of image */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              {/* Left side: Comment and Like containers */}
              <div className="flex items-center space-x-2">
                {/* Comment container */}
                <div className="flex items-center space-x-2">
                  <button 
                    className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                    onClick={() => toggleExpand(post.id)}
                  >
                    <MessageSquare size={16} />
                    <span className="text-xs">{post.commentCount}</span>
                  </button>
                  {post.commentCount > 0 && (
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="bg-white hover:bg-gray-100 text-black p-1 rounded-md transition-colors shadow-sm"
                      title={expandedPosts[post.id] ? "折叠评论" : "展开评论"}
                    >
                      {expandedPosts[post.id] ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Like container */}
                <button 
                  className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                  onClick={() => handleLike(post)}
                >
                  <Heart size={16} className={isPostLiked(post) ? "fill-red-500 text-red-500" : ""} />
                  <span className="text-xs">{post.likeCount}</span>
                </button>
              </div>

              {/* Right side: Tag container */}
              <div className="bg-white text-black px-2 py-1 rounded-md text-xs shadow-sm">
                {getImageNameFromUrl(post.imgUrl)}
              </div>
            </div>
          </div>
        )}

        {/* Fallback for posts without images or videos */}
        {!post.imgUrl && !post.videoUrl && (
          <div className="flex items-center justify-between">
            {/* Left side: Comment and Like containers */}
            <div className="flex items-center space-x-2">
              {/* Comment container */}
              <div className="flex items-center space-x-2">
                <button 
                  className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                  onClick={() => toggleExpand(post.id)}
                >
                  <MessageSquare size={16} />
                  <span className="text-xs">{post.commentCount}</span>
                </button>
                {post.commentCount > 0 && (
                  <button
                    onClick={() => toggleExpand(post.id)}
                    className="bg-white hover:bg-gray-100 text-black p-1 rounded-md transition-colors shadow-sm"
                    title={expandedPosts[post.id] ? "折叠评论" : "展开评论"}
                  >
                    {expandedPosts[post.id] ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                )}
              </div>
              
              {/* Like container */}
              <button 
                className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                onClick={() => handleLike(post)}
              >
                <Heart size={16} className={isPostLiked(post) ? "fill-red-500 text-red-500" : ""} />
                <span className="text-xs">{post.likeCount}</span>
              </button>
            </div>

            {/* Right side: Tag container */}
            <div className="bg-white text-black px-2 py-1 rounded-md text-xs shadow-sm">
              No Media
            </div>
          </div>
        )}

        {expandedPosts[post.id] && (
          <div className="mt-1 space-y-1">
            {isSignedIn && (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newComment[post.id] || ""}
                  onChange={(e) => handleCommentChange(post.id, e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => handleCommentSubmit(post)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            )}

            {renderComments(post)}
          </div>
        )}
      </div>
    ))
    return result;
  }, [posts, expandedPosts, newComment, localLikes, playingVideos, videoLoading, videoErrors, expandedCommentCounts]);

  // 检查是否有数据但未显示
  useEffect(() => {
    if (posts.length > 0 && !loading && postsList.length === 0) {
      console.warn('🚨 [SceneThreadFeed] 异常情况: 有posts数据但postsList为空!');
      console.warn('🚨 [SceneThreadFeed] posts.length =', posts.length);
      console.warn('🚨 [SceneThreadFeed] postsList.length =', postsList.length);
      console.warn('🚨 [SceneThreadFeed] loading =', loading);
      console.warn('🚨 [SceneThreadFeed] loadingMore =', loadingMore);
    }
    
    if (postsList.length !== posts.length) {
      console.warn(`🚨 [SceneThreadFeed] postsList长度(${postsList.length})与posts长度(${posts.length})不一致!`);
    }
  }, [posts.length, postsList.length, loading, loadingMore]);

  // 在return之前添加日志
  console.log(`🖥️ [SceneThreadFeed] 即将渲染 - posts长度: ${posts.length}, loading: ${loading}, hasMore: ${hasMore}, loadingMore: ${loadingMore}`);

  // 添加对loading状态的额外处理
  useEffect(() => {
    console.log(`[SceneThreadFeed] loading状态变化: ${loading}`);
    if (!loading && posts.length > 0) {
      console.log('[SceneThreadFeed] 加载完成且有数据，强制更新DOM');
      // 如果需要，可以在这里添加额外的DOM更新逻辑
    }
  }, [loading, posts.length]);

  return (
    <div ref={feedRef} className={cn("flex flex-col space-y-0", className)}>
      {/* 根据showManga的值决定显示漫画还是推文 */}
      {showManga ? (
        /* 漫画内容 - 使用与推文相同的样式 */
        <>
          {imagesLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading comics...</p>
              </div>
            </div>
          ) : imagesError ? (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium mb-2">Error loading comics</h3>
                <p className="text-sm text-gray-400">{imagesError}</p>
              </div>
            </div>
          ) : images && images.length > 0 ? (
            <>
              {/* 显示选中ID的漫画 */}
              <div className="space-y-0">
                {images
                  .filter(image => selectedComicEpisode === null || image.Id === selectedComicEpisode)
                  .map(image => (
                    <div
                      key={image.Id}
                      className="bg-white dark:bg-gray-800 transition hover:shadow-md"
                    >
                      <div className="overflow-hidden relative">
                        <img
                          src={image.ImgUrl}
                          alt={`Comic panel ${image.Id}`}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                        {/* Floating containers at bottom of image */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          {/* Left side: Comment and Like containers */}
                          <div className="flex items-center space-x-2">
                            {/* Comment container */}
                            {/* <div className="flex items-center space-x-2">
                              <button 
                                className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                                onClick={() => toggleExpand(image.Id)}
                              >
                                <MessageSquare size={16} />
                                <span className="text-xs">0</span>
                              </button>
                              <button
                                onClick={() => toggleExpand(image.Id)}
                                className="bg-white hover:bg-gray-100 text-black p-1 rounded-md transition-colors shadow-sm"
                                title="展开评论"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div> */}
                            
                            {/* Like container */}
                            {/* <button 
                              className="flex items-center space-x-1 bg-white hover:bg-gray-100 text-black px-2 py-1 rounded-md text-sm transition-colors shadow-sm"
                              onClick={() => handleLike({id: image.Id} as AIPost)}
                            >
                              <Heart size={16} />
                              <span className="text-xs">0</span>
                            </button> */}
                          </div>

                          {/* Right side: Tag container */}
                          <div className="bg-white text-black px-2 py-1 rounded-md text-xs shadow-sm">
                            EP{image.Id}
                          </div>
                        </div>
                      </div>
                      
                      {expandedPosts[image.Id] && (
                        <div className="mt-1 space-y-1 px-4 pb-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={newComment[image.Id] || ""}
                              onChange={(e) => handleCommentChange(image.Id, e.target.value)}
                              placeholder="Write a comment..."
                              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              onClick={() => handleCommentSubmit({id: image.Id} as AIPost)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <Send size={20} />
                            </button>
                          </div>
                          
                          <div className="mt-4 space-y-0">
                            <div className="flex items-center justify-center py-8">
                              <div className="text-center text-gray-500">
                                <MessageSquare size={24} className="mx-auto mb-2" />
                                <p className="text-sm">No comments yet</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium mb-2">No comics available</h3>
                <p className="text-sm text-gray-400">There are no comics to display at the moment</p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 推文内容 */
        <>
          {posts.length === 0 && loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500">
              {selectedEpisode === null ? (
                <>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📺</div>
                    <h3 className="text-lg font-medium mb-2">Select an Episode</h3>
                    <p className="text-sm text-gray-400">
                      Click "Select EP" above to choose an episode and view its content22
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📷</div>
                    <h3 className="text-lg font-medium mb-2">No content for EP{selectedEpisode}</h3>
                    <p className="text-sm text-gray-400">
                      This episode may not have any images or videos yet
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 强制显示帖子内容，无论loading状态如何 */}
              <div className="space-y-0">
                {postsList}
              </div>
              
              {/* 底部加载更多区域 */}
              <div 
                ref={loadingRef} 
                className="py-4 flex justify-center items-center"
              >
                {loading || loadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-500">Loading more...</span>
                  </div>
                ) : hasMore ? (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-xs text-gray-400">Scroll to load more</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No more content</span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(SceneThreadFeed, (prevProps, nextProps) => {
  // 自定义比较函数，重点检查posts引用变化
  
  // 添加日志来追踪比较过程
  console.log('🔄 SceneThreadFeed比较props:', {
    prevPostsLength: prevProps.posts.length,
    nextPostsLength: nextProps.posts.length,
    prevPage: prevProps.currentPage,
    nextPage: nextProps.currentPage,
    prevSelectedComicEpisode: prevProps.selectedComicEpisode,
    nextSelectedComicEpisode: nextProps.selectedComicEpisode,
    postsRefChanged: prevProps.posts !== nextProps.posts
  });

  // ===== 关键检查 =====
  // 1. 检查posts引用是否变化 - 最重要
  const postsRefChanged = prevProps.posts !== nextProps.posts;
  
  // 2. 检查page和loading - 也很重要
  const pageChanged = prevProps.currentPage !== nextProps.currentPage;
  const loadingChanged = prevProps.loading !== nextProps.loading;
  
  // 3. 检查selectedComicEpisode - 对于漫画切换很重要
  const selectedComicEpisodeChanged = prevProps.selectedComicEpisode !== nextProps.selectedComicEpisode;
  
  // 直接返回是否需要重新渲染
  // 只要有任何一个关键属性变化，就重新渲染
  const shouldRerender = postsRefChanged || pageChanged || loadingChanged || selectedComicEpisodeChanged;
  
  if (shouldRerender) {
    console.log('🔄 SceneThreadFeed将重新渲染:', 
      postsRefChanged ? '因为posts数组变化' : 
      pageChanged ? '因为页码变化' : 
      selectedComicEpisodeChanged ? '因为selectedComicEpisode变化' :
      '因为loading状态变化');
  }
  
  // false表示需要重新渲染，true表示可以跳过渲染
  return !shouldRerender;
});
