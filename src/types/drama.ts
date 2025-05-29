export interface Tag {
  id: string;
  label: string;
  activeIconUrl: string;    // Icon URL for selected state
  inactiveIconUrl: string;  // Icon URL for unselected state
}

export interface Character {
  npcId: number;
  name: string;
  job: string;
  description: string;
  imageUrl: string;
  jumpTo: string;
  tags: string[];  // Backend provided tags like "#UnfilteredStoryteller" "#GenuineConnector"
}

export interface Drama {
  roomId: number;
  title: string;
  description: string;
  coverImageUrl: string;
  coverVideoUrl?: string;  // Optional video URL for the cover
  jumpTo: string;
  characters: Character[];
}

export interface TabContent {
  drama: Drama;
}

// Scene page related types
export interface CharacterHistory {
  roomId: string;
  npcId: number;
  name: string;
  description: string;
  imageUrl: string;
  lastChatTime?: number; // 添加最后聊天时间属性，用于排序
}

export interface VoteOption {
  type: 'single' | 'multiple';
  options: string[];
  question: string;
}

export interface TweetComment {
  id: number;
  content: string;
  nickName: string;
  authorAvatar?: string; // 可能不需要
  createTime?: number;
  tweetCommentVoList?: TweetComment[]; // 嵌套评论
  tweetCommentVo?: TweetComment[]; // 备用字段名
}

export interface TweetChoiceOption {
  id: string;
  content: string;
  rate: number; // 百分比，如 25 表示 25%
}

export interface AIPost {
  id: number;
  roomId: string | number;
  npcId: number;
  content: string;
  imgUrl?: string;
  videoUrl?: string;
  tweetCommentVoList: TweetComment[];
  commentCount: number;
  likeCount: number;
  like: boolean;
  createTime: number; // 时间戳
  tweetType: string | number;
  npcName?: string; // 可能不在数据中
  npcAvatar?: string; // 可能不在数据中
  chooseList?: string[]; // 改为字符串数组
  choose?: boolean | string; // 可能是布尔值或选项ID
  rateList?: number[]; // 各选项的百分比数组
}

export interface VoteHistory {
  roomId: string;
  requestId: number;
  content: string;
  hasVoted: boolean;
  userChoice?: string;
  correctOption: string;
  options: string[];
  timestamp: string;
  yesCount: string;
  noCount: string;
  myYesCount: string;
  myNoCount: string;
}

export interface SceneData {
  id: string;
  title: string;
  description: string;
  characters: CharacterHistory[];
  aiPosts: AIPost[];
  voteHistory: VoteHistory[];
}

export interface Message {
  id: string;
  content: string;
  characterId: string;
  timestamp: string;
}

export interface ChatMessage {
  id?: number;
  content: string;
  npcId: number;
  createTime: number;
  isUser?: boolean;
  imgUrl?: string;
}

export interface ScenePageProps {
  sceneId: string;
  userId?: string;
}

export interface OperateTweetRequest {
  tweetId: number;
  type: number; // 1=点赞, 2=评论, 3=选择
  content: string;
  replyId: number;
  chooseIndex: number;
  nickName?: string;
  userNo?: string;
  commentId: number; // 新增：评论ID
  rateList: number[]; // 新增：投票比例列表
}

export interface OperateTweetResponse {
  tweetId: number;
  type: number; // 1=点赞, 2=评论, 3=选择
  content: string;
  replyId: number;
  nickName: string;
  commentId: number;
  userNo: string;
  chooseIndex: number;
  rateList: number[];
}
