import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CocosEmbed, { useCocos } from '@/components/CocosEmbed';
import SceneThreadFeed from '@/components/SceneThreadFeed';
// import VoteHistoryPanel from '@/components/VoteHistoryPanel';
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

// 添加根据NPC ID获取roomId的辅助函数
const getNpcRoomId = (npcId: number): string => {
  // 牧场场景 (roomId: 4)
  if ([10016, 10017, 10018, 10019, 10020, 10021].includes(npcId)) {
    return '4';
  }
  
  // 偶像场景 (roomId: 3)
  if ([10012, 10009, 10006, 10022].includes(npcId)) {
    return '3';
  }
  
  // 默认返回当前场景ID
  return '0';
};

// 添加根据场景ID过滤NPC的函数
const filterNpcsByScene = (characters: CharacterHistory[], sceneId: string): CharacterHistory[] => {
  const roomId = sceneId;
  
  return characters.filter(character => {
    // 牧场场景 (roomId: 4) 的NPC
    if (roomId === '4') {
      return [10016, 10017, 10018, 10019, 10020, 10021].includes(character.npcId);
    }
    
    // 偶像场景 (roomId: 3) 的NPC
    if (roomId === '3') {
      return [10012, 10009, 10006, 10022].includes(character.npcId);
    }
    
    // 默认显示所有NPC
    return true;
  });
};

// 添加根据场景ID过滤推文的函数
const filterPostsByScene = (posts: AIPost[], sceneId: string): AIPost[] => {
  const roomId = sceneId;
  
  return posts.filter(post => {
    // 牧场场景 (roomId: 4) 的NPC推文
    if (roomId === '4') {
      return [10016, 10017, 10018, 10019, 10020, 10021].includes(post.npcId);
    }
    
    // 偶像场景 (roomId: 3) 的NPC推文
    if (roomId === '3') {
      return [10012, 10009, 10006, 10022].includes(post.npcId);
    }
    
    // 默认显示所有推文
    return true;
  });
};

// 添加根据场景ID过滤投票的函数
const filterVotesByScene = (votes: VoteHistory[], sceneId: string): VoteHistory[] => {
  console.log('🗳️ Filtering votes:', {
    totalVotes: votes.length,
    sceneId: sceneId,
    votes: votes.map(v => ({ roomId: v.roomId, content: v.content }))
  });
  
  // 投票历史已经通过roomId进行了过滤，因为我们在获取数据时就指定了roomId
  // 但为了保险起见，我们可以再次过滤
  const filtered = votes.filter(vote => vote.roomId === sceneId);
  
  console.log('🗳️ Filtered votes result:', {
    filteredCount: filtered.length,
    filtered: filtered.map(v => ({ roomId: v.roomId, content: v.content }))
  });
  
  return filtered;
};

// 添加根据EP过滤推文的函数
const filterPostsByEpisode = (posts: AIPost[], episodeNumber: number | null): AIPost[] => {
  if (episodeNumber === null) {
    return []; // 如果没有选择EP，返回空数组，鼓励用户选择EP
  }
  
  return posts.filter(post => {
    if (!post.imgUrl && !post.videoUrl) {
      return false; // 没有媒体内容的post不显示
    }
    
    // 检查图片URL
    if (post.imgUrl) {
      const match = post.imgUrl.match(/EP(\d+)-\d+\.(png|jpg|jpeg)$/i);
      if (match) {
        const postEpisode = parseInt(match[1]);
        return postEpisode === episodeNumber;
      }
    }
    
    // 检查视频URL（如果有类似的命名模式）
    if (post.videoUrl) {
      const match = post.videoUrl.match(/EP(\d+)-\d+\.(mp4|avi|mov)$/i);
      if (match) {
        const postEpisode = parseInt(match[1]);
        return postEpisode === episodeNumber;
      }
    }
    
    return false; // 不匹配EP格式的内容不显示
  });
};

const Scene: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sceneId = searchParams.get('sceneId') || 'MainMenu';
  
  // 映射场景ID到实际使用的数据
  const getEffectiveSceneId = (id: string) => {
    // 根据 NPC ID 映射到对应的场景
    const npcId = parseInt(id);
    
    // 牧场场景 (roomId: 4)
    if ([10016, 10017, 10018, 10019, 10020, 10021].includes(npcId)) {
      return '4';
    }
    
    // 偶像场景 (roomId: 3)
    if ([10012, 10009, 10006, 10022].includes(npcId)) {
      return '3';
    }
    
    // 默认返回原始ID
    return id;
  };

  const effectiveSceneId = getEffectiveSceneId(sceneId);
  const [lastSceneId, setLastSceneId] = useState<string>(effectiveSceneId);
  const [currentPage, setCurrentPage] = useState<number>(0); // 添加当前页面状态

  // 当场景ID变化时，强制重新加载数据
  useEffect(() => {
    if (sceneId !== lastSceneId) {
      setLastSceneId(sceneId);
      setCurrentPage(0); // 重置页码
      // 切换场景时重置EP过滤，避免在新场景中显示错误的过滤结果
      setSelectedEpisode(null);
      // 重新获取EP列表，通过handleEpListResponse会自动选择最新的EP
      setEpListLoading(true);
      if (websocketService.isConnectionOpen()) {
        websocketService.getEpList();
      }
      // 不需要显式调用fetchSceneData()，因为effectiveSceneId的变化会触发主要useEffect
      console.log('Scene ID changed:', { from: lastSceneId, to: sceneId });
    }
  }, [sceneId, lastSceneId]);

  // 添加新的函数来获取游戏场景ID
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

  const [characterHistory, setCharacterHistory] = useState<CharacterHistory[]>([]);
  const [aiPosts, setAiPosts] = useState<AIPost[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [votesLoading, setVotesLoading] = useState<boolean>(true);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { sendMessageToGame, navigateToScene, isConnected } = useCocos();
  const [isUserInfoFolded, setIsUserInfoFolded] = useState(false);
  const [npcSwitchLoading, setNpcSwitchLoading] = useState(false); // 添加NPC切换加载状态
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false); // 添加Header折叠状态
  const [showEpisodeList, setShowEpisodeList] = useState(false); // 添加Episode列表显示状态
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null); // 添加选中的EP状态
  const [epListData, setEpListData] = useState<EpListItem[]>([]); // 添加EP列表数据状态
  const [epListLoading, setEpListLoading] = useState<boolean>(true); // 添加EP列表加载状态

  // Check login status on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');
    
    if (storedUserInfo && storedLoginStatus) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsSignedIn(true);
    }
  }, []);

  // Scene页面静音控制（防重复发送）
  useEffect(() => {
    let lastVisibilityState = !document.hidden;
    
    // 监听页面可见性变化，当页面隐藏时发送静音操作
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
        console.log('React: Scene页面变为隐藏，发送静音指令');
      }
      
      lastVisibilityState = currentHidden;
    };

    // 添加页面可见性监听
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数：组件卸载时不发送静音操作，由GlobalIframe统一处理
    return () => {
      console.log('React: Scene页面卸载');
      // 移除事件监听器
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendMessageToGame]);

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
      console.log(`⏱️ 允许发送请求: ${command}, 房间ID: ${roomId}, 请求ID: ${requestTrackerRef.current[key].requestId}`);
      return true;
    }
    
    console.log(`⏱️ 忽略重复请求: ${command}, 房间ID: ${roomId}, 距上次请求: ${now - lastRequest.timestamp}ms`);
    return false;
  }, []);

  // 处理事件处理器和事件依赖项
  const handleSceneFeed = React.useCallback((data: any) => {
    if (data && data.tweetVoList) {
      // 临时修改：不忽略第一条推文信息，使用完整数组
      const filteredTweets = data.tweetVoList;
      
      // 原代码（暂时注释掉）
      // // 忽略第一条推文信息
      // const filteredTweets = data.tweetVoList.slice(1);
      
      console.log('🔍 Received scene feed data:', {
        roomId: data.roomId,
        currentSceneId: searchParams.get('sceneId'),
        effectiveSceneId: getEffectiveSceneId(searchParams.get('sceneId') || 'MainMenu'),
        totalTweetCount: data.tweetVoList.length,
        filteredTweetCount: filteredTweets.length,
        currentPage: currentPageRef.current, // 使用ref中的值
        firstTweet: filteredTweets.length > 0 ? filteredTweets[0].id : 'none',
        lastTweetId: filteredTweets.length > 0 ? filteredTweets[filteredTweets.length - 1].id : 'none'
      });
      
      // 重要：收到数据后立即重置loading状态，让UI可以更新
      console.log('收到数据，立即设置 postsLoading = false');
      setPostsLoading(false);
      
      // 详细日志：打印接收到的推文ID列表
      console.log('🔄 接收到的完整推文ID列表:', filteredTweets.map((t: any) => t.id).join(', '));
      
      // 对于初始加载或场景切换（页码为0）时，直接替换所有数据
      if (currentPageRef.current === 0) {
        console.log('🔄 初始页(0)加载，直接替换所有数据');
        console.log('🔄 设置aiPosts =', JSON.stringify(filteredTweets.map(t => ({ id: t.id, content: t.content.substring(0, 20) }))));
        setAiPosts(filteredTweets);
        
        // 确认数据设置成功
        setTimeout(() => {
          console.log('🔄 初始页设置后检查 aiPosts.length =', aiPosts.length);
        }, 0);
      } else {
        // 对于懒加载（页码>0）时，将新数据追加到现有数据
        console.log(`🔄 懒加载(页码${currentPageRef.current})，准备合并数据，当前aiPosts.length = ${aiPosts.length}`);
        
        // 在更新前保存一份当前数据，用于对比
        const prevPostsIds = aiPosts.map(post => post.id);
        console.log('🔄 更新前的aiPosts IDs:', prevPostsIds.join(', '));
        
        // 使用函数式更新避免依赖aiPosts
        setAiPosts(prevPosts => {
          // 记录当前已有的推文ID
          const existingIds = new Set(prevPosts.map(post => post.id));
          console.log('🔄 当前已有推文IDs集合大小:', existingIds.size);
          
          // 只保留还不存在的新推文
          const uniqueNewPosts = filteredTweets.filter(
            (post: any) => !existingIds.has(post.id)
          );
          
          console.log(`🔄 过滤出 ${uniqueNewPosts.length} 条新推文，当前页码: ${currentPageRef.current}`);
          if (uniqueNewPosts.length > 0) {
            console.log('🔄 新推文IDs:', uniqueNewPosts.map((p: any) => p.id).join(', '));
          } else {
            console.log('🔄 没有新的推文ID');
          }
          
          // 合并现有推文和新推文
          if (uniqueNewPosts.length > 0) {
            console.log(`🔄 追加 ${uniqueNewPosts.length} 条新推文到现有 ${prevPosts.length} 条`);
            const mergedPosts = [...prevPosts, ...uniqueNewPosts];
            console.log('🔄 合并后总推文数:', mergedPosts.length);
            console.log('🔄 合并后所有推文IDs:', mergedPosts.map(p => p.id).join(', '));
            return mergedPosts;
          } else {
            console.log('🔄 没有新数据可追加，保持原有数据不变');
            return prevPosts;
          }
        });
        
        // 确认数据更新成功
        setTimeout(() => {
          console.log('🔄 懒加载更新后检查 aiPosts.length =', aiPosts.length);
          console.log('🔄 更新后的aiPosts IDs:', aiPosts.map(post => post.id).join(', '));
          
          // 检查新数据是否成功追加
          const currentIds = new Set(aiPosts.map(post => post.id));
          const newDataIds = filteredTweets.map((t: any) => t.id);
          const allIncluded = newDataIds.every(id => currentIds.has(id));
          console.log('🔄 所有新数据都已包含在aiPosts中?', allIncluded ? '是' : '否');
          
          if (!allIncluded) {
            console.warn('🔄 有新数据未被追加！这可能是问题所在');
            const missingIds = newDataIds.filter(id => !currentIds.has(id));
            console.warn('🔄 缺失的ID:', missingIds.join(', '));
          }
        }, 100);
      }
      
      // 再次确认loading状态已经关闭
      setTimeout(() => {
        if (postsLoading) {
          console.log('数据处理完成后检测到loading状态仍为true，强制设置为false');
          setPostsLoading(false);
        }
      }, 0);
      
      console.log('🔄 Updated aiPosts with', filteredTweets.length, 'tweets for roomId:', data.roomId);
    } else {
      console.warn('接收到无效的场景数据:', data);
      // 即使数据无效也要重置loading状态，避免UI卡在加载中
      setPostsLoading(false);
    }
  }, [postsLoading, aiPosts]); // 添加aiPosts作为依赖项，以便访问最新值
  
  const handleVoteHistory = React.useCallback((event: any) => {
    console.log('🗳️ handleVoteHistory called with event:', event);
    
    if (event && event.data && event.data.voteHistoryInfoList) {
      console.log('🗳️ Received vote history data:', {
        eventData: event.data,
        voteHistoryInfoList: event.data.voteHistoryInfoList,
        currentEffectiveSceneId: effectiveSceneId
      });
      
      // 转换投票历史数据格式
      const formattedVoteHistory = event.data.voteHistoryInfoList.map((vote: any, index: number) => {
        console.log(`🗳️ Processing vote ${index}:`, vote);
        
        // 统一使用YES、NO两个选项，移除场景判断
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
          roomId: effectiveSceneId, // 直接使用当前的effectiveSceneId
          requestId: vote.requestId || index,
          content: processedContent,
          hasVoted: vote.myYesCount > 0 || vote.myNoCount > 0,
          userChoice: userChoice,
          correctOption: "unknown", // 这个字段在API响应中没有提供
          options: options,
          timestamp: new Date().toISOString(),
          yesCount: vote.yesCount?.toString() || "0",
          noCount: vote.noCount?.toString() || "0",
          myYesCount: vote.myYesCount?.toString() || "0",
          myNoCount: vote.myNoCount?.toString() || "0",
          imgUrl: processedImgUrl // 使用处理后的imgUrl
        };
      });
      
      console.log('🗳️ Formatted vote history:', formattedVoteHistory);
      setVoteHistory(formattedVoteHistory);
      console.log('🗳️ Updated voteHistory state with', formattedVoteHistory.length, 'votes for roomId:', effectiveSceneId);

      // 标记该场景的数据已加载
      if (effectiveSceneId) {
        dataLoadedRef.current[effectiveSceneId] = true;
        console.log('🗳️ 已标记场景ID的数据加载状态:', dataLoadedRef.current);
      }
    } else {
      console.log('🗳️ No vote history data in event:', { 
        event, 
        hasData: !!event?.data, 
        hasVoteList: !!event?.data?.voteHistoryInfoList 
      });
    }

    setVotesLoading(false); // 投票数据加载完成
  }, [effectiveSceneId]);
  
  const handleCharacterHistory = React.useCallback((event: any) => {
    if (event && event.data && event.data.playerNpcChatDataMap) {
      console.log('Received character history data:', event.data);
      // 构建角色历史数据
      const characters: CharacterHistory[] = [];
      
      for (const npcId in event.data.playerNpcChatDataMap) {
        // 使用getNpcName获取NPC名称
        const id = parseInt(npcId);
        
        // 获取聊天记录数组
        const chatHistory = event.data.playerNpcChatDataMap[npcId];
        
        // 默认描述为空字符串
        let description = "";
        let lastChatTime = 0; // 添加最后聊天时间用于排序
        
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
          roomId: getEffectiveSceneId(searchParams.get('sceneId') || 'MainMenu'),
          npcId: id,
          name: getNpcName(id), // 使用getNpcName获取名称
          description: description,
          imageUrl: `/images/scene/headDir_${id}.png`, // 修复图片路径
          lastChatTime: lastChatTime // 添加最后聊天时间属性
        };
        characters.push(character);
      }
      
      // 按照最后聊天时间排序，最近有聊天的NPC排在前面
      // 有聊天记录的NPC按时间倒序排列，没有聊天记录的NPC按NPC ID排序放在后面
      characters.sort((a, b) => {
        const aHasChat = (a.lastChatTime || 0) > 0;
        const bHasChat = (b.lastChatTime || 0) > 0;
        
        if (aHasChat && bHasChat) {
          // 都有聊天记录，按时间倒序排列（最新的在前）
          return (b.lastChatTime || 0) - (a.lastChatTime || 0);
        } else if (aHasChat && !bHasChat) {
          // a有聊天记录，b没有，a排在前面
          return -1;
        } else if (!aHasChat && bHasChat) {
          // b有聊天记录，a没有，b排在前面
          return 1;
        } else {
          // 都没有聊天记录，按NPC ID排序
          return a.npcId - b.npcId;
        }
      });
      
      setCharacterHistory(characters);
      console.log('Updated characterHistory with', characters.length, 'characters');

      // 标记该场景的数据已加载（角色历史数据）
      const currentRoomId = getEffectiveSceneId(searchParams.get('sceneId') || 'MainMenu');
      if (currentRoomId) {
        dataLoadedRef.current[currentRoomId] = true;
        console.log('👤 已标记场景ID的角色历史数据加载状态:', dataLoadedRef.current);
      }
    }
  }, [searchParams]);

  // 处理页面切换
  const handlePageChange = React.useCallback((newPage: number) => {
    console.log(`📄 切换到新页面，页码: ${newPage}, 当前aiPosts数据量: ${aiPosts.length}`);
    
    // 立即更新状态和引用，确保后续逻辑能获取到最新的页码
    currentPageRef.current = newPage;
    setCurrentPage(newPage);  // 然后更新状态
    
    console.log(`📄 currentPageRef.current已更新为 ${currentPageRef.current}`);
    
    // 只更新推文数据，不触发整个页面重新加载
    if (websocketService.isConnectionOpen()) {
      console.log(`📤 设置加载状态 postsLoading=true`);
      setPostsLoading(true); // 设置推文加载状态
      
      // 获取新页面的数据（翻页时通常只需要获取推文数据）
      console.log(`📤 [翻页] 发送推文数据请求，页码: ${newPage}, 房间ID: ${effectiveSceneId}, EP: ${selectedEpisode}`);
      
      // 使用setTimeout确保currentPageRef.current已更新
      setTimeout(() => {
        console.log(`📤 发送请求前再次检查 - 当前页码: ${currentPageRef.current}, 数据量: ${aiPosts.length}`);
        
        // 确保使用最新的页码值
        const currentRequestPage = currentPageRef.current;
        console.log(`📤 发送请求使用页码: ${currentRequestPage}`);
        
        websocketService.getSceneFeed(
          Number(effectiveSceneId),
          currentRequestPage, // 使用ref中的最新值
          30,
          selectedEpisode // 添加EP参数（必须有值，由流程确保）
        );
        
        // 设置超时检查，如果长时间没有收到数据，才会重置loading状态
        // 避免短时间内重置loading状态，让handleSceneFeed回调有机会处理
        setTimeout(() => {
          if (postsLoading) {
            console.log('📄 请求发出后10秒仍未收到数据，强制结束loading状态');
            setPostsLoading(false);
          }
        }, 10000); // 增加超时时间到10秒
      }, 0);
    } else {
      console.error('WebSocket连接未建立，无法加载更多数据');
      // 连接未建立时，重置loading状态
      setPostsLoading(false);
    }
  }, [effectiveSceneId, postsLoading, aiPosts.length, selectedEpisode]);

  // 处理推文操作响应（点赞、评论等）
  const handleOperateTweetResponse = React.useCallback((event: any) => {
    console.log('💬 Received OPERATE_TWEET response:', event);
    
    if (event && event.code === 0) {
      // 操作成功，记录响应数据
      const responseData = event.data;
      console.log('💬 Tweet operation successful:', {
        tweetId: responseData?.tweetId,
        type: responseData?.type,
        content: responseData?.content,
        replyId: responseData?.replyId,
        nickName: responseData?.nickName,
        commentId: responseData?.commentId,
        userNo: responseData?.userNo,
        chooseIndex: responseData?.chooseIndex,
        rateList: responseData?.rateList,
        timestamp: new Date().toISOString()
      });
      
      // 根据操作类型显示不同的成功消息
      let successMessage = "Action completed successfully";
      switch (responseData?.type) {
        case 1:
          successMessage = "Like added successfully";
          break;
        case 2:
          successMessage = `Comment posted successfully${responseData?.commentId ? ` (Comment ID: ${responseData.commentId})` : ''}`;
          break;
        case 3:
          successMessage = "Vote submitted successfully";
          break;
      }
      
      toast({
        title: successMessage,
        description: `Operation completed, syncing data...`
      });
      
      console.log('💬 Refreshing feed data...');
      
      // 只更新推文数据，不触发整个页面重新加载
      if (websocketService.isConnectionOpen() && selectedEpisode !== null) {
        setPostsLoading(true); // 只设置推文加载状态
        
        // 延迟更长时间后刷新数据，确保服务器端数据已更新
        setTimeout(() => {
          console.log('💬 Sending GET_SCENE_FEED request to refresh data...');
          websocketService.getSceneFeed(
            Number(effectiveSceneId), 
            currentPageRef.current, 
            30,
            selectedEpisode // 必须有选中的EP
          );
          
          // 短暂延迟后重置加载状态
          setTimeout(() => {
            setPostsLoading(false);
          }, 1000);
        }, 1000); // 增加到1秒延迟
      }
    } else {
      console.error('💬 Tweet operation failed:', {
        code: event?.code,
        message: event?.message,
        data: event?.data
      });
      toast({
        title: "Operation failed",
        description: event?.message || "Tweet operation failed, please try again",
        variant: "destructive"
      });
    }
  }, [effectiveSceneId, selectedEpisode]);
  
  // 初始化加载和设置WebSocket事件处理器
  useEffect(() => {
    console.log('Initializing WebSocket event handlers');
    
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

  // 分离数据加载为单独的effect，避免事件处理器重新注册
  // Hook 1: 只负责加载和【场景】相关的数据（投票、角色历史）
  // 它只在场景ID (effectiveSceneId) 变化时运行
  useEffect(() => {
    const loadSceneGenericData = () => {
      console.log(`[场景数据加载] 场景ID: ${effectiveSceneId}`);
      
      // 重置该场景ID的数据加载状态
      dataLoadedRef.current[effectiveSceneId] = false;
      
      setVotesLoading(true);
      // 这里不再需要 setCharacterHistoryLoading

      if (websocketService.isConnectionOpen()) {
        // 检查用户是否已登录
        const storedLoginStatus = localStorage.getItem('isSignedIn');
        const userIsLoggedIn = storedLoginStatus === 'true';
        
        if (userIsLoggedIn) {
          // 使用请求跟踪函数检查是否应该发送请求
          if (shouldSendRequest(Commands.VOTE_THREAD, Number(effectiveSceneId))) {
            console.log('📤 [场景] 用户已登录，发送投票历史请求...');
        websocketService.send(Commands.VOTE_THREAD, {
          roomId: Number(effectiveSceneId)
            }, true);
          }
        
        setTimeout(() => {
            if (shouldSendRequest(Commands.GET_CHARACTER_HISTORY, Number(effectiveSceneId))) {
              console.log('📤 [场景] 发送角色历史请求...');
          websocketService.send(Commands.GET_CHARACTER_HISTORY, {
            roomId: Number(effectiveSceneId)
              }, true);
            }
          }, 200);
        } else {
          console.log('📤 [场景] 用户未登录，等待登录后再请求投票历史数据');
          // 不发送请求，等待登录成功事件触发后再请求
          // 但设置超时，确保UI不会一直处于加载状态
        }

        // 标记该场景ID的数据已请求
        dataLoadedRef.current[effectiveSceneId] = true;
        
        const loadingTimeout = setTimeout(() => {
          // 在10秒后检查 votesLoading 状态
          // 如果它依然为 true，说明我们没有收到回调
          // 此时强制将其设置为 false
          setVotesLoading(prev => {
            if (prev) {
              console.warn('⚠️ 投票历史加载超时，强制结束加载状态。');
              return false;
            }
            return prev;
          });
        }, 10000);

        // 返回一个清理函数，当组件卸载或useEffect重跑时，清除上一个定时器
        return () => clearTimeout(loadingTimeout);

      } else {
        console.error('WebSocket未连接，无法加载场景通用数据');
      }
    };
    
    if (effectiveSceneId && effectiveSceneId !== 'MainMenu') {
      loadSceneGenericData();
    }
  }, [effectiveSceneId, shouldSendRequest]); // <-- 关键：只依赖 effectiveSceneId

  // 添加新的Effect，监听WebSocket连接事件
  useEffect(() => {
    // 创建处理WebSocket连接事件的函数
    const handleWebSocketConnected = () => {
      console.log('🔄 WebSocket已连接，检查是否需要自动请求场景数据');
      
      if (effectiveSceneId && effectiveSceneId !== 'MainMenu') {
        // 检查该场景的数据是否已经加载过
        if (!dataLoadedRef.current[effectiveSceneId]) {
          console.log('🔄 数据尚未加载，重新请求场景数据，房间ID:', effectiveSceneId);
          setVotesLoading(true);
          
          // 使用requestSceneData方法前先检查是否应该发送请求
          const roomId = Number(effectiveSceneId);
          if (shouldSendRequest(Commands.VOTE_THREAD, roomId) || 
              shouldSendRequest(Commands.GET_CHARACTER_HISTORY, roomId)) {
            const requestId = requestTrackerRef.current[`${Commands.VOTE_THREAD}_${roomId}`]?.requestId;
            websocketService.requestSceneData(roomId, requestId);
    } else {
            console.log('🔄 请求追踪器显示请求已在短时间内发送过，跳过重复请求');
          }
          
          // 标记该场景ID的数据已请求
          dataLoadedRef.current[effectiveSceneId] = true;
          
          // 设置超时保护，避免一直处于加载状态
          const loadingTimeout = setTimeout(() => {
            setVotesLoading(false);
          }, 10000);
          
          return () => clearTimeout(loadingTimeout);
        } else {
          console.log('🔄 该场景数据已经加载过，跳过重复请求');
        }
      }
    };
    
    // 注册事件监听
    window.addEventListener('websocket-connected', handleWebSocketConnected);
    
    // 如果WebSocket已连接，检查是否需要直接请求场景数据
    if (websocketService.isConnectionOpen() && effectiveSceneId && effectiveSceneId !== 'MainMenu') {
      if (!dataLoadedRef.current[effectiveSceneId]) {
        console.log('初始化时WebSocket已连接且数据未加载，立即请求场景数据');
        
        // 初始化也使用请求跟踪机制
        const roomId = Number(effectiveSceneId);
        if (shouldSendRequest(Commands.VOTE_THREAD, roomId) || 
            shouldSendRequest(Commands.GET_CHARACTER_HISTORY, roomId)) {
          const requestId = requestTrackerRef.current[`${Commands.VOTE_THREAD}_${roomId}`]?.requestId;
          websocketService.requestSceneData(roomId, requestId);
        } else {
          console.log('初始化请求追踪器显示请求已在短时间内发送过，跳过重复请求');
        }
        
        // 标记该场景ID的数据已请求
        dataLoadedRef.current[effectiveSceneId] = true;
      } else {
        console.log('初始化时WebSocket已连接但数据已加载，跳过重复请求');
      }
    }
    
    // 清理函数
      return () => {
      window.removeEventListener('websocket-connected', handleWebSocketConnected);
    };
  }, [effectiveSceneId, shouldSendRequest]); // 添加shouldSendRequest作为依赖

  // Hook 2: 只负责加载和【EP】相关的推文数据
  // 它只在选中的EP (selectedEpisode) 变化时运行
  useEffect(() => {
    const loadEpisodePosts = () => {
      console.log(`[EP数据加载] EP: ${selectedEpisode}, 场景ID: ${effectiveSceneId}`);
      setPostsLoading(true);
      setAiPosts([]); // 开始加载新EP时，清空旧推文
      setCurrentPage(0);
      currentPageRef.current = 0;

      if (websocketService.isConnectionOpen()) {
        console.log('📤 [EP] 发送推文数据请求...');
        // 统一使用size=30
        websocketService.getSceneFeed(
          Number(effectiveSceneId), 
          0, 
          30,
          selectedEpisode
        );
      } else {
        console.error('WebSocket未连接，无法加载推文数据');
        setPostsLoading(false);
      }
    };

    if (effectiveSceneId && effectiveSceneId !== 'MainMenu' && selectedEpisode !== null) {
      loadEpisodePosts();
    }
    
    // 如果没有选中EP，确保推文列表不是加载状态
    if (selectedEpisode === null) {
      setPostsLoading(false);
    }
  }, [selectedEpisode, effectiveSceneId]); // <-- 关键：现在主要依赖 selectedEpisode

  // 删除重复的WebSocket监听器
  useEffect(() => {
    console.log('Current data state:', {
      characterHistory: characterHistory.length,
      aiPosts: aiPosts.length,
      voteHistory: voteHistory.length,
      loading,
      effectiveSceneId
    });
  }, [characterHistory, aiPosts, voteHistory, loading, effectiveSceneId]);

  const handleLogin = (userInfo: UserInfo) => {
    // 更新状态
    setIsSignedIn(true);
    setUserInfo(userInfo);
    
    toast({
      title: "Welcome back!",
      description: "You have successfully signed in."
    });
  };

  const handleLogout = () => {
    // 更新状态
    setIsSignedIn(false);
    setUserInfo(null);
    
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
  };

  // 根据 sceneId 获取对应的 tag
  const getTagFromSceneId = (sceneId: string): string => {
    // 根据实际场景ID映射到对应的tag
    const effectiveId = getEffectiveSceneId(sceneId);
    if (effectiveId === '4') return 'ranch';  // 牧场场景
    if (effectiveId === '3') return 'idol';   // 偶像场景
    return 'ranch'; // 默认返回 ranch
  };

  // 处理 tag 选择
  const handleTagSelect = (tagId: string) => {
    // 根据 tag 导航到对应的 roomId
    let targetSceneId = 'MainMenu';
    if (tagId === 'ranch') {
      targetSceneId = '4';  // 牧场场景
    } else if (tagId === 'idol') {
      targetSceneId = '3';  // 偶像场景
    }
    
    // 只更新 URL，然后发送postMessage
    navigate(`/scene?sceneId=${targetSceneId}`);
    // 只发送postMessage，不切换iframe URL
    navigateToScene(targetSceneId);
  };

  const handleLogoClick = () => {
    navigate('/home');
  };

  // 示例：更新场景
  const handleUpdateScene = () => {
    sendMessageToGame({
      type: 'UPDATE_SCENE',
      data: {
        sceneId: '1',
        name: 'Test Scene',
        elements: []
      }
    });
  };

  // 使用useCallback包装所有事件处理函数
  const handleLike = React.useCallback((tweetId: number): void => {
    // 立即更新本地UI状态
    setAiPosts(prevPosts => {
      return prevPosts.map(post => {
        if (post.id === tweetId) {
          // 如果之前没有点赞，点赞数+1；如果之前已点赞，则取消点赞（数量-1）
          const newLikeCount = post.like ? post.likeCount - 1 : post.likeCount + 1;
          return {
            ...post,
            like: !post.like,
            likeCount: newLikeCount
          };
        }
        return post;
      });
    });
    
    // 发送WebSocket请求 - type=1 表示点赞
    websocketService.operateTweet(tweetId, 1, "", 0, 0);
  }, []);

  // 处理投票方法
  const handleVote = React.useCallback((tweetId: number, optionIndex: number): void => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to participate in voting"
      });
      return;
    }
    
    // 找到对应的推文
    const targetPost = aiPosts.find(post => post.id === tweetId);
    if (!targetPost) {
      console.error('Cannot find tweet:', tweetId);
      return;
    }

    // 检查是否已经投过票
    if (targetPost.choose) {
      toast({
        title: "Already voted",
        description: "You have already voted on this thread"
      });
      return;
    }
    
    // 立即更新本地UI状态
    setAiPosts(prevPosts => {
      return prevPosts.map(post => {
        if (post.id === tweetId) {
          // 计算新的投票率分布
          const currentRateList = post.rateList ? [...post.rateList] : [];
          const updatedRateList = [...currentRateList];
          
          // 确保数组有足够的长度
          while (updatedRateList.length <= optionIndex) {
            updatedRateList.push(0);
          }
          
          // 增加选中选项的投票率
          const increment = 10; // 每次投票增加10%
          updatedRateList[optionIndex] = Math.min(100, updatedRateList[optionIndex] + increment);
          
          // 调整其他选项的百分比，确保总和合理
          const totalOthers = updatedRateList.reduce((sum, rate, idx) => 
            idx !== optionIndex ? sum + rate : sum, 0);
          
          if (totalOthers > 0) {
            const reductionRatio = Math.max(0, (100 - updatedRateList[optionIndex]) / totalOthers);
            for (let i = 0; i < updatedRateList.length; i++) {
              if (i !== optionIndex) {
                updatedRateList[i] = Math.max(0, updatedRateList[i] * reductionRatio);
              }
            }
          }
          
          return {
            ...post,
            choose: true, // 标记为已投票
            rateList: updatedRateList
          };
        }
        return post;
      });
    });
    
    // 构建rateList - 发送当前的投票分布
    const currentPost = aiPosts.find(post => post.id === tweetId);
    const currentRateList = currentPost?.rateList ? [...currentPost.rateList] : [];
    
    // 确保rateList有足够的长度并更新选中的选项
    while (currentRateList.length <= optionIndex) {
      currentRateList.push(0);
    }
    
    // 增加选中选项的投票数
    currentRateList[optionIndex] = (currentRateList[optionIndex] || 0) + 1;
    
    console.log('🗳️ 发送投票请求:', {
      tweetId,
      optionIndex,
      rateList: currentRateList,
      timestamp: new Date().toISOString()
    });
    
    // 发送WebSocket请求 - type=3 表示选择/投票，使用实际的tweetId和rateList
    websocketService.operateTweet(tweetId, 3, "", 0, optionIndex, currentRateList);
  }, [isSignedIn, aiPosts]);

  const handleComment = React.useCallback((tweetId: number, comment: string): void => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to post a comment"
      });
      return;
    }
    
    console.log('💬 Submitting comment:', {
      tweetId,
      comment,
      effectiveSceneId,
      timestamp: new Date().toISOString()
    });
    
    // 发送WebSocket请求提交评论 - type=2 表示评论，使用tweetId
    websocketService.operateTweet(tweetId, 2, comment, 0, 0);
  }, [isSignedIn, effectiveSceneId]);

  // 使用useMemo缓存过滤后的结果
  const filteredPosts = React.useMemo(() => {
    // 临时修改：直接返回所有推文，不做过滤
    return aiPosts;
    
    // 原过滤代码（暂时注释掉）
    // // 首先按场景过滤
    // const sceneFilteredPosts = filterPostsByScene(aiPosts, effectiveSceneId);
    // // 然后按EP过滤
    // return filterPostsByEpisode(sceneFilteredPosts, selectedEpisode);
  }, [aiPosts]); // 依赖项只保留 aiPosts
  
  const filteredVotes = React.useMemo(
    () => filterVotesByScene(voteHistory, effectiveSceneId),
    [voteHistory, effectiveSceneId]
  );

  const filteredCharacters = React.useMemo(
    () => filterNpcsByScene(characterHistory, effectiveSceneId),
    [characterHistory, effectiveSceneId]
  );

  // 处理EP列表响应
  const handleEpListResponse = React.useCallback((event: any) => {
    if (event && event.data && event.data.roomDataList) {
      console.log('📋 Received EP list data:', event.data);
      setEpListData(event.data.roomDataList);
      setEpListLoading(false);
      
      // 如果当前没有选中的EP，自动选择最新的EP
      if (selectedEpisode === null) {
        // 获取当前场景的EP列表
        const currentRoomData = event.data.roomDataList.find((room: EpListItem) => 
          room.id === Number(effectiveSceneId)
        );
        
        if (currentRoomData && currentRoomData.epList && currentRoomData.epList.length > 0) {
          // 按EP编号排序并获取最大值（最新的EP）
          const latestEp = [...currentRoomData.epList].sort((a, b) => {
            const numA = parseInt(a.replace('EP', ''));
            const numB = parseInt(b.replace('EP', ''));
            return numB - numA; // 降序排列
          })[0];
          
          // 提取EP编号
          const latestEpNumber = parseInt(latestEp.replace('EP', ''));
          console.log(`🔄 自动选择最新的EP: EP${latestEpNumber}`);
          
          // 设置选中的EP (这会触发上面的useEffect，加载推文数据)
          setSelectedEpisode(latestEpNumber);
          setShowEpisodeList(false);
          
          // 清空当前数据，显示加载状态
          setAiPosts([]);
          setPostsLoading(true);
          
          // 重置页码为0
          setCurrentPage(0);
          currentPageRef.current = 0;
          
          // 这里不需要手动发送GET_SCENE_FEED请求，因为设置selectedEpisode会触发上面的useEffect
          toast({
            title: "Loading Latest Episode",
            description: `Loading content for EP${latestEpNumber}...`
          });
        }
      }
    } else {
      console.warn('Received invalid EP list data:', event);
      setEpListLoading(false);
    }
  }, [selectedEpisode, effectiveSceneId, setSelectedEpisode, setShowEpisodeList, setAiPosts, setPostsLoading, setCurrentPage]);

  // 获取当前场景的EP列表
  const getCurrentSceneEpList = React.useMemo(() => {
    if (!epListData || epListData.length === 0) {
      return [];
    }

    // 根据当前effectiveSceneId找到对应的roomData
    const currentRoomData = epListData.find(room => room.id === Number(effectiveSceneId));
    
    // 如果找到了匹配的roomData，返回其epList；否则返回空数组
    if (!currentRoomData) {
      return [];
    }
    
    // 获取EP列表并按照EP编号从大到小排序
    return [...currentRoomData.epList].sort((a, b) => {
      const numA = parseInt(a.replace('EP', ''));
      const numB = parseInt(b.replace('EP', ''));
      return numB - numA; // 降序排列，最新的EP在前面
    });
  }, [epListData, effectiveSceneId]);

  // 在组件加载时注册EP列表响应处理器并请求EP列表数据
  useEffect(() => {
    // 注册处理器
    websocketService.on(Commands.GET_EP_LIST, handleEpListResponse);
    
    // 请求EP列表数据
    if (websocketService.isConnectionOpen()) {
      console.log('📤 Requesting EP list on component mount...');
      websocketService.getEpList();
      
      // 设置超时保护
      setTimeout(() => {
        if (epListLoading) {
          console.log('EP list loading timeout, resetting loading state');
          setEpListLoading(false);
        }
      }, 10000);
    } else {
      console.error('WebSocket connection not available for EP list');
      setEpListLoading(false);
      
      // 等待连接建立后再次尝试
      setTimeout(() => {
        if (websocketService.isConnectionOpen()) {
          console.log('📤 Retrying EP list request after connection...');
          websocketService.getEpList();
        }
      }, 3000);
    }
    
    // 清理函数
    return () => {
      websocketService.off(Commands.GET_EP_LIST, handleEpListResponse);
    };
  }, [handleEpListResponse]);

  // 处理EP选择
  const handleSelectEpisode = React.useCallback((episodeNumber: number) => {
    setSelectedEpisode(episodeNumber);
    setShowEpisodeList(false);
    setAiPosts([]);
    setPostsLoading(true);
    
    // 重置页码为0，因为这是新的EP过滤
    setCurrentPage(0);
    currentPageRef.current = 0;
    
    // 从服务器重新加载指定EP的数据
    // 注意：这里不再发送请求，因为上面的useEffect会在selectedEpisode变化时自动触发请求
    // 避免重复请求
    
    toast({
      title: "Loading Episode",
      description: `Loading content for EP${episodeNumber}...`
    });
  }, [effectiveSceneId, setSelectedEpisode, setShowEpisodeList, setAiPosts, setPostsLoading, setCurrentPage, postsLoading]);

  // 处理选择NPC事件
  const handleSelectNpc = React.useCallback((npcId: number) => {
    // 根据NPC ID获取对应的roomId
    const newRoomId = getNpcRoomId(npcId);
    const currentRoomId = effectiveSceneId;
    
    // 如果roomId发生变化，重新加载推文数据
    if (newRoomId !== currentRoomId) {
      console.log(`NPC ${npcId} selected, switching from roomId ${currentRoomId} to ${newRoomId}`);
      
      // 设置NPC切换加载状态
      setNpcSwitchLoading(true);
      
      // 立即清空当前推文数据，确保显示新数据
      setAiPosts([]);
      setVoteHistory([]);
      setCharacterHistory([]);
      
      // 重置loading状态
      setPostsLoading(true);
      setVotesLoading(true);
      
      // 重置EP相关状态，让handleEpListResponse自动选择最新的EP
      setSelectedEpisode(null);
      setEpListLoading(true);
      
      // 更新URL参数以反映新的场景
      navigate(`/scene?sceneId=${newRoomId}`);
      
      // 立即重新加载推文数据
      setLoading(true);
      
      // 确保WebSocket连接已建立
      if (websocketService.isConnectionOpen()) {
        // 只发送EP列表请求，其他请求会在EP列表处理后自动发送
        console.log('📤 发送EP列表请求...');
        websocketService.getEpList();
        
        // 给WebSocket响应一些时间
        setTimeout(() => {
          setLoading(false);
          setNpcSwitchLoading(false);
          // 如果在超时后仍然没有数据，停止loading状态
          setTimeout(() => {
            setEpListLoading(false);
          }, 10000); // 额外10秒等待数据
        }, 2000);
      } else {
        console.warn("WebSocket connection not established, waiting for connection...");
        setTimeout(() => {
          if (websocketService.isConnectionOpen()) {
            // 连接建立后也只发送EP列表请求
            console.log('📤 连接恢复后发送EP列表请求...');
            websocketService.getEpList();
          }
          setLoading(false);
          setNpcSwitchLoading(false);
          // 重置loading状态
          setEpListLoading(false);
        }, 2000);
      }
      
      // 只发送postMessage通知游戏引擎场景切换，不切换iframe URL
      navigateToScene(newRoomId);
      
      // 显示切换提示
      toast({
        title: "Switching Scene",
        description: `Switching to ${newRoomId === '3' ? 'Idol Scene' : 'Ranch Scene'}...`
      });
    }
  }, [effectiveSceneId, navigate, setAiPosts, setVoteHistory, setCharacterHistory, setLoading, setPostsLoading, setVotesLoading, setNpcSwitchLoading, setSelectedEpisode, setEpListLoading, navigateToScene]);

  // 添加新的Effect，监听用户登录事件
  useEffect(() => {
    // 创建处理用户登录事件的函数
    const handleUserLoggedIn = () => {
      console.log('👤 用户登录成功，检查是否需要请求投票历史数据');
      if (effectiveSceneId && effectiveSceneId !== 'MainMenu') {
        console.log('👤 用户登录后请求场景数据，房间ID:', effectiveSceneId);
        setVotesLoading(true);
        
        const roomId = Number(effectiveSceneId);
        
        // 用户已登录，使用请求跟踪机制检查是否应该发送请求
        if (shouldSendRequest(Commands.VOTE_THREAD, roomId)) {
          websocketService.send(Commands.VOTE_THREAD, {
            roomId: roomId
          }, true);
        } else {
          console.log('👤 用户登录后检测到投票历史请求已在短时间内发送过，跳过');
        }
        
        setTimeout(() => {
          if (shouldSendRequest(Commands.GET_CHARACTER_HISTORY, roomId)) {
            websocketService.send(Commands.GET_CHARACTER_HISTORY, {
              roomId: roomId
            }, true);
          } else {
            console.log('👤 用户登录后检测到角色历史请求已在短时间内发送过，跳过');
          }
        }, 200);
        
        // 设置超时保护，避免一直处于加载状态
        const loadingTimeout = setTimeout(() => {
          setVotesLoading(false);
        }, 10000);
        
        return () => clearTimeout(loadingTimeout);
      }
    };
    
    // 注册事件监听
    window.addEventListener('user-logged-in', handleUserLoggedIn);
    
    // 清理函数
    return () => {
      window.removeEventListener('user-logged-in', handleUserLoggedIn);
    };
  }, [effectiveSceneId, shouldSendRequest]); // 添加shouldSendRequest作为依赖

  // 渲染内容
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        characters={filteredCharacters} 
        className="flex-shrink-0"
        isSignedIn={isSignedIn}
        userInfo={userInfo}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isUserInfoFolded={isUserInfoFolded}
        onSelectNpc={handleSelectNpc}
        npcSwitchLoading={npcSwitchLoading}
      />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onTagSelect={handleTagSelect} 
          className="flex-shrink-0" 
          selectedTag={getTagFromSceneId(sceneId)}
          onLogoClick={handleLogoClick}
          isCollapsed={isHeaderCollapsed}
          onToggleCollapse={(collapsed) => setIsHeaderCollapsed(collapsed)}
        />
        
          <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
            {/* Game Embed Container - 自适应宽度，与Thread Feed同宽 */}
            <div className="flex-1 h-full min-w-0 min-h-[400px]">
              <div className="w-full h-full relative rounded-lg overflow-hidden bg-white shadow-md">
                <CocosEmbed sceneId={gameSceneId} className="w-full h-full" />
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
                      alt="Scene Banner"
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
                          // 从EP1中提取数字部分
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
                          No episodes available for this scene
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
                  showManga={false} // 在Scene页面显示推文
                />
                </div>
              </div>
              
              {/* Vote History - 1/3 宽度 (scene thread的1/2) - HIDDEN */}
              {/* 
              <div className="flex-1 h-full flex flex-col gap-4 min-w-0">
                {/* Vote Banner - 宽高比 522:234 */}
                {/*
                <div 
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  style={{ aspectRatio: '522/234' }}
                >
                  <img
                    src="/vote_banner.png"
                    alt="Vote Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Vote History Panel */}
                {/*
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <VoteHistoryPanel 
                  voteHistory={filteredVotes} 
                  currentSceneId={effectiveSceneId}
                  loading={votesLoading}
                />
              </div>
            </div>
            */}
          </div>
          </div>
      </main>
    </div>
  );
};

export default Scene;
