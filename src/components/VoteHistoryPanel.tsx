import React, { useState } from 'react';
import { VoteHistory } from '@/types/drama';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';

interface VoteHistoryPanelProps {
  voteHistory: VoteHistory[];
  className?: string;
  loading?: boolean;
  currentSceneId?: string;
}

const VoteHistoryPanel: React.FC<VoteHistoryPanelProps> = ({
  voteHistory,
  className,
  loading = false,
  currentSceneId = '4',
}) => {
  // 添加调试信息
  console.log('🗳️ VoteHistoryPanel render:', {
    voteHistoryLength: voteHistory.length,
    currentSceneId,
    loading,
    voteHistory: voteHistory.map(v => ({ 
      roomId: v.roomId, 
      content: v.content, 
      userChoice: v.userChoice,
      hasVoted: v.hasVoted,
      options: v.options
    }))
  });

  // 如果正在加载，显示加载动画
  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full", className)}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vote history...</p>
        </div>
      </div>
    );
  }

  // 如果没有投票历史数据，显示提示信息
  if (voteHistory.length === 0) {
    console.log('🗳️ No vote history data, showing empty state');
    return (
      <div className={cn("flex flex-col items-center justify-center h-full", className)}>
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🗳️</span>
          </div>
          <p className="text-lg mb-2">No Vote History</p>
          <p className="text-sm">Votes will appear here once available</p>
          <p className="text-xs mt-2 text-gray-400">Scene: {currentSceneId}</p>
        </div>
      </div>
    );
  }

  console.log('🗳️ Rendering vote history with', voteHistory.length, 'items');

  // 根据场景获取选项
  const getOptionsForScene = (sceneId: string) => {
    // 统一使用YES、NO两个选项，移除场景判断
    return ['YES', 'NO'];
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      {voteHistory.map((vote, index) => {
        const options = getOptionsForScene(currentSceneId);
        const selectedOption = vote.userChoice;
        
        console.log(`🗳️ Rendering vote ${index}:`, { vote, options, selectedOption });
        
        return (
          <React.Fragment key={`${vote.requestId}-${index}`}>
            {/* Question Box */}
            <div
              className={cn(
                "w-full max-w-2xl rounded-lg border-2 border-[#E3B341] px-4 py-2",
                selectedOption ? "bg-[#E3B341]" : "bg-transparent"
              )}
            >
              <p className={cn(
                "text-center text-sm leading-tight",
                selectedOption ? "text-[#8B5E34]" : "text-[#E3B341]"
              )}>
                {vote.content}
              </p>
            </div>

            {/* Vote Options - Show as static display */}
            <div className="w-full flex flex-col items-center">
              {selectedOption && (
                <p className="text-gray-500 text-xs mb-2">Your choice</p>
              )}
              <div className="flex items-center justify-center gap-4 w-full max-w-md">
                {options.map((option) => {
                  const isSelected = selectedOption === option;
                  
                  return (
                    <div
                      key={option}
                      className={cn(
                        "px-4 py-1.5 rounded-md border-2 border-[#E3B341] text-sm font-medium",
                        isSelected
                          ? "bg-[#E3B341] text-[#8B5E34]"
                          : "bg-transparent text-[#E3B341]",
                        "min-w-[60px] text-center"
                      )}
                    >
                      {option}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Arrow - show after options */}
            {index < voteHistory.length - 1 && (
              <div className="flex justify-center w-full py-1">
                <ChevronDown className="w-6 h-6 text-[#E3B341]" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default React.memo(VoteHistoryPanel, (prevProps, nextProps) => {
  // 自定义比较函数，只有在关键props变化时才重新渲染
  const voteHistoryEqual = prevProps.voteHistory.length === nextProps.voteHistory.length &&
    prevProps.voteHistory.every((vote, index) => 
      nextProps.voteHistory[index]?.requestId === vote.requestId
    );
  
  const sceneIdEqual = prevProps.currentSceneId === nextProps.currentSceneId;
  const loadingEqual = prevProps.loading === nextProps.loading;

  // 如果主要props没变，返回true表示不需要重新渲染
  return voteHistoryEqual && sceneIdEqual && loadingEqual;
});
