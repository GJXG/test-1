import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CocosEmbed, { useCocos, globalSetIframeUrl, iframeRef } from '@/components/CocosEmbed';
import SceneThreadFeed from '@/components/SceneThreadFeed';
import { CharacterHistory, AIPost, VoteHistory, ChatMessage } from '@/types/drama';
// 导入NPC相关函数
import { getNpcName } from '@/config/npc';
// 推文模块
  // 拉取推文
  // 推文操作 
  // 投票拉取历史记录
  
import { toast } from '@/components/ui/use-toast';
import CharacterHistorySidebar from '@/components/CharacterHistorySidebar';
import { websocketService } from '@/services/websocket';
import { Commands } from '@/services/websocket';

// 定义EP列表接口
interface EpListItem {
  id: number;
  npcList: number[];
  playerCount: number;
  bannerUrl: string;
  order: number;
  tweetUrl: string;
  epList: string[];
}

interface UserInfo {
  userId: string;
  id: string;
  location: string;
  avatar: string;
  points: number;
}

// Build Drama页面固定使用场景ID=3（偶像场景）
const FIXED_SCENE_ID = '3';

// 添加根据NPC ID获取roomId的辅助函数（只支持偶像场景）
const getNpcRoomId = (npcId: number): string => {
  // 偶像场景 (roomId: 3)
  if ([10012, 10009, 10006, 10022].includes(npcId)) {
    return '3';
  }
  
  // 默认返回偶像场景ID
  return '3';
};

// 添加根据场景ID过滤NPC的函数（只显示偶像场景NPC）
const filterNpcsByScene = (characters: CharacterHistory[], sceneId: string): CharacterHistory[] => {
  // 只显示偶像场景 (roomId: 3) 的NPC
  return characters.filter(character => {
    return [10012, 10009, 10006, 10022].includes(character.npcId);
  });
};

// 添加根据场景ID过滤推文的函数
const filterPostsByScene = (posts: AIPost[], sceneId: string): AIPost[] => {
  // 固定返回偶像场景的推文
  return posts.filter(post => post.roomId === FIXED_SCENE_ID || post.roomId === 3);
};

// 添加根据场景过滤投票的函数
const filterVotesByScene = (votes: VoteHistory[], sceneId: string): VoteHistory[] => {
  // 固定返回偶像场景的投票
  return votes.filter(vote => vote.roomId === FIXED_SCENE_ID);
};

// 根据选择的EP过滤推文
const filterPostsByEpisode = (posts: AIPost[], selectedEpisode: number | null): AIPost[] => {
  if (selectedEpisode === null) {
    return [];
  }
  
  return posts.filter(post => {
    // 从imgUrl或videoUrl中提取EP编号
    const extractEpNumber = (url: string | undefined): number | null => {
      if (!url) return null;
      const match = url.match(/EP(\d+)-/);
      return match ? parseInt(match[1]) : null;
    };
    
    const imgEpNumber = extractEpNumber(post.imgUrl);
    const videoEpNumber = extractEpNumber(post.videoUrl);
    
    return imgEpNumber === selectedEpisode || videoEpNumber === selectedEpisode;
  });
};

const BuildDrama: React.FC = () => {
  const navigate = useNavigate();
  
  // 固定使用偶像场景ID
  const effectiveSceneId = FIXED_SCENE_ID;
  const gameSceneId = FIXED_SCENE_ID;
  
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [characterHistory, setCharacterHistory] = useState<CharacterHistory[]>([]);
  const [aiPosts, setAiPosts] = useState<AIPost[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [votesLoading, setVotesLoading] = useState<boolean>(true);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { sendMessageToGame, navigateToScene } = useCocos();
  const [isUserInfoFolded, setIsUserInfoFolded] = useState(false);
  const [npcSwitchLoading, setNpcSwitchLoading] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [epListData, setEpListData] = useState<EpListItem[]>([]);
  const [epListLoading, setEpListLoading] = useState<boolean>(true);

  // Check login status on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');
    
    if (storedUserInfo && storedLoginStatus) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsSignedIn(true);
    }
  }, []);

  // 确保使用正确的iframe URL并初始化WebSocket连接
  useEffect(() => {
    // 使用更可靠的方法设置iframe URL
    const setupIframe = () => {
      // 1. 直接修改iframe的src属性
      if (iframeRef.current) {
        console.log('[BuildDrama] 直接设置iframe.src: https://dramai.world/test');
        iframeRef.current.src = "https://dramai.world/test";
      }
      
      // 2. 同时也通过全局函数设置
      if (globalSetIframeUrl) {
        globalSetIframeUrl("https://dramai.world/test");
        console.log('[BuildDrama] 设置iframe URL: https://dramai.world/test');
      }
      
      // 3. 存储当前页面的iframe配置到localStorage
      localStorage.setItem('currentIframeUrl', 'https://dramai.world/test');
      localStorage.setItem('currentPage', 'build-drama');
      
      // 4. 等待一小段时间确保iframe URL已更新
      setTimeout(() => {
        // 发送导航消息到iframe
        navigateToScene("Custom");
        console.log('[BuildDrama] 页面刷新后重新发送导航消息到iframe: target = Custom');
      }, 300); // 增加延迟时间，确保iframe有足够时间加载
    };
    
    // 立即执行一次
    setupIframe();
    
    // 再次延迟执行一次，以防第一次执行时iframe还未完全初始化
    const secondAttemptTimeout = setTimeout(setupIframe, 1000);
    
    // 确保WebSocket连接已初始化
    if (!websocketService.isConnectionOpen()) {
      console.log('[BuildDrama] WebSocket未连接，尝试初始化连接...');
      // 这里不需要显式调用connect，因为isConnectionOpen检查会触发内部重连机制
      // 但我们可以添加一个延迟检查
      const checkConnectionTimeout = setTimeout(() => {
        if (!websocketService.isConnectionOpen()) {
          console.warn('[BuildDrama] WebSocket连接仍未建立，可能需要刷新页面');
        } else {
          console.log('[BuildDrama] WebSocket连接已成功建立');
        }
      }, 3000);
      
      return () => {
        clearTimeout(checkConnectionTimeout);
        clearTimeout(secondAttemptTimeout);
      };
    }
    
    return () => {
      clearTimeout(secondAttemptTimeout);
    };
  }, []); // 空依赖数组，确保只在组件挂载时执行一次

  // 使用useRef保存当前页码，避免闭包问题
  const currentPageRef = React.useRef(currentPage);
  
  // 当currentPage变化时更新ref
  React.useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // 添加一个ref来跟踪数据加载状态
  const dataLoadedRef = React.useRef<{[key: string]: boolean}>({});
  
  // 添加一个请求跟踪对象，用于避免短时间内重复请求
  const requestTrackerRef = React.useRef<{
    [key: string]: {
      timestamp: number;
      requestId: string;
    }
  }>({});
  
  // 添加一个函数来检查并标记请求，避免重复
  const shouldSendRequest = React.useCallback((command: number, roomId: number): boolean => {
    const key = `${command}_${roomId}`;
    const now = Date.now();
    const lastRequest = requestTrackerRef.current[key];
    
    // 如果之前没有发送过请求，或者上次请求已经超过5秒，则允许发送
    if (!lastRequest || now - lastRequest.timestamp > 5000) {
      // 更新请求跟踪信息
      requestTrackerRef.current[key] = {
        timestamp: now,
        requestId: `${now}_${Math.random().toString(36).substring(2, 9)}`
      };
      console.log(`⏱️ [BuildDrama] 允许发送请求: ${command}, 房间ID: ${roomId}, 请求ID: ${requestTrackerRef.current[key].requestId}`);
      return true;
    }
    
    console.log(`⏱️ [BuildDrama] 忽略重复请求: ${command}, 房间ID: ${roomId}, 距上次请求: ${now - lastRequest.timestamp}ms`);
    return false;
  }, []);

  // 处理事件处理器和事件依赖项
  const handleSceneFeed = React.useCallback((data: any) => {
    if (data && data.tweetVoList) {
      const filteredTweets = data.tweetVoList;
      
      console.log('🔍 [BuildDrama] Received scene feed data:', {
        roomId: data.roomId,
        effectiveSceneId: effectiveSceneId,
        totalTweetCount: data.tweetVoList.length,
        filteredTweetCount: filteredTweets.length,
        currentPage: currentPageRef.current,
        firstTweet: filteredTweets.length > 0 ? filteredTweets[0].id : 'none',
        lastTweetId: filteredTweets.length > 0 ? filteredTweets[filteredTweets.length - 1].id : 'none'
      });
      
      setPostsLoading(false);
      
      console.log('🔄 [BuildDrama] 接收到的完整推文ID列表:', filteredTweets.map((t: any) => t.id).join(', '));
      
      // 如果是翻页加载，追加数据；否则替换数据
      if (currentPageRef.current > 0) {
        console.log(`🔄 [BuildDrama] 这是翻页加载 (page ${currentPageRef.current})，将追加新数据`);
        
        // 使用函数式更新避免依赖aiPosts
        setAiPosts(prevPosts => {
          // 记录当前已有的推文ID
          const existingIds = new Set(prevPosts.map(post => post.id));
          console.log('🔄 [BuildDrama] 当前已有推文IDs集合大小:', existingIds.size);
          
          // 只保留还不存在的新推文
          const uniqueNewPosts = filteredTweets.filter(
            (post: any) => !existingIds.has(post.id)
          );
          
          console.log(`🔄 [BuildDrama] 过滤出 ${uniqueNewPosts.length} 条新推文，当前页码: ${currentPageRef.current}`);
          if (uniqueNewPosts.length > 0) {
            console.log('🔄 [BuildDrama] 新推文IDs:', uniqueNewPosts.map((p: any) => p.id).join(', '));
          } else {
            console.log('🔄 [BuildDrama] 没有新的推文ID');
          }
          
          // 合并现有推文和新推文
          if (uniqueNewPosts.length > 0) {
            console.log(`🔄 [BuildDrama] 追加 ${uniqueNewPosts.length} 条新推文到现有 ${prevPosts.length} 条`);
            const mergedPosts = [...prevPosts, ...uniqueNewPosts];
            console.log('🔄 [BuildDrama] 合并后总推文数:', mergedPosts.length);
            return mergedPosts;
          } else {
            console.log('🔄 [BuildDrama] 没有新数据可追加，保持原有数据不变');
            return prevPosts;
          }
        });
      } else {
        console.log(`🔄 [BuildDrama] 这是初始加载或重新加载 (page ${currentPageRef.current})，将替换现有数据`);
        setAiPosts(filteredTweets);
      }
    } else {
      console.warn('🔍 [BuildDrama] No valid scene feed data received:', data);
      setPostsLoading(false);
    }
  }, [effectiveSceneId]);

  const handleVoteHistory = React.useCallback((event: any) => {
    console.log('🗳️ [BuildDrama] handleVoteHistory called with event:', event);
    
    if (event && event.data && event.data.voteHistoryInfoList) {
      console.log('🗳️ [BuildDrama] Received vote history data:', {
        eventData: event.data,
        voteHistoryInfoList: event.data.voteHistoryInfoList,
        currentEffectiveSceneId: effectiveSceneId
      });
      
      // 转换投票历史数据格式
      const formattedVoteHistory = event.data.voteHistoryInfoList.map((vote: any, index: number) => {
        console.log(`🗳️ [BuildDrama] Processing vote ${index}:`, vote);
        
        // 统一使用YES、NO两个选项
        let userChoice: string | undefined;
        const options = ['YES', 'NO'];
        
        if (vote.myYesCount > 0) userChoice = 'YES';
        else if (vote.myNoCount > 0) userChoice = 'NO';
        
        // 保留原始content
        let processedContent = vote.content || "";
        
        // 处理imgUrl，只提取EP格式
        let processedImgUrl = vote.imgUrl;
        if (processedImgUrl) {
          const epMatch = processedImgUrl.match(/EP\d+-\d+/);
          if (epMatch) {
            processedImgUrl = epMatch[0]; // 只保留EP格式
          } else {
            processedImgUrl = ""; // 如果没有匹配到EP格式，则不显示imgUrl
          }
        }
        
        return {
          roomId: effectiveSceneId, // 固定使用偶像场景ID
          requestId: vote.requestId || index,
          content: processedContent,
          hasVoted: vote.myYesCount > 0 || vote.myNoCount > 0,
          userChoice: userChoice,
          correctOption: "unknown",
          options: options,
          timestamp: new Date().toISOString(),
          yesCount: vote.yesCount?.toString() || "0",
          noCount: vote.noCount?.toString() || "0",
          myYesCount: vote.myYesCount?.toString() || "0",
          myNoCount: vote.myNoCount?.toString() || "0",
          imgUrl: processedImgUrl
        };
      });
      
      console.log('🗳️ [BuildDrama] Formatted vote history:', formattedVoteHistory);
      setVoteHistory(formattedVoteHistory);
      console.log('🗳️ [BuildDrama] Updated voteHistory state with', formattedVoteHistory.length, 'votes for roomId:', effectiveSceneId);

      // 标记该场景的数据已加载
      if (effectiveSceneId) {
        dataLoadedRef.current[effectiveSceneId] = true;
        console.log('🗳️ [BuildDrama] 已标记场景ID的数据加载状态:', dataLoadedRef.current);
      }
    } else {
      console.log('🗳️ [BuildDrama] No vote history data in event:', { 
        event, 
        hasData: !!event?.data, 
        hasVoteList: !!event?.data?.voteHistoryInfoList 
      });
    }

    setVotesLoading(false);
  }, [effectiveSceneId]);
  
  const handleCharacterHistory = React.useCallback((event: any) => {
    if (event && event.data && event.data.playerNpcChatDataMap) {
      console.log('[BuildDrama] Received character history data:', event.data);
      // 构建角色历史数据
      const characters: CharacterHistory[] = [];
      
      for (const npcId in event.data.playerNpcChatDataMap) {
        // 使用getNpcName获取NPC名称
        const id = parseInt(npcId);
        
        // 只处理偶像场景的NPC
        if (![10012, 10009, 10006, 10022].includes(id)) {
          continue;
        }
        
        // 获取聊天记录数组
        const chatHistory = event.data.playerNpcChatDataMap[npcId];
        
        // 默认描述为空字符串
        let description = "";
        let lastChatTime = 0;
        
        // 如果有聊天记录，找出NPC发送的最后一条消息作为描述
        if (chatHistory && chatHistory.length > 0) {
          // 按时间排序，确保最新的消息在最后
          const sortedHistory = [...chatHistory].sort((a, b) => a.time - b.time);
          
          // 筛选出NPC发送的消息
          const npcMessages = sortedHistory.filter(msg => msg.npcSend === true);
          
          // 如果有NPC消息，使用最后一条作为描述
          if (npcMessages.length > 0) {
            const lastMessage = npcMessages[npcMessages.length - 1];
            description = lastMessage.content;
            lastChatTime = lastMessage.time;
          }
          
          // 如果没有NPC消息，使用最后一条消息的时间（无论是否是NPC发送的）
          if (lastChatTime === 0 && sortedHistory.length > 0) {
            lastChatTime = sortedHistory[sortedHistory.length - 1].time;
          }
        }
        
        const character: CharacterHistory = {
          roomId: FIXED_SCENE_ID,
          npcId: id,
          name: getNpcName(id),
          description: description,
          imageUrl: `/images/scene/headDir_${id}.png`,
          lastChatTime: lastChatTime
        };
        characters.push(character);
      }
      
      // 按照最后聊天时间排序
      characters.sort((a, b) => {
        const aHasChat = (a.lastChatTime || 0) > 0;
        const bHasChat = (b.lastChatTime || 0) > 0;
        
        if (aHasChat && bHasChat) {
          return (b.lastChatTime || 0) - (a.lastChatTime || 0);
        } else if (aHasChat && !bHasChat) {
          return -1;
        } else if (!aHasChat && bHasChat) {
          return 1;
        } else {
          return a.npcId - b.npcId;
        }
      });
      
      setCharacterHistory(characters);
      console.log('[BuildDrama] Updated characterHistory with', characters.length, 'characters');

      // 标记该场景的数据已加载（角色历史数据）
      if (effectiveSceneId) {
        dataLoadedRef.current[effectiveSceneId] = true;
        console.log('👤 [BuildDrama] 已标记场景ID的角色历史数据加载状态:', dataLoadedRef.current);
      }
    }
  }, []);

  // 处理推文操作响应
  const handleOperateTweetResponse = React.useCallback((data: any) => {
    console.log('[BuildDrama] Received operate tweet response:', data);
    
    if (data && data.tweetId) {
      // 根据操作类型更新本地状态
      setAiPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === data.tweetId) {
            const updatedPost = { ...post };
            
            // 更新点赞状态和数量
            if (data.type === 1) { // 点赞操作
              updatedPost.like = !post.like;
              updatedPost.likeCount = post.like ? post.likeCount - 1 : post.likeCount + 1;
            }
            
            // 更新评论数量
            if (data.type === 2) { // 评论操作
              updatedPost.commentCount = post.commentCount + 1;
              
              // 如果有新评论内容，添加到评论列表
              if (data.content) {
                const newComment = {
                  id: Date.now(), // 临时ID
                  content: data.content,
                  nickName: data.nickName || userInfo?.userId || 'Anonymous',
                  createTime: Date.now(),
                  tweetCommentVoList: []
                };
                updatedPost.tweetCommentVoList = [...post.tweetCommentVoList, newComment];
              }
            }
            
            return updatedPost;
          }
          return post;
        })
      );
      
      // 显示操作成功提示
      if (data.type === 1) {
        toast({
          title: "Like updated",
          description: "Your like has been recorded."
        });
      } else if (data.type === 2) {
        toast({
          title: "Comment posted",
          description: "Your comment has been added."
        });
      }
    }
  }, [userInfo]);

  // 初始化加载和设置WebSocket事件处理器
  useEffect(() => {
    console.log('[BuildDrama] Initializing WebSocket event handlers');
    
    // 注册WebSocket事件处理器
    websocketService.subscribe(handleSceneFeed);
    websocketService.on(Commands.VOTE_THREAD, handleVoteHistory);
    websocketService.on(Commands.GET_CHARACTER_HISTORY, handleCharacterHistory);
    websocketService.on(Commands.OPERATE_TWEET, handleOperateTweetResponse);
    
    return () => {
      // 清理事件处理器
      websocketService.unsubscribe(handleSceneFeed);
      websocketService.off(Commands.VOTE_THREAD, handleVoteHistory);
      websocketService.off(Commands.GET_CHARACTER_HISTORY, handleCharacterHistory);
      websocketService.off(Commands.OPERATE_TWEET, handleOperateTweetResponse);
    };
  }, [handleSceneFeed, handleVoteHistory, handleCharacterHistory, handleOperateTweetResponse]);

  // Hook 1: 加载场景相关数据（投票、角色历史）
  useEffect(() => {
    const loadSceneGenericData = async () => {
      console.log(`[BuildDrama 场景数据加载] 场景ID: ${effectiveSceneId}`);
      
      // 重置该场景ID的数据加载状态
      dataLoadedRef.current[effectiveSceneId] = false;
      
      setVotesLoading(true);
      
      // 尝试等待WebSocket连接建立
      let retryCount = 0;
      const maxRetries = 3;
      let isConnected = websocketService.isConnectionOpen();
      
      while (!isConnected && retryCount < maxRetries) {
        console.log(`[BuildDrama] WebSocket未连接，等待连接建立...尝试 ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        isConnected = websocketService.isConnectionOpen();
        retryCount++;
      }

      if (isConnected) {
        // 检查用户是否已登录
        const storedLoginStatus = localStorage.getItem('isSignedIn');
        const userIsLoggedIn = storedLoginStatus === 'true';
        
        if (userIsLoggedIn) {
          // 使用请求跟踪函数检查是否应该发送请求
          if (shouldSendRequest(Commands.VOTE_THREAD, Number(effectiveSceneId))) {
            console.log('📤 [BuildDrama 场景] 用户已登录，发送投票历史请求...');
            websocketService.send(Commands.VOTE_THREAD, {
              roomId: Number(effectiveSceneId)
            }, true);
          }
        
          setTimeout(() => {
            if (shouldSendRequest(Commands.GET_CHARACTER_HISTORY, Number(effectiveSceneId))) {
              console.log('📤 [BuildDrama 场景] 发送角色历史请求...');
              websocketService.send(Commands.GET_CHARACTER_HISTORY, {
                roomId: Number(effectiveSceneId)
              }, true);
            }
          }, 200);
        } else {
          console.log('📤 [BuildDrama 场景] 用户未登录，等待登录后再请求投票历史数据');
        }

        // 标记该场景ID的数据已请求
        dataLoadedRef.current[effectiveSceneId] = true;
        
        const loadingTimeout = setTimeout(() => {
          setVotesLoading(false);
        }, 10000);
        
        return () => clearTimeout(loadingTimeout);
      } else {
        console.error('[BuildDrama] WebSocket连接失败，无法加载数据');
        setVotesLoading(false);
        
        // 显示友好的错误提示
        toast({
          title: "连接错误",
          description: "无法连接到服务器，请检查网络连接后刷新页面",
          variant: "destructive"
        });
      }
    };

    if (effectiveSceneId) {
      loadSceneGenericData();
    }
  }, [effectiveSceneId, shouldSendRequest]);

  // Hook 2: 加载EP相关的推文数据
  useEffect(() => {
    const loadEpisodePosts = async () => {
      console.log(`[BuildDrama EP数据加载] EP: ${selectedEpisode}, 场景ID: ${effectiveSceneId}`);
      setPostsLoading(true);
      setAiPosts([]);
      setCurrentPage(0);
      currentPageRef.current = 0;

      // 尝试等待WebSocket连接建立
      let retryCount = 0;
      const maxRetries = 3;
      let isConnected = websocketService.isConnectionOpen();
      
      while (!isConnected && retryCount < maxRetries) {
        console.log(`[BuildDrama EP] WebSocket未连接，等待连接建立...尝试 ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        isConnected = websocketService.isConnectionOpen();
        retryCount++;
      }

      if (isConnected) {
        console.log('📤 [BuildDrama EP] 发送推文数据请求...');
        websocketService.getSceneFeed(
          Number(effectiveSceneId), 
          0, 
          30,
          selectedEpisode
        );
      } else {
        console.error('[BuildDrama] WebSocket连接失败，无法加载推文数据');
        setPostsLoading(false);
        
        // 显示友好的错误提示，但不重复显示
        if (retryCount === maxRetries) {
          toast({
            title: "连接错误",
            description: "无法连接到服务器，请检查网络连接后刷新页面",
            variant: "destructive"
          });
        }
      }
    };

    if (effectiveSceneId && selectedEpisode !== null) {
      loadEpisodePosts();
    }
    
    // 如果没有选中EP，确保推文列表不是加载状态
    if (selectedEpisode === null) {
      setPostsLoading(false);
    }
  }, [selectedEpisode, effectiveSceneId]);

  // 删除重复的WebSocket监听器
  useEffect(() => {
    console.log('[BuildDrama] Current data state:', {
      characterHistory: characterHistory.length,
      aiPosts: aiPosts.length,
      voteHistory: voteHistory.length,
      loading,
      effectiveSceneId
    });
  }, [characterHistory, aiPosts, voteHistory, loading, effectiveSceneId]);

  const handleLogin = (userInfo: UserInfo) => {
    setIsSignedIn(true);
    setUserInfo(userInfo);
    
    toast({
      title: "Welcome back!",
      description: "You have successfully signed in."
    });
  };

  const handleLogout = () => {
    setIsSignedIn(false);
    setUserInfo(null);
    
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
  };

  // Build Drama页面固定使用idol标签
  const handleTagSelect = (tagId: string) => {
    // Build Drama页面只支持idol场景，忽略其他标签选择
    console.log('[BuildDrama] Tag selection ignored, fixed to idol scene');
  };

  const handleLogoClick = () => {
    navigate('/home');
  };

  // 示例：更新场景
  const handleUpdateScene = () => {
    sendMessageToGame({
      type: 'UPDATE_SCENE',
      data: {
        sceneId: FIXED_SCENE_ID,
        name: 'Build Drama Scene',
        elements: []
      }
    });
  };

  // 使用useCallback包装所有事件处理函数
  const handleLike = React.useCallback((tweetId: number): void => {
    console.log('[BuildDrama] Like button clicked for tweet:', tweetId);
    
    if (websocketService.isConnectionOpen()) {
      websocketService.send(Commands.OPERATE_TWEET, {
        tweetId: tweetId,
        type: 1, // 1=点赞
        content: "",
        replyId: 0,
        chooseIndex: 0,
        commentId: 0,
        rateList: []
      }, true);
    } else {
      toast({
        title: "Connection error",
        description: "Unable to connect to server"
      });
    }
  }, []);

  const handleComment = React.useCallback((tweetId: number, comment: string): void => {
    console.log('[BuildDrama] Comment submitted for tweet:', tweetId, 'comment:', comment);
    
    if (!comment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment before submitting"
      });
      return;
    }
    
    if (websocketService.isConnectionOpen()) {
      websocketService.send(Commands.OPERATE_TWEET, {
        tweetId: tweetId,
        type: 2, // 2=评论
        content: comment.trim(),
        replyId: 0,
        chooseIndex: 0,
        commentId: 0,
        rateList: []
      }, true);
    } else {
      toast({
        title: "Connection error",
        description: "Unable to connect to server"
      });
    }
  }, []);

  const handleVote = React.useCallback((tweetId: number, optionIndex: number): void => {
    console.log('[BuildDrama] Vote submitted for tweet:', tweetId, 'option:', optionIndex);
    
    if (websocketService.isConnectionOpen()) {
      websocketService.send(Commands.OPERATE_TWEET, {
        tweetId: tweetId,
        type: 3, // 3=选择/投票
        content: "",
        replyId: 0,
        chooseIndex: optionIndex,
        commentId: 0,
        rateList: []
      }, true);
    } else {
      toast({
        title: "Connection error",
        description: "Unable to connect to server"
      });
    }
  }, []);

  const handlePageChange = React.useCallback((newPage: number) => {
    console.log(`[BuildDrama] Page change requested: ${currentPage} -> ${newPage}`);
    setCurrentPage(newPage);
    
    if (websocketService.isConnectionOpen() && selectedEpisode !== null) {
      console.log(`📤 [BuildDrama] 请求第${newPage}页数据，EP: ${selectedEpisode}`);
      websocketService.getSceneFeed(
        Number(effectiveSceneId),
        newPage,
        30,
        selectedEpisode
      );
    }
  }, [currentPage, selectedEpisode, effectiveSceneId]);

  // 获取当前场景的EP列表
  const getCurrentSceneEpList = React.useMemo(() => {
    // 只返回偶像场景的EP列表
    const sceneData = epListData.find(scene => 
      scene.npcList.some(npcId => [10012, 10009, 10006, 10022].includes(npcId))
    );
    
    return sceneData?.epList || [];
  }, [epListData]);

  const handleSelectEpisode = React.useCallback((episodeNumber: number) => {
    console.log(`[BuildDrama] 选择EP: ${episodeNumber}`);
    setSelectedEpisode(episodeNumber);
    setShowEpisodeList(false); // 选择后自动折叠列表
  }, []);

  // 处理EP列表响应
  const handleEpListResponse = React.useCallback((data: any) => {
    console.log('[BuildDrama] 收到EP列表响应:', data);
    
    if (data && data.roomSceneList) {
      setEpListData(data.roomSceneList);
      
      // 自动选择偶像场景的最新EP
      const idolSceneData = data.roomSceneList.find((scene: any) => 
        scene.npcList.some((npcId: number) => [10012, 10009, 10006, 10022].includes(npcId))
      );
      
      if (idolSceneData && idolSceneData.epList && idolSceneData.epList.length > 0) {
        // 选择最新的EP（假设epList是按时间顺序排列的）
        const latestEp = idolSceneData.epList[idolSceneData.epList.length - 1];
        const episodeNumber = parseInt(latestEp.replace('EP', ''));
        
        console.log(`[BuildDrama] 自动选择偶像场景最新EP: ${episodeNumber}`);
        setSelectedEpisode(episodeNumber);
      }
      
      setEpListLoading(false);
    } else {
      console.error('[BuildDrama] EP列表响应格式不正确:', data);
      setEpListLoading(false);
    }
  }, []);

  // 监听EP列表
  useEffect(() => {
    websocketService.on(Commands.GET_EP_LIST, handleEpListResponse);
    
    return () => {
      websocketService.off(Commands.GET_EP_LIST, handleEpListResponse);
    };
  }, [handleEpListResponse]);

  // 初始化时获取EP列表
  useEffect(() => {
    if (websocketService.isConnectionOpen()) {
      console.log('[BuildDrama] 初始化获取EP列表');
      websocketService.getEpList();
    }
  }, []);

  // NPC选择处理（只支持偶像场景NPC）
  const handleSelectNpc = React.useCallback((npcId: number) => {
    // 检查是否是偶像场景的NPC
    if (![10012, 10009, 10006, 10022].includes(npcId)) {
      console.log(`[BuildDrama] NPC ${npcId} 不属于偶像场景，忽略选择`);
      return;
    }
    
    console.log(`[BuildDrama] 选择偶像场景NPC: ${npcId}`);
    
    // 设置NPC切换加载状态
    setNpcSwitchLoading(true);
    
    // 导航到Scene页面，但保持在Build Drama模式
    navigate(`/build-drama`);
    
    // 重置状态
    setTimeout(() => {
      setNpcSwitchLoading(false);
    }, 1000);
  }, [navigate]);

  // 使用useMemo缓存过滤后的结果
  const filteredPosts = React.useMemo(() => {
    return aiPosts;
  }, [aiPosts]);
  
  const filteredVotes = React.useMemo(
    () => filterVotesByScene(voteHistory, effectiveSceneId),
    [voteHistory, effectiveSceneId]
  );

  const filteredCharacters = React.useMemo(
    () => filterNpcsByScene(characterHistory, effectiveSceneId),
    [characterHistory, effectiveSceneId]
  );

  // 渲染内容
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        characters={[]} // 传递空数组，不显示任何角色
        className="flex-shrink-0"
        isSignedIn={isSignedIn}
        userInfo={userInfo}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isUserInfoFolded={isUserInfoFolded}
        onSelectNpc={handleSelectNpc}
        npcSwitchLoading={npcSwitchLoading}
        showCharacterHistory={false} // 隐藏角色聊天历史
      />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onTagSelect={handleTagSelect} 
          className="flex-shrink-0" 
          selectedTag="idol" // 固定选择idol标签
          onLogoClick={handleLogoClick}
          isCollapsed={isHeaderCollapsed}
          onToggleCollapse={(collapsed) => setIsHeaderCollapsed(collapsed)}
          showTags={false} // 隐藏tags
        />
        
          <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
            {/* Game Embed Container - 自适应宽度，与Thread Feed同宽 */}
            <div className="flex-1 h-full min-w-0 min-h-[400px]">
              <div className="w-full h-full relative rounded-lg overflow-hidden bg-white shadow-md">
                <CocosEmbed 
                  sceneId={gameSceneId} 
                  className="w-full h-full" 
                  iframeUrl="https://dramai.world/test" 
                />
              </div>
            </div>
            
            {/* Content Columns Container - 与Cocos容器同宽，包含Thread Feed */}
            <div className="flex-1 flex flex-col gap-4 h-full min-w-0">
              {/* Thread Feed - 占据全部宽度 */}
              <div className="w-full h-full flex flex-col gap-2 min-w-0">
                {/* Banner - 宽高比 1044:234 */}
                <div 
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  style={{ aspectRatio: '1044/234' }}
                >
                  <div className="relative w-full h-full">
                    <img
                      src="/banner.png"
                      alt="Build Drama Banner"
                      className="w-full h-full object-cover"
                    />
                    {/* 右下角按钮 */}
                    <button
                      onClick={() => setShowEpisodeList(!showEpisodeList)}
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/80 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      {showEpisodeList ? 'fold' : selectedEpisode ? `EP${selectedEpisode}` : 'Select EP'}
                    </button>
                  </div>
                </div>
                
                {/* Episode 列表 - 只在showEpisodeList为true时显示 */}
                <div 
                  className={`w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${
                    showEpisodeList 
                      ? 'max-h-40 opacity-100' 
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="h-32 overflow-y-auto p-4">
                    <div className="grid grid-cols-5 gap-3">
                      {epListLoading ? (
                        <div className="col-span-5 flex items-center justify-center">
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                          <span className="text-sm text-gray-500">Loading EP list...</span>
                        </div>
                      ) : getCurrentSceneEpList.length > 0 ? (
                        getCurrentSceneEpList.map((ep) => {
                          const episodeNumber = parseInt(ep.replace('EP', ''));
                          const isSelected = selectedEpisode === episodeNumber;
                          return (
                            <button
                              key={ep}
                              className={`font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                                isSelected
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                              onClick={() => handleSelectEpisode(episodeNumber)}
                            >
                              {ep}
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-5 text-center text-sm text-gray-500">
                          No episodes available for this scene123
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Thread Feed */}
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <SceneThreadFeed 
                  posts={filteredPosts} 
                  loading={postsLoading} 
                  isSignedIn={isSignedIn}
                  onVote={handleVote}
                  onLike={handleLike}
                  onComment={handleComment}
                  roomId={Number(effectiveSceneId)}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  selectedEpisode={selectedEpisode}
                  showManga={true} // 在BuildDrama页面显示漫画
                />
                </div>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
};

export default BuildDrama;
