import React, { useState, useRef, useEffect } from 'react';
import { AIPost, TweetComment } from '@/types/drama';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Heart, ChevronDown, ChevronUp, Share2, Send, Maximize, Volume2, Play, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getNpcName, NpcName } from "@/config/npc";
import { websocketService } from '@/services/websocket';
import { Commands } from '@/services/websocket';

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
  onPageChange
}) => {
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [chosenOptions, setChosenOptions] = useState<Record<number, number>>({});
  const [localLikes, setLocalLikes] = useState<Record<number, boolean>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<number, boolean>>({});
  const [videoLoading, setVideoLoading] = useState<Record<number, boolean>>({});
  const [videoErrors, setVideoErrors] = useState<Record<number, string>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  
  // 分页相关状态
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const pageSize = 10; // 每页显示10条推文

  // 使用useMemo缓存分页器UI，减少重新渲染
  const paginationControls = React.useMemo(() => (
    <div className="flex justify-between items-center mt-4 px-2">
      <div></div> {/* 左侧空白占位 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => currentPage > 0 && onPageChange?.(currentPage - 1)}
          disabled={currentPage === 0 || pageLoading || loading}
          className={`flex items-center justify-center p-2 rounded-full ${
            currentPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>
        
        <button
          onClick={() => currentPage < totalPages - 1 && onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || pageLoading || loading}
          className={`flex items-center justify-center p-2 rounded-full ${
            currentPage >= totalPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'
          }`}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div></div> {/* 右侧空白占位 */}
    </div>
  ), [currentPage, totalPages, pageLoading, loading, onPageChange]);

  // 计算总页数（根据推文总数和每页显示数量）
  useEffect(() => {
    // 这里的逻辑应该在实际应用中根据后端返回的总记录数来计算
    // 如果后端不返回总记录数，可以根据当前页是否有满额数据来判断是否有下一页
    const hasFullPage = posts.length >= pageSize;
    const estimatedTotalPages = Math.max(1, currentPage + (hasFullPage ? 2 : 1));
    setTotalPages(estimatedTotalPages);
  }, [posts, currentPage, pageSize]);

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
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

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

  const renderComment = (comment: TweetComment, level = 0) => (
    <div key={comment.id} className={`flex items-start space-x-3 mb-2 ${level > 0 ? 'ml-8' : ''}`}>
      <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mt-2">
        {comment.authorAvatar && (
          <img
            src={comment.authorAvatar}
            alt={`${comment.nickName} avatar`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-[-5px]">
          <span className="font-medium text-sm">{comment.nickName}</span>
          {comment.createTime && (
            <span className="text-xs text-gray-500">{formatTime(comment.createTime)}</span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0">{comment.content}</p>
        
        {/* 嵌套评论 - 支持两种字段名 */}
        {(comment.tweetCommentVoList || comment.tweetCommentVo) && (
          <div className="mt-2 space-y-2">
            {(comment.tweetCommentVoList || comment.tweetCommentVo || []).map(reply => 
              renderComment(reply, level + 1)
            )}
          </div>
        )}
      </div>
    </div>
  );

  const toggleVideoPlayback = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const videoElement = videoRefs.current[postId];
    
    if (!videoElement) return;
    
    if (videoElement.paused) {
      videoElement.play().then(() => {
        setPlayingVideos(prev => ({ ...prev, [postId]: true }));
      }).catch(error => {
        console.error("Error playing video:", error);
        toast({
          title: "Video playback error",
          description: "Could not play the video"
        });
      });
    } else {
      videoElement.pause();
      setPlayingVideos(prev => ({ ...prev, [postId]: false }));
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

  const retryVideoLoad = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const videoElement = videoRefs.current[postId];
    if (!videoElement) return;
    
    setVideoErrors(prev => ({ ...prev, [postId]: "" }));
    setVideoLoading(prev => ({ ...prev, [postId]: true }));
    
    // Force reload the video
    videoElement.load();
  };

  // 优化渲染，减少不必要的重新计算
  const postsList = React.useMemo(() => (
    posts.map(post => (
      <div
        key={post.id}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition hover:shadow-md"
      >
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
              <span className="text-gray-400 text-sm">{formatTime(post.createTime)}</span>
            </div>
            <p className="text-gray-600 text-sm mt-0.3 line-clamp-2 leading-[0.8]">
              {post.content}
            </p>
          </div>
        </div>
        
        {post.videoUrl ? (
          <div className="mt-3 rounded-xl overflow-hidden relative group">
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
            
            <div className="absolute bottom-0 right-0 p-2">
              <button
                className="w-8 h-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white"
                onClick={(e) => toggleFullscreen(post.id, e)}
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        ) : post.imgUrl && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img
              src={post.imgUrl}
              alt="Post image"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <button 
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
            onClick={() => toggleExpand(post.id)}
          >
            <MessageSquare size={20} />
            <span className="text-sm">{post.commentCount}</span>
          </button>
          
          <button 
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
            onClick={() => handleLike(post)}
          >
            <Heart size={20} className={isPostLiked(post) ? "fill-red-500 text-red-500" : ""} />
            <span className="text-sm">{post.likeCount}</span>
          </button>

          <button 
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 ml-auto"
            onClick={() => toggleExpand(post.id)}
          >
            {expandedPosts[post.id] ? (
              <>
                <ChevronUp size={20} />
              </>
            ) : (
              <>
                <ChevronDown size={20} />
                <span className="text-sm">Expand</span>
              </>
            )}
          </button>
        </div>

        {expandedPosts[post.id] && (
          <div className="mt-4 space-y-4">
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

            {post.tweetCommentVoList.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    ))
  ), [posts, expandedPosts, newComment, localLikes]);

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {loading || pageLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          No posts yet
        </div>
      ) : (
        <>
          {postsList}
          {paginationControls}
        </>
      )}
    </div>
  );
};

export default React.memo(SceneThreadFeed, (prevProps, nextProps) => {
  // 自定义比较函数，只有在关键props变化时才重新渲染
  // 比较posts数组长度和当前页面是否变化
  const postsLengthEqual = prevProps.posts.length === nextProps.posts.length;
  const postsIdEqual = prevProps.posts.every((post, index) => 
    nextProps.posts[index]?.id === post.id
  );
  const pageEqual = prevProps.currentPage === nextProps.currentPage;
  const loadingEqual = prevProps.loading === nextProps.loading;

  // 如果主要的props没变，返回true表示不需要重新渲染
  return postsLengthEqual && postsIdEqual && pageEqual && loadingEqual;
});
