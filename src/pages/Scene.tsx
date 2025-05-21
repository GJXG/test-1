import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CocosEmbed, { useCocos } from '@/components/CocosEmbed';
import SceneThreadFeed from '@/components/SceneThreadFeed';
import VoteHistoryPanel from '@/components/VoteHistoryPanel';
import { CharacterHistory, AIPost, VoteHistory } from '@/types/drama';
import { MOCK_SCENE_CHARACTER_HISTORY, MOCK_SCENE_THREAD, MOCK_VOTE_HISTORY } from '@/mock/scene-data';
import { toast } from '@/components/ui/use-toast';
import CharacterHistorySidebar from '@/components/CharacterHistorySidebar';
import { websocketService } from '@/services/websocket';

interface UserInfo {
  userId: string;
  id: string;
  location: string;
  avatar: string;
  points: number;
}

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

  // 当场景ID变化时，强制重新加载数据
  useEffect(() => {
    if (sceneId !== lastSceneId) {
      setLastSceneId(sceneId);
      fetchSceneData();
    }
  }, [sceneId]);

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
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { sendMessageToGame, navigateToScene } = useCocos();
  const [isUserInfoFolded, setIsUserInfoFolded] = useState(false);

  // Check login status on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');
    
    if (storedUserInfo && storedLoginStatus) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsSignedIn(true);
    }
  }, []);

  // Mock API calls to fetch scene data
  const fetchSceneData = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get filtered mock data based on effectiveSceneId
      const charactersData = MOCK_SCENE_CHARACTER_HISTORY.filter(char => char.roomId === effectiveSceneId);
      const postsData = MOCK_SCENE_THREAD.filter(post => post.roomId === effectiveSceneId);
      const votesData = MOCK_VOTE_HISTORY.filter(vote => vote.roomId === effectiveSceneId);

      const tweetData = websocketService.getSceneFeed(Number(effectiveSceneId));

      console.log('Tweet Data:', tweetData);

      console.log('Fetched data:', { 
        charactersCount: charactersData.length,
        postsCount: postsData.length,
        votesCount: votesData.length,
        effectiveSceneId,
        sceneId
      });
      
      // Make sure we always have some data
      if (charactersData.length === 0) {
        console.warn(`No character data found for sceneId: ${effectiveSceneId}, using default scene_A1 data`);
        setCharacterHistory(MOCK_SCENE_CHARACTER_HISTORY.filter(char => char.roomId === '4'));
      } else {
        setCharacterHistory(charactersData);
      }
      
      if (postsData.length === 0) {
        console.warn(`No posts data found for sceneId: ${effectiveSceneId}, using default scene_A1 data`);
        setAiPosts(MOCK_SCENE_THREAD.filter(post => post.roomId === '4'));
      } else {
        setAiPosts(postsData);
      }
      
      if (votesData.length === 0) {
        console.warn(`No vote data found for sceneId: ${effectiveSceneId}, using default scene_A1 data`);
        setVoteHistory(MOCK_VOTE_HISTORY.filter(vote => vote.roomId === '4'));
      } else {
        setVoteHistory(votesData);
      }
    } catch (error) {
      console.error("Error fetching scene data:", error);
      
      // Fallback to scene_A1 data on error
      setCharacterHistory(MOCK_SCENE_CHARACTER_HISTORY.filter(char => char.roomId === '4'));
      setAiPosts(MOCK_SCENE_THREAD.filter(post => post.roomId === '4'));
      setVoteHistory(MOCK_VOTE_HISTORY.filter(vote => vote.roomId === '4'));
      
      toast({
        title: "Error loading scene data",
        description: "Could not load the scene data. Using default content.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    console.log('Initial load with sceneId:', sceneId);
    fetchSceneData();
  }, []);

  // 当场景ID变化时，重新加载数据
  useEffect(() => {
    if (sceneId !== lastSceneId) {
      console.log('Scene ID changed:', { from: lastSceneId, to: sceneId });
      setLastSceneId(sceneId);
      fetchSceneData();
    }
  }, [sceneId]);

  // 添加数据状态日志
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

  useEffect(() => {
    // const handleNewMessage = (message: CharacterHistory) => {
    //   setCharacterHistory(prev => {
    //     // Check if message already exists using id
    //     const exists = prev.some(m => m.id === message.id);
    //     if (exists) return prev;
        
    //     // Add new message to the beginning of the array
    //     return [message, ...prev].slice(0, 10); // Keep only the 10 most recent messages
    //   });
    // };

    const handleNewMessage = (message) => {
      console.log('New message:', message);
      setAiPosts(message.tweetVoList);
    };

    // Subscribe to WebSocket messages
    websocketService.subscribe(handleNewMessage);

    // Cleanup on unmount
    return () => {
      websocketService.unsubscribe(handleNewMessage);
    };
  }, []);

  // 根据 sceneId 获取对应的 tag
  const getTagFromSceneId = (sceneId: string): string => {
    // 这里可以根据实际场景ID映射到对应的tag
    if (sceneId === '4') return 'ranch';
    if (sceneId === '3') return 'idol';
    return 'ranch'; // 默认返回 ranch
  };

  // 处理 tag 选择
  const handleTagSelect = (tagId: string) => {
    // 根据 tag 导航到对应的 sceneId
    let targetSceneId = 'MainMenu';
    if (tagId === 'ranch') {
      targetSceneId = '4';
    } else if (tagId === 'idol') {
      targetSceneId = '3';
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

  function handleLike(tweetId: number): void {
    websocketService.operateTweet(tweetId, 1, "", 0, 0);
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        characters={characterHistory} 
        className="flex-shrink-0"
        isSignedIn={isSignedIn}
        userInfo={userInfo}
        onLogin={handleLogin}
        isUserInfoFolded={isUserInfoFolded}
      />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onTagSelect={handleTagSelect} 
          className="flex-shrink-0" 
          selectedTag={getTagFromSceneId(sceneId)}
          onLogoClick={handleLogoClick}
        />
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading scene...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
            {/* Game Embed */}
            <div className="w-full md:w-[510px] h-full flex-shrink-0 mb-4 md:mb-0 overflow-y-auto">
              <CocosEmbed sceneId={gameSceneId} className="h-full" />
            </div>
            
            {/* Content Columns Container */}
            <div className="flex-1 flex gap-4 h-full">
              {/* Thread Feed */}
              <div className="flex-1 h-full overflow-y-auto border border-gray-200 rounded-lg p-4">
                <SceneThreadFeed 
                  posts={aiPosts} 
                  isSignedIn={isSignedIn}
                  onLike={handleLike}
                />
              </div>
              
              {/* Vote History */}
              <div className="flex-1 h-full overflow-y-auto border border-gray-200 rounded-lg p-4">
                <VoteHistoryPanel voteHistory={voteHistory} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Scene;
