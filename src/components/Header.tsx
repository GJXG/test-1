import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import DragonBonesAnimation from './DragonBonesAnimation';
import { ChevronUp, ChevronDown } from 'lucide-react';

type Tag = {
  id: string;
  label: string;
  activeIconUrl: string;
  inactiveIconUrl: string;
};

// Mock data for initial development
const MOCK_TAGS: Tag[] = [
  { 
    id: 'ranch', 
    label: 'RANCH LOVE STORY',
    activeIconUrl: '/icons/ranch-active.png',
    inactiveIconUrl: '/icons/ranch-inactive.png'
  },
  { 
    id: 'idol', 
    label: 'URBAN IDOL LIFE',
    activeIconUrl: '/icons/idol-active.png',
    inactiveIconUrl: '/icons/idol-inactive.png'
  },
];

interface HeaderProps {
  onTagSelect: (tagId: string) => void;
  selectedTag: string;
  className?: string;
  onLogoClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onTagSelect, 
  selectedTag, 
  className, 
  onLogoClick,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tags] = useState<Tag[]>(MOCK_TAGS);
  const [key, setKey] = useState(0); // 添加 key 状态来强制重新渲染
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);

  // 使用内部状态或外部传入的状态
  const collapsed = onToggleCollapse ? isCollapsed : internalCollapsed;

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === '/home') {
      // 当路由变为 /home 时，更新 key 以强制重新渲染动画
      setKey(prev => prev + 1);
    }
  }, [location.pathname]);

  const handleTagClick = (tagId: string) => {
    onTagSelect(tagId);
  };

  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  return (
    <header className={cn(
      "bg-background border-b transition-all duration-300 ease-in-out relative overflow-hidden",
      collapsed ? "h-8" : "h-auto",
      className
    )}>
      <div className="w-full">
        {location.pathname === '/home' && (
          <div className={cn(
            "relative w-full overflow-hidden transition-all duration-700 ease-out",
            collapsed ? "h-0 opacity-0" : "h-[250px] opacity-100"
          )}>
            <img
              src="/images/header-bg.png"
              alt="DraMai Header"
              className="w-full h-full object-cover transition-all duration-800 ease-out"
              style={{
                transform: collapsed ? 'translateY(-30px) scale(0.9)' : 'translateY(0) scale(1)',
                transformOrigin: 'center top'
              }}
            />
            <div className={cn(
              "absolute top-4 right-4 transition-all duration-500 ease-out delay-100",
              collapsed ? "opacity-0 translate-y-3 scale-90" : "opacity-100 translate-y-0 scale-100"
            )}>
              <img
                src="/icons/live.png"
                alt="Live"
                className="h-6 w-auto animate-pulse"
              />
            </div>
            <div className={cn(
              "absolute inset-0 bg-gradient-to-b from-transparent to-background transition-all duration-600 ease-out",
              collapsed ? "opacity-0" : "opacity-100"
            )} />
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out delay-50",
              collapsed ? "opacity-0 scale-85 translate-y-6" : "opacity-100 scale-100 translate-y-0"
            )} key={key}>
              <DragonBonesAnimation
                className="w-[800px] h-[00px] ml-[700px] mt-[-50px]"
                skePath="/animations/painting/painting_ske.json"
                texJsonPath="/animations/painting/painting_tex.json"
                texPngPath="/animations/painting/painting_tex.png"
                animationName="paint"
              />
              <DragonBonesAnimation
                className="w-[-800px] h-[100px] ml-[900px] -mt-20"
                skePath="/animations/pickflower/pickflower_ske.json"
                texJsonPath="/animations/pickflower/pickflower_tex.json"
                texPngPath="/animations/pickflower/pickflower_tex.png"
                animationName="pickflower"
              />
            </div>
            <div className={cn(
              "absolute bottom-3 left-8 transition-all duration-600 ease-out delay-75",
              collapsed ? "opacity-0 translate-y-5 scale-90" : "opacity-100 translate-y-0 scale-100"
            )}>
              <img
                src="/images/title.png"
                alt="Live Stream AI Story"
                className="h-[120px] w-auto"
              />
            </div>
          </div>
        )}
        
        <div className={cn(
          "flex items-center justify-between px-4 bg-background relative transition-all duration-300 ease-in-out",
          location.pathname === '/' ? "-mt-5" : "mt-0",
          collapsed ? "h-8 py-0" : "h-auto py-2"
        )}>
          {/* Tags section - 折叠时隐藏 */}
          <div className={cn(
            "flex gap-6 transition-all duration-300 ease-in-out transform",
            collapsed 
              ? "opacity-0 scale-95 pointer-events-none translate-y-1" 
              : "opacity-100 scale-100 pointer-events-auto translate-y-0"
          )}>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={cn(
                  "transition-all duration-200 hover:scale-105 flex items-end transform",
                  selectedTag === tag.id ? "opacity-100" : "opacity-70 hover:opacity-90"
                )}
              >
                <img
                  src={selectedTag === tag.id ? tag.activeIconUrl : tag.inactiveIconUrl}
                  alt={tag.label}
                  className="w-56 h-10 object-contain transition-all duration-300"
                />
              </button>
            ))}
          </div>

          {/* Right section - 包含live-now图标和折叠按钮 */}
          <div className="flex items-center gap-2">
            {/* Live Now 图标 - 折叠时完全隐藏 */}
            <div className={cn(
              "flex items-center transition-all duration-300 ease-in-out transform",
              collapsed 
                ? "opacity-0 scale-75 pointer-events-none translate-x-2" 
                : "opacity-100 scale-100 pointer-events-auto translate-x-0"
            )}>
            <img
              src="/icons/live-now.png"
              alt="Live Now"
                className="h-9 w-auto object-contain mb-0 transition-all duration-300"
              />
            </div>

            {/* 折叠时显示的Live图标 */}
            <div className={cn(
              "flex items-center transition-all duration-300 ease-in-out transform",
              collapsed 
                ? "opacity-100 scale-100 pointer-events-auto translate-x-0" 
                : "opacity-0 scale-75 pointer-events-none -translate-x-2"
            )}>
              <img
                src="/icons/live.png"
                alt="Live"
                className="h-4 w-auto transition-all duration-300"
                style={{
                  animation: collapsed ? 'pulse-slow 3s ease-in-out infinite' : 'none'
                }}
              />
            </div>

            {/* 折叠按钮 */}
            <button
              onClick={handleToggleCollapse}
              className={cn(
                "flex items-center justify-center bg-gray-100/80 hover:bg-gray-200/80 rounded-full transition-all duration-300 ease-in-out backdrop-blur-sm border border-gray-300/50 shadow-sm transform hover:scale-105",
                collapsed ? "w-6 h-6" : "w-9 h-9 mb-0"
              )}
              title={collapsed ? "展开Header" : "折叠Header"}
            >
              <div className="transition-transform duration-300 ease-in-out">
                {collapsed ? (
                  <ChevronDown className="w-3 h-3 text-gray-700 transition-all duration-300" />
                ) : (
                  <ChevronUp className="w-6 h-6 text-gray-700 transition-all duration-300" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
