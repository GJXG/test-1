import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CocosEmbed, { useCocos } from '@/components/CocosEmbed';
import SceneThreadFeed from '@/components/SceneThreadFeed';
import VoteHistoryPanel from '@/components/VoteHistoryPanel';
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
  const { sendMessageToGame, navigateToScene } = useCocos();
  const [isUserInfoFolded, setIsUserInfoFolded] = useState(false);
  const [npcSwitchLoading, setNpcSwitchLoading] = useState(false); // 添加NPC切换加载状态
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false); // 添加Header折叠状态
  const [showEpisodeList, setShowEpisodeList] = useState(false); // 添加Episode列表显示状态
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null); // 添加选中的EP状态

  // Check login status on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');
    
    if (storedUserInfo && storedLoginStatus) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsSignedIn(true);
    }
  }, []);

  // 使用useRef保存当前页码，避免闭包问题
  const currentPageRef = React.useRef(currentPage);
  
  // 当currentPage变化时更新ref
  React.useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // 处理事件处理器和事件依赖项
  const handleSceneFeed = React.useCallback((data: any) => {
    if (data && data.tweetVoList) {
      // 忽略第一条推文信息
      const filteredTweets = data.tweetVoList.slice(1);
      
      console.log('🔍 Received scene feed data:', {
        roomId: data.roomId,
        currentSceneId: searchParams.get('sceneId'),
        effectiveSceneId: getEffectiveSceneId(searchParams.get('sceneId') || 'MainMenu'),
        totalTweetCount: data.tweetVoList.length,
        filteredTweetCount: filteredTweets.length,
        currentPage: currentPageRef.current, // 使用ref中的值
        ignoredFirstTweet: data.tweetVoList.length > 0 ? data.tweetVoList[0].id : 'none',
        firstUsedTweet: filteredTweets.length > 0 ? filteredTweets[0].id : 'none',
        lastTweetId: filteredTweets.length > 0 ? filteredTweets[filteredTweets.length - 1].id : 'none'
      });
      
      // 重要：收到数据后立即重置loading状态，让UI可以更新
      console.log('收到数据，立即设置 postsLoading = false');
      setPostsLoading(false);
      
      // 详细日志：打印接收到的推文ID列表（已忽略第一条）
      console.log('🔄 接收到的推文ID列表(已忽略第一条):', filteredTweets.map((t: any) => t.id).join(', '));
      
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
        
        return {
          roomId: effectiveSceneId, // 直接使用当前的effectiveSceneId
          requestId: vote.requestId || index,
          content: vote.content,
          hasVoted: vote.myYesCount > 0 || vote.myNoCount > 0,
          userChoice: userChoice,
          correctOption: "unknown", // 这个字段在API响应中没有提供
          options: options,
          timestamp: new Date().toISOString(),
          yesCount: vote.yesCount?.toString() || "0",
          noCount: vote.noCount?.toString() || "0",
          myYesCount: vote.myYesCount?.toString() || "0",
          myNoCount: vote.myNoCount?.toString() || "0"
        };
      });
      
      console.log('🗳️ Formatted vote history:', formattedVoteHistory);
      setVoteHistory(formattedVoteHistory);
      setVotesLoading(false); // 投票数据加载完成
      console.log('🗳️ Updated voteHistory state with', formattedVoteHistory.length, 'votes for roomId:', effectiveSceneId);
    } else {
      console.log('🗳️ No vote history data in event:', { 
        event, 
        hasData: !!event?.data, 
        hasVoteList: !!event?.data?.voteHistoryInfoList 
      });
    }
  }, [effectiveSceneId]);
  
  const handleCharacterHistory = React.useCallback((event: any) => {
    console.log('🎭 handleCharacterHistory called with event:', event);
    
    if (event && event.data && event.data.playerNpcChatDataMap) {
      console.log('🎭 Received character history data:', event.data);
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
      
      console.log('🎭 Setting characterHistory with', characters.length, 'characters:', characters.map(c => ({ npcId: c.npcId, name: c.name, roomId: c.roomId })));
      setCharacterHistory(characters);
      console.log('🎭 Updated characterHistory with', characters.length, 'characters');
    } else {
      console.warn('🎭 No character history data received:', event);
    }
  }, []);

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
      let successMessage = "操作成功";
      switch (responseData?.type) {
        case 1:
          successMessage = "点赞成功";
          break;
        case 2:
          successMessage = `评论成功${responseData?.commentId ? ` (评论ID: ${responseData.commentId})` : ''}`;
          break;
        case 3:
          successMessage = "投票成功";
          break;
      }
      
      toast({
        title: successMessage,
        description: `操作已完成，数据同步中...`
      });
      
      console.log('💬 Refreshing feed data...');
      
      // 只更新推文数据，不触发整个页面重新加载
      if (websocketService.isConnectionOpen()) {
        setPostsLoading(true); // 只设置推文加载状态
        
        // 延迟更长时间后刷新数据，确保服务器端数据已更新
        setTimeout(() => {
          console.log('💬 Sending GET_SCENE_FEED request to refresh data...');
          websocketService.send(Commands.GET_SCENE_FEED, { 
            roomId: Number(effectiveSceneId), 
            page: currentPageRef.current, 
            size: 10 
          });
          
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
        title: "操作失败",
        description: event?.message || "推文操作失败，请重试",
        variant: "destructive"
      });
    }
  }, [effectiveSceneId]);

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
      console.log(`📤 [翻页] 发送推文数据请求，页码: ${newPage}, 房间ID: ${effectiveSceneId}`);
      
      // 使用setTimeout确保currentPageRef.current已更新
      setTimeout(() => {
        console.log(`📤 发送请求前再次检查 - 当前页码: ${currentPageRef.current}, 数据量: ${aiPosts.length}`);
        
        // 确保使用最新的页码值
        const currentRequestPage = currentPageRef.current;
        console.log(`📤 发送请求使用页码: ${currentRequestPage}`);
        
        websocketService.send(Commands.GET_SCENE_FEED, { 
          roomId: Number(effectiveSceneId), 
          page: currentRequestPage, // 使用ref中的最新值
          size: 10
        });
        
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
  }, [effectiveSceneId, postsLoading, aiPosts.length]);
  
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
  useEffect(() => {
    console.log('Loading scene data, sceneId:', sceneId, 'effectiveSceneId:', effectiveSceneId);
    
    // 定义数据加载函数 - 按顺序发送请求
    const loadSceneData = () => {
      console.log(`Starting to fetch scene data sequentially, Scene ID: ${effectiveSceneId}, currentPage: ${currentPageRef.current}`);
      
      // 加载场景数据
      setLoading(true);
      setPostsLoading(true); // 重置推文加载状态
      setVotesLoading(true); // 重置投票加载状态
      
      // 第一个请求：获取场景推文数据
      console.log('📤 [1/3] 发送推文数据请求...');
      websocketService.send(Commands.GET_SCENE_FEED, { 
        roomId: Number(effectiveSceneId), 
        page: currentPageRef.current, 
        size: 10 // 每页10条
      }, true); // 绕过登录检查
      
      // 延迟发送第二个请求：获取投票历史记录
      setTimeout(() => {
        console.log('📤 [2/3] 发送投票历史请求...');
        websocketService.send(Commands.VOTE_THREAD, {
          roomId: Number(effectiveSceneId)
        }, true); // 绕过登录检查
        
        // 延迟发送第三个请求：获取角色历史
        setTimeout(() => {
          console.log('📤 [3/3] 发送角色历史请求...');
          websocketService.send(Commands.GET_CHARACTER_HISTORY, {
            roomId: Number(effectiveSceneId)
          }, true); // 绕过登录检查
          
          console.log('✅ 所有三个请求已按顺序发送完成');
        }, 500); // 第三个请求延迟500ms
        
      }, 500); // 第二个请求延迟500ms
      
      // 给WebSocket响应一些时间
      setTimeout(() => {
        setLoading(false);
        // 如果在超时后仍然没有数据，停止loading状态
        setTimeout(() => {
          setPostsLoading(false);
          setVotesLoading(false);
        }, 5000); // 额外5秒等待数据
      }, 1500);
    };

    // 检查WebSocket连接状态（不检查登录状态）
    if (websocketService.isConnectionOpen()) {
      console.log('🚀 WebSocket连接已建立，立即加载数据（跳过登录检查）');
      loadSceneData();
    } else {
      console.log('⏳ WebSocket未连接，等待连接建立...');
      
      // 使用定时器检查连接状态
      const connectionCheckTimer = setInterval(() => {
        if (websocketService.isConnectionOpen()) {
          clearInterval(connectionCheckTimer);
          console.log('✅ WebSocket连接已建立，开始加载场景数据');
          loadSceneData();
        }
      }, 500); // 每500ms检查一次
      
      // 设置超时兜底机制
      const timeoutTimer = setTimeout(() => {
        clearInterval(connectionCheckTimer);
        console.warn('⚠️ WebSocket连接超时，尝试强制加载数据');
        loadSceneData(); // 即使没连接也尝试加载
      }, 10000); // 10秒超时
      
      return () => {
        clearInterval(connectionCheckTimer);
        clearTimeout(timeoutTimer);
      };
    }
  }, [effectiveSceneId]); // 只依赖effectiveSceneId

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
    
    // 更新 URL 并导航到新场景
    navigate(`/scene?sceneId=${targetSceneId}`);
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
    // 首先按场景过滤
    const sceneFilteredPosts = filterPostsByScene(aiPosts, effectiveSceneId);
    // 然后按EP过滤
    return filterPostsByEpisode(sceneFilteredPosts, selectedEpisode);
  }, [aiPosts, effectiveSceneId, selectedEpisode]);
  
  const filteredVotes = React.useMemo(
    () => filterVotesByScene(voteHistory, effectiveSceneId),
    [voteHistory, effectiveSceneId]
  );

  const filteredCharacters = React.useMemo(
    () => filterNpcsByScene(characterHistory, effectiveSceneId),
    [characterHistory, effectiveSceneId]
  );

  // 添加调试日志
  React.useEffect(() => {
    console.log('🏠 Scene Debug - Character Data:', {
      effectiveSceneId,
      characterHistoryLength: characterHistory.length,
      filteredCharactersLength: filteredCharacters.length,
      characterHistory: characterHistory.map(c => ({ npcId: c.npcId, name: c.name, roomId: c.roomId })),
      filteredCharacters: filteredCharacters.map(c => ({ npcId: c.npcId, name: c.name, roomId: c.roomId }))
    });
  }, [characterHistory, filteredCharacters, effectiveSceneId]);

  // 处理EP选择
  const handleEpisodeSelect = React.useCallback((episodeNumber: number) => {
    console.log(`EP${episodeNumber} selected, loading data from server...`);
    setSelectedEpisode(episodeNumber);
    setShowEpisodeList(false); // 选择后关闭列表
    
    // 清空当前数据，显示加载状态
    setAiPosts([]);
    setPostsLoading(true);
    
    // 重置页码为0，因为这是新的EP过滤
    setCurrentPage(0);
    currentPageRef.current = 0;
    
    // 从服务器重新加载指定EP的数据
    if (websocketService.isConnectionOpen()) {
      console.log(`📤 Loading data for EP${episodeNumber} from server...`);
      
      // 发送请求时可以添加EP参数，如果后端支持的话
      // 这里先发送标准请求，然后在客户端过滤
      websocketService.send(Commands.GET_SCENE_FEED, { 
        roomId: Number(effectiveSceneId), 
        page: 0, 
        size: 50, // 增加数量以获取更多数据用于EP过滤
        episode: episodeNumber // 如果后端支持EP过滤参数
      });
      
      // 设置超时保护
      setTimeout(() => {
        if (postsLoading) {
          console.log(`EP${episodeNumber} data loading timeout, resetting loading state`);
          setPostsLoading(false);
        }
      }, 10000);
    } else {
      console.error('WebSocket connection not available');
      setPostsLoading(false);
    }
    
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
      
      // 更新URL参数以反映新的场景
      navigate(`/scene?sceneId=${newRoomId}`);
      
      // 立即重新加载推文数据
      setLoading(true);
      
      // 确保WebSocket连接已建立
      if (websocketService.isConnectionOpen()) {
        // 按顺序发送三个请求
        console.log('📤 [1/3] 发送新场景推文数据请求...');
        websocketService.send(Commands.GET_SCENE_FEED, { 
          roomId: Number(newRoomId), 
          page: 0, 
          size: 10 
        });
        
        // 延迟发送第二个请求
        setTimeout(() => {
          console.log('📤 [2/3] 发送新场景投票历史请求...');
          websocketService.getVoteHistory(Number(newRoomId));
          
          // 延迟发送第三个请求
          setTimeout(() => {
            console.log('📤 [3/3] 发送新场景角色历史请求...');
            websocketService.send(Commands.GET_CHARACTER_HISTORY, {
              roomId: Number(newRoomId)
            });
            
            console.log('✅ NPC切换：所有三个请求已按顺序发送完成');
          }, 500); // 第三个请求延迟500ms
          
        }, 500); // 第二个请求延迟500ms
        
        // 给WebSocket响应一些时间
        setTimeout(() => {
          setLoading(false);
          setNpcSwitchLoading(false);
          // 如果在超时后仍然没有数据，停止loading状态
          setTimeout(() => {
            setPostsLoading(false);
            setVotesLoading(false);
          }, 5000); // 额外5秒等待数据
        }, 1500);
      } else {
        console.warn("WebSocket connection not established, waiting for connection...");
        setTimeout(() => {
          if (websocketService.isConnectionOpen()) {
            // 连接建立后也按顺序发送
            console.log('📤 [1/3] 连接恢复后发送推文数据请求...');
            websocketService.send(Commands.GET_SCENE_FEED, { 
              roomId: Number(newRoomId), 
              page: 0, 
              size: 10 
            });
            
            setTimeout(() => {
              console.log('📤 [2/3] 连接恢复后发送投票历史请求...');
              websocketService.getVoteHistory(Number(newRoomId));
              
              setTimeout(() => {
                console.log('📤 [3/3] 连接恢复后发送角色历史请求...');
                websocketService.send(Commands.GET_CHARACTER_HISTORY, {
                  roomId: Number(newRoomId)
                });
              }, 500);
              
            }, 500);
          }
          setLoading(false);
          setNpcSwitchLoading(false);
          // 重置loading状态
          setPostsLoading(false);
          setVotesLoading(false);
        }, 2000);
      }
      
      // 通知游戏引擎场景切换
      navigateToScene(newRoomId);
      
      // 显示切换提示
      toast({
        title: "Switching Scene",
        description: `Switching to ${newRoomId === '3' ? 'Idol Scene' : 'Ranch Scene'}...`
      });
    }
  }, [effectiveSceneId, navigate, setAiPosts, setVoteHistory, setCharacterHistory, setLoading, setPostsLoading, setVotesLoading, setNpcSwitchLoading, navigateToScene]);

  // 添加测试用模拟数据
  React.useEffect(() => {
    if (characterHistory.length === 0) {
      console.log('🧪 Adding mock character data for testing...');
      const mockCharacters: CharacterHistory[] = [
        {
          roomId: effectiveSceneId,
          npcId: 10016,
          name: 'Test Character 1',
          description: 'This is a test character to verify sidebar display',
          imageUrl: '/images/scene/headDir_10016.png',
          lastChatTime: Date.now() / 1000
        },
        {
          roomId: effectiveSceneId,
          npcId: 10017,
          name: 'Test Character 2',
          description: 'Another test character for sidebar verification',
          imageUrl: '/images/scene/headDir_10017.png',
          lastChatTime: Date.now() / 1000 - 3600
        }
      ];
      setCharacterHistory(mockCharacters);
      console.log('🧪 Mock character data added:', mockCharacters);
    }
  }, [effectiveSceneId, characterHistory.length]);

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
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading scene...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
            {/* Game Embed Container - 维持486:864比例 */}
            <div 
              className="flex-shrink-0 w-full lg:w-auto max-w-full" 
              style={{ 
                aspectRatio: '486/864',
                minHeight: '300px' // 确保在极小屏幕上也有最小高度
              }}
            >
              <div className="w-full h-full relative rounded-lg overflow-hidden bg-white shadow-md">
                <CocosEmbed sceneId={gameSceneId} className="w-full h-full" />
              </div>
            </div>
            
            {/* Content Columns Container - 与Cocos容器同宽的基础上分配Thread和Vote */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-w-0">
              {/* Thread Feed - 2/3 宽度 */}
              <div className="flex-[2] h-full flex flex-col gap-2 min-w-0">
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
                      {Array.from({ length: 15 }, (_, index) => {
                        const episodeNumber = 15 - index; // 从EP15开始倒序
                        const isSelected = selectedEpisode === episodeNumber;
                        return (
                          <button
                            key={episodeNumber}
                            className={`font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm ${
                              isSelected
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                            onClick={() => handleEpisodeSelect(episodeNumber)}
                          >
                            EP{episodeNumber}
                          </button>
                        );
                      })}
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
                />
                </div>
              </div>
              
              {/* Vote History - 1/3 宽度 (scene thread的1/2) */}
              <div className="flex-1 h-full flex flex-col gap-4 min-w-0">
                {/* Vote Banner - 宽高比 522:234 */}
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
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <VoteHistoryPanel 
                  voteHistory={filteredVotes} 
                  currentSceneId={effectiveSceneId}
                  loading={votesLoading}
                />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Scene;
