import React from 'react';
import { CharacterHistory } from '@/types/drama';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCocos } from './CocosEmbed';

interface CharacterHistorySidebarProps {
  characters: CharacterHistory[];
  className?: string;
  isUserInfoFolded?: boolean;
}

const CharacterHistorySidebar: React.FC<CharacterHistorySidebarProps> = ({
  characters,
  className,
  isUserInfoFolded = false
}) => {
  const navigate = useNavigate();
  const { navigateToScene } = useCocos();

  const handleCharacterClick = (jumpToSceneId: string) => {
    // 页面导航
    navigate(`/scene?sceneId=${jumpToSceneId}`);
    
    // 同时向 iframe 发送导航事件
    navigateToScene(jumpToSceneId);
  };

  const handleLogoClick = () => {
    navigate('/home');
  };

  return (
    <aside className={cn(
      "w-[260px] flex flex-col h-screen bg-sidebar border-r border-sidebar-border p-4",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center justify-center mb-5 -mt-8 relative">
        <img 
          src="/logo.png" 
          alt="DraMai Logo" 
          className="h-28 w-auto object-contain hover:scale-105 transition-transform duration-200 cursor-pointer"
          onClick={handleLogoClick}
        />
        <span className="text-base text-gray-400 font-medium absolute right-2 top-1/2 -translate-y-[-32px] translate-x-1/2">.BETA</span>
      </div>

      {/* Navigation */}
      <div className="space-y-3 mb-6 -mt-4">
        <button 
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-[#E6E0FF] hover:bg-[#E6E0FF]/90 transition-colors"
          onClick={() => navigateToScene("MainMenu")}
        >
          <span className="text-[#6B4EFF] font-semibold text-lg">Discover Stories</span>
        </button>
        <button 
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-[#F3F3F3] hover:bg-[#EBEBEB] transition-colors"
          onClick={() => navigateToScene("Level1")}
        >
          <span className="text-[#999999] font-semibold text-lg">Search</span>
        </button>
      </div>

      {/* Character History */}
      <div className={cn(
        "space-y-1.5 overflow-y-auto flex-1 bg-[#F6F6F6] p-2 rounded-2xl -mt-2 transition-all duration-300",
        isUserInfoFolded ? "mt-4" : "-mt-2"
      )}>
        {characters.map((character) => (
          <div
            key={character.npcId}
            className="bg-white rounded-2xl py-2 px-3 cursor-pointer hover:bg-gray-50 transition-all shadow-sm min-h-[18px]"
            onClick={() => handleCharacterClick(character.npcId.toString())}
          >
            <div className="flex items-start space-x-2">
              <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mt-3">
                <img
                  src={character.imageUrl}
                  alt={`${character.name} avatar`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[#4A95E7] text-base capitalize">{character.name}</span>
                  <span className="text-gray-400 text-sm">1 day</span>
                </div>
                <p className="text-gray-600 text-sm mt-0.3 line-clamp-2 leading-[0.8]">
                  {character.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default CharacterHistorySidebar;
