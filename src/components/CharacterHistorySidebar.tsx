import React from 'react';
import { CharacterHistory } from '@/types/drama';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCocos } from './CocosEmbed';
import { getNpcName } from '@/config/npc';

interface CharacterHistorySidebarProps {
  characters: CharacterHistory[];
  className?: string;
  isUserInfoFolded?: boolean;
  onSelectNpc?: (npcId: number) => void;
  npcSwitchLoading?: boolean;
}

const CharacterHistorySidebar: React.FC<CharacterHistorySidebarProps> = ({
  characters,
  className,
  isUserInfoFolded = false,
  onSelectNpc,
  npcSwitchLoading = false
}) => {
  const navigate = useNavigate();
  const { navigateToScene } = useCocos();

  // 格式化时间，显示相对时间（例如：3小时前，2天前）
  const formatRelativeTime = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    
    // 将时间戳转换为毫秒（如果已经是毫秒则不需要）
    const timeMs = timestamp * 1000;
    const now = Date.now();
    const diffMs = now - timeMs;
    
    // 转换为秒、分钟、小时、天
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    // 根据时间差返回合适的格式
    if (diffDay > 30) {
      return `${Math.floor(diffDay / 30)} months ago`;
    } else if (diffDay > 0) {
      return `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return `${diffMin} minutes ago`;
    } else {
      return 'Just now';
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

  const handleCharacterClick = (npcId: number) => {
    // 执行场景导航
    const jumpToSceneId = npcId.toString();
    // 页面导航
    navigate(`/scene?sceneId=${jumpToSceneId}`);
    
    // 同时向 iframe 发送导航事件
    navigateToScene(jumpToSceneId);
    
    // 如果提供了onSelectNpc函数，也调用它来处理场景切换逻辑
    if (onSelectNpc) {
      onSelectNpc(npcId);
    }
  };

  const handleLogoClick = () => {
    navigate('/home');
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <div className="flex items-center justify-center mb-5 relative flex-shrink-0">
        <img 
          src="/logo.png" 
          alt="DraMai Logo" 
          className="h-28 w-auto object-contain hover:scale-105 transition-transform duration-200 cursor-pointer"
          onClick={handleLogoClick}
        />
        <span className="text-base text-gray-400 font-medium absolute right-2 top-1/2 -translate-y-[-32px] translate-x-1/2">.BETA</span>
      </div>

      {/* Navigation */}
      <div className="space-y-3 mb-6 flex-shrink-0">
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

      {/* Character History - 占据剩余空间 */}
      <div className={cn(
        "flex-1 min-h-0 space-y-1.5 overflow-y-auto bg-[#F6F6F6] p-2 rounded-2xl transition-all duration-300 relative",
        isUserInfoFolded ? "mt-4" : ""
      )}>
        {/* 加载状态覆盖层 */}
        {npcSwitchLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Switching scene...</p>
            </div>
          </div>
        )}
        
        {characters.map((character) => (
          <div
            key={character.npcId}
            className={cn(
              "bg-white rounded-2xl py-2 px-3 cursor-pointer hover:bg-gray-50 transition-all shadow-sm min-h-[18px]",
              npcSwitchLoading && "pointer-events-none opacity-50"
            )}
            onClick={() => handleCharacterClick(character.npcId)}
          >
            <div className="flex items-start space-x-2">
              <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mt-3">
                <img
                  src={`/images/scene/headDir_${character.npcId}.png`}
                  alt={`${character.name} avatar`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[#4A95E7] text-base capitalize">{getNpcName(character.npcId)}</span>
                  {character.lastChatTime ? (
                    <span className="text-gray-400 text-sm">{timeAgo(character.lastChatTime)}</span>
                  ) : null}
                </div>
                <p className={cn(
                  "text-gray-600 text-sm mt-1 line-clamp-3 leading-snug",
                  !character.description && "text-gray-300 italic"
                )}>
                  {character.description || "No recent messages"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterHistorySidebar;
