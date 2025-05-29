import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DramaCover from '@/components/DramaCover';
import CharacterList from '@/components/CharacterList';
import { TabContent } from '@/types/drama';
import { MOCK_DRAMAS } from '@/mock/dramas';
import { toast } from '@/components/ui/use-toast';
import { MOCK_DRAMA_COVERS, MOCK_CHARACTERS } from '@/mock/scene-data';

interface UserInfo {
  userId: string;
  id: string;
  location: string;
  avatar: string;
  points: number;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const tagIdParam = searchParams.get('tagId');
  const navigate = useNavigate();
  
  const [selectedTag, setSelectedTag] = useState<string>(tagIdParam || 'ranch');
  const [currentContent, setCurrentContent] = useState<TabContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Check login status on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedLoginStatus = localStorage.getItem('isSignedIn');
    
    if (storedUserInfo && storedLoginStatus) {
      setUserInfo(JSON.parse(storedUserInfo));
      setIsSignedIn(true);
    }
  }, []);

  // Mock API call to fetch tab content
  const fetchTabContent = async (tagId: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get content from our mock data
    const content = MOCK_DRAMAS[tagId];
    
    if (content) {
      setCurrentContent(content);
    } else {
      setCurrentContent(MOCK_DRAMAS['ranch']); // Default fallback
      toast({
        title: "Content not found",
        description: "Showing default content instead",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

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

  useEffect(() => {
    fetchTabContent(selectedTag);
  }, [selectedTag]);

  const handleTagSelect = (tagId: string) => {
    setSelectedTag(tagId);
  };

  const handleJumpTo = (sceneId: string) => {
    navigate(`/scene?sceneId=${sceneId}`);
  };

  // 根据选中的 tag 过滤内容
  const filteredDramaCovers = MOCK_DRAMA_COVERS.filter(
    cover => cover.tags.includes(selectedTag)
  );

  const filteredCharacters = MOCK_CHARACTERS.filter(
    character => character.tags.includes(selectedTag)
  );

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        className="flex-shrink-0" 
        characters={[]}
        isSignedIn={isSignedIn}
        userInfo={userInfo}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onTagSelect={handleTagSelect} 
          selectedTag={selectedTag}
        />
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 animate-pulse p-8">
              <div className="h-[300px] min-w-[800px] w-[calc(100%-2rem)] bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="flex space-x-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[280px] w-[180px] bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : currentContent ? (
            <div className="space-y-8 p-4">
              {/* Drama Cover Section */}
              <div className="min-w-[800px] w-[calc(100%-1rem)]">
                <DramaCover
                  coverImage={currentContent.drama.coverImageUrl}
                  coverVideo={currentContent.drama.coverVideoUrl}
                  title={currentContent.drama.title}
                  description={currentContent.drama.description}
                  jumpTo={currentContent.drama.jumpTo}
                  onJumpTo={handleJumpTo}
                />
              </div>
              
              {/* Character List Section */}
              <div className="mt-8">
                <div className="px-4">
                  <CharacterList
                    characters={currentContent.drama.characters}
                    onJumpTo={handleJumpTo}
                    className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg text-muted-foreground">No content available</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
