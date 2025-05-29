import React from 'react';
import { cn } from '@/lib/utils';
import { CharacterHistory } from '@/types/drama';
import CharacterHistorySidebar from './CharacterHistorySidebar';
import UserInfoPanel from './UserInfoPanel';
import SocialMediaIcons from './SocialMediaIcons';
import { useLocation } from 'react-router-dom';

interface UserInfo {
  userId: string;
  id: string;
  location: string;
  avatar: string;
  points: number;
}

interface SidebarProps {
  characters: CharacterHistory[];
  className?: string;
  isSignedIn?: boolean;
  userInfo?: UserInfo | null;
  onLogin?: (userInfo: UserInfo) => void;
  onLogout?: () => void;
  isUserInfoFolded?: boolean;
  onSelectNpc?: (npcId: number) => void;
  npcSwitchLoading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  characters = [],
  isSignedIn = false,
  userInfo = null,
  onLogin,
  onLogout,
  isUserInfoFolded,
  onSelectNpc,
  npcSwitchLoading = false
}) => {
  const location = useLocation();
  const isScenePage = location.pathname === '/scene';
  const [isFolded, setIsFolded] = React.useState(true);

  const handleFoldChange = (folded: boolean) => {
    setIsFolded(folded);
  };

  return (
    <aside className={cn(
      "w-[280px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col",
      className
    )}>
      {/* 主要内容区域 - 占据剩余空间 */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        {/* 显示角色列表 - 占据所有可用空间 */}
        <div className="flex-1 min-h-0">
          <CharacterHistorySidebar 
            characters={characters}
            className="h-full"
            isUserInfoFolded={isFolded}
            onSelectNpc={onSelectNpc}
            npcSwitchLoading={npcSwitchLoading}
          />
        </div>
      </div>

      {/* 底部固定区域 - 用户信息和社交媒体图标 */}
      <div className="flex-shrink-0 p-4 pt-0">
        <UserInfoPanel
          isSignedIn={isSignedIn}
          userInfo={userInfo}
          onLogin={onLogin}
          onLogout={onLogout}
          isFolded={isFolded}
          onFoldChange={handleFoldChange}
        />
        <SocialMediaIcons />
      </div>
    </aside>
  );
};

export default Sidebar;