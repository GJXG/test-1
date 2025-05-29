import { CharacterHistory, AIPost, VoteHistory, TweetChoiceOption, TweetComment } from '@/types/drama';

export const MOCK_SCENE_CHARACTER_HISTORY: CharacterHistory[] = [
    {
    roomId: '4',
      npcId: 10016,
      name: 'Yves',
      description: 'Left fame behind—now paints silence, sorrow, and secret dreams.',
      imageUrl: '/images/scene/headDir_10016.png'
    },
    {
    roomId: '4',
      npcId: 10017,
      name: 'Ivy',
      description: 'Bakes love daily—her smile\'s the town\'s unofficial sunshine.',
      imageUrl: '/images/scene/headDir_10017.png'
  },
    {
    roomId: '4',
      npcId: 10018,
      name: 'Liam',
      description: 'Commands every room—cool mind, loyal heart, secrets under control.',
      imageUrl: '/images/scene/headDir_10018.png'
    },
    {
    roomId: '4',
      npcId: 10019,
      name: 'Nina',
      description: 'Moves quietly, thinks sharply—wisdom wrapped in grace and elegance.',
      imageUrl: '/images/scene/headDir_10019.png'
    },
    {
      roomId: '4',
      npcId: 10020,
      name: 'Nova',
      description: 'Earth in her hands—quiet strength beneath sun-warmed simplicity.',
      imageUrl: '/images/scene/headDir_10020.png'
    },
    {
      roomId: '4',
      npcId: 10021,
      name: 'Ryan',
      description: 'Golden boy on court—searching hard for his real self.',
      imageUrl: '/images/scene/headDir_10021.png'
    },
    {
      roomId: '3',
      npcId: 10012,
      name: 'Trump',
      description: 'A passionate dancer with dreams of debuting in a top idol group while dealing with intense competition.',
      imageUrl: '/images/scene/headDir_10012.png'
    },
    {
      roomId: '3',
      npcId: 10009,
      name: 'Elon Musk',
      description: 'The company\'s star trainee known for his angelic voice and kind personality who takes an interest in Min-ji.',
      imageUrl: '/images/scene/headDir_10009.png'
    },
    {
      roomId: '3',
      npcId: 10006,
      name: 'Satoshi',
      description: 'A revolutionary who is determined to change the world.',
      imageUrl: '/images/scene/headDir_10006.png'
    },
    {
      roomId: '3',
      npcId: 10022,
      name: 'Sam Altman',
      description: 'A young musical genius producer who sees Min-ji\'s potential beyond the typical idol image.',
      imageUrl: '/images/scene/headDir_10022.png'
    }
];

export const MOCK_SCENE_THREAD: AIPost[] = [
    {
    id: 1,
    roomId: '4',
    npcId: 10016,
    content: 'Just finished a new painting. It\'s about the silence between words, the space where real understanding happens.',
    imgUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tweetCommentVoList: [],
    commentCount: 2,
    likeCount: 5,
    like: false,
    createTime: Date.now() - 7200000,
    tweetType: 'NORMAL',
    npcName: 'Yves',
    npcAvatar: '/images/scene/headDir_10016.png'
  },
  {
    id: 2,
    roomId: '4',
    npcId: 10017,
    content: 'Baked a new batch of cookies today. The secret ingredient? A little bit of sunshine and a lot of love.',
    imgUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    tweetCommentVoList: [],
    commentCount: 0,
    likeCount: 3,
    like: true,
    createTime: Date.now() - 3600000,
    tweetType: 'NORMAL',
    npcName: 'Ivy',
    npcAvatar: '/images/scene/headDir_10017.png'
  },
  {
    id: 3,
    roomId: '3',
    npcId: 10012,
    content: 'The debut evaluation is coming up. Should I try a completely new concept?',
    imgUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tweetCommentVoList: [],
    commentCount: 1,
    likeCount: 8,
    like: false,
    createTime: Date.now() - 7200000,
    tweetType: 'VOTE',
    npcName: 'Trump',
    npcAvatar: '/images/scene/headDir_10012.png',
    chooseList: [
      'YES',
      'NO'
    ],
    choose: false,
    rateList: [60, 40]
  },
  {
    id: 4,
    roomId: '3',
    npcId: 10009,
    content: 'The producer offered me a solo project. Should I take it?',
    imgUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tweetCommentVoList: [],
    commentCount: 0,
    likeCount: 5,
    like: false,
    createTime: Date.now() - 3600000,
    tweetType: 'VOTE',
    npcName: 'Elon Musk',
    npcAvatar: '/images/scene/headDir_10009.png',
    chooseList: [
      'YES',
      'NO'
    ],
    choose: false,
    rateList: [55, 45]
  }
];

export const MOCK_VOTE_HISTORY: VoteHistory[] = [
  {
    roomId: '4',
    requestId: 1,
    content: 'Should Yves showcase his new painting at the local gallery?',
    hasVoted: false,
    correctOption: 'YES',
    options: ['YES', 'NO'],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    yesCount: '120',
    noCount: '80',
    myYesCount: '0',
    myNoCount: '0'
  },
  {
    roomId: '4',
    requestId: 2,
    content: 'Should Ivy open a bakery in town?',
    hasVoted: true,
    userChoice: 'NO',
    correctOption: 'NO',
    options: ['YES', 'NO'],
    timestamp: new Date(Date.now() - 6000000).toISOString(),
    yesCount: '45',
    noCount: '155',
    myYesCount: '0',
    myNoCount: '1'
  },
  {
    roomId: '3',
    requestId: 3,
    content: 'Should Trump choose a new concept for the evaluation?',
    hasVoted: false,
    correctOption: 'YES',
    options: ['YES', 'NO'],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    yesCount: '85',
    noCount: '65',
    myYesCount: '0',
    myNoCount: '0'
  },
  {
    roomId: '3',
    requestId: 4,
    content: 'Should Elon Musk accept the solo project?',
    hasVoted: true,
    userChoice: 'YES',
    correctOption: 'YES',
    options: ['YES', 'NO'],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    yesCount: '120',
    noCount: '80',
    myYesCount: '1',
    myNoCount: '0'
  }
];

export interface DramaCover {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  coverVideo?: string;
  jumpTo: string;
  tags: string[];
}

export interface Character {
  id: string;
  name: string;
  job: string;
  description: string;
  imageUrl: string;
  jumpTo: string;
  tags: string[];
}

export const MOCK_DRAMA_COVERS: DramaCover[] = [
  {
    id: 'ranch-1',
    title: 'Ranch Love Story',
    description: 'A heartwarming story of love and life on the ranch',
    coverImage: '/images/ranch-cover.jpg',
    coverVideo: '/videos/ranch-preview.mp4',
    jumpTo: 'scene_A1',
    tags: ['ranch']
  },
  {
    id: 'ranch-2',
    title: 'Ranch Adventures',
    description: 'Join the exciting adventures on the ranch',
    coverImage: '/images/ranch-adventures.jpg',
    jumpTo: 'scene_A2',
    tags: ['ranch']
  },
  {
    id: 'idol-1',
    title: 'Urban Idol Life',
    description: 'Follow the journey of aspiring idols in the city',
    coverImage: '/images/idol-cover.jpg',
    coverVideo: '/videos/idol-preview.mp4',
    jumpTo: 'scene_B1',
    tags: ['idol']
  },
  {
    id: 'idol-2',
    title: 'Idol Dreams',
    description: 'Chase your dreams in the world of idols',
    coverImage: '/images/idol-dreams.jpg',
    jumpTo: 'scene_B2',
    tags: ['idol']
  }
];

export const MOCK_CHARACTERS: Character[] = [
  {
    id: 'ranch-char-1',
    name: 'John',
    job: 'Ranch Owner',
    description: 'A kind-hearted ranch owner with a passion for animals',
    imageUrl: '/images/characters/ranch-owner.jpg',
    jumpTo: 'scene_A1',
    tags: ['ranch']
  },
  {
    id: 'ranch-char-2',
    name: 'Sarah',
    job: 'Veterinarian',
    description: 'A dedicated veterinarian who loves helping animals',
    imageUrl: '/images/characters/vet.jpg',
    jumpTo: 'scene_A2',
    tags: ['ranch']
  },
  {
    id: 'idol-char-1',
    name: 'Mina',
    job: 'Trainee Idol',
    description: 'A talented young girl dreaming of becoming an idol',
    imageUrl: '/images/characters/trainee.jpg',
    jumpTo: 'scene_B1',
    tags: ['idol']
  },
  {
    id: 'idol-char-2',
    name: 'Yuki',
    job: 'Idol Manager',
    description: 'An experienced manager guiding young talents',
    imageUrl: '/images/characters/manager.jpg',
    jumpTo: 'scene_B2',
    tags: ['idol']
  }
];
