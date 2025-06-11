import { CharacterHistory } from '@/types/drama';
import { OperateTweetRequest, OperateTweetResponse } from '@/types/drama';
import { MOCK_SCENE_CHARACTER_HISTORY } from '@/mock/scene-data';

// 环境配置
const ENV = {
  TEST: 'test',
  PROD: 'production'
};

// WebSocket 服务器配置
const WS_SERVERS = {
  [ENV.TEST]: 'wss://dramai.world/api/ws',
  [ENV.PROD]: 'wss://dramai.world/api/ws'
};

// 当前环境
const CURRENT_ENV = process.env.NODE_ENV === 'development' ? ENV.TEST : ENV.PROD;

// Command types
export const Commands = {
  LOGIN: 10000,
  GET_SCENE_FEED: 10112,  // 获取场景推文数据
  VOTE_THREAD: 10119,     // 获取投票历史
  GET_CHARACTER_HISTORY: 10114,  // 获取角色历史聊天记录
  OPERATE_TWEET: 10113,   // 操作推文(点赞、评论等)
  HEARTBEAT: 10001,       // 心跳包命令
  GET_EP_LIST: 10109,     // 获取EP列表
  GET_USER_POINTS: 100081, // 获取用户积分
};

// 心跳配置
const HEARTBEAT_CONFIG = {
  INTERVAL: 30000,        // 心跳间隔：30秒
  TIMEOUT: 10000,         // 心跳超时：10秒
  MAX_MISSED: 3,          // 最大丢失心跳次数
};

// 心跳统计接口
interface HeartbeatStats {
  totalSent: number;
  totalReceived: number;
  totalTimeouts: number;
  averageRTT: number;
  lastRTT: number;
  connectionUptime: number;
}

// 定义新的接口类型
interface LoginRequestData {
  loginType: number;
  name: string;
  password: string;
  nickName: string;
  avatar: number;
  sex: number;
  timeZone: number;
  clientOs: string;
  userId: string;
  inviteCode: string;
  invite: string;
  address: string;
}

interface Tweet {
  id: number;
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  voteCount: number;
  commentCount: number;
  isLiked: boolean;
}

interface SceneFeedResponse {
  roomId: number;
  tweetVoList: Tweet[];
}

interface LoginResponseData {
  token: string;
  timestamp: number;
  player: {
    playerId: string;
    charater: number;
    loginType: number;
    address: string;
  };
}

interface InetwarkResponseData {
  requestId: number;
  playerId?: number;
  type: number;
  command: number;
  code: number;
  message: string;
  data: LoginResponseData | SceneFeedResponse;
}

interface WebSocketEvent {
  command: number;
  data: any;
  code: number;
  message: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<number, ((event: WebSocketEvent) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isLoggedIn = false;
  private pendingRequests: { command: number; data: any }[] = [];
  
  // 心跳相关属性
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private missedHeartbeats = 0;
  private lastHeartbeatTime = 0;
  private isHeartbeatEnabled = false;
  private heartbeatConfig = { ...HEARTBEAT_CONFIG }; // 可配置的心跳参数
  private heartbeatStats: HeartbeatStats = {
    totalSent: 0,
    totalReceived: 0,
    totalTimeouts: 0,
    averageRTT: 0,
    lastRTT: 0,
    connectionUptime: 0
  };
  private connectionStartTime = 0;
  private rttHistory: number[] = [];

  constructor() {
    if (CURRENT_ENV === ENV.PROD) {
      console.log('Running in production environment, connecting to production WebSocket server');
    } else {
      console.log('Running in development environment, connecting to test WebSocket server');
    }
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }

    try {
      const wsUrl = WS_SERVERS[CURRENT_ENV];
      console.log(`Connecting to ${CURRENT_ENV} WebSocket server: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`WebSocket connected to ${CURRENT_ENV} server`);
        this.reconnectAttempts = 0;
        this.startHeartbeat(); // 启动心跳机制
        
        // 触发WebSocket连接事件
        window.dispatchEvent(new CustomEvent('websocket-connected'));
        
        // 检查是否已有登录信息，如果有则自动登录
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedLoginStatus = localStorage.getItem('isSignedIn');
        
        if (storedUserInfo && storedLoginStatus) {
          // 如果用户已经登录过，使用存储的信息进行自动登录
          const userInfo = JSON.parse(storedUserInfo);
          console.log('🔄 WebSocket重连后自动重新登录:', userInfo.userId);
          
          // 在重新登录之前，先尝试重发不需要登录的请求
          this.retryFailedRequestsAfterReconnect();
          
          if (userInfo.userId.includes('@')) {
            // 如果是邮箱格式，说明是Google登录
            const googleUser = {
              getBasicProfile: () => ({
                getEmail: () => userInfo.userId,
                getName: () => userInfo.userId.split('@')[0],
                getId: () => userInfo.id
              })
            };
            this.googleLogin(googleUser);
          } else {
            // 否则使用普通登录
            const loginData: LoginRequestData = {
              loginType: 1,
              name: userInfo.userId,
              password: 'stored_session',
              nickName: userInfo.userId,
              avatar: 0,
              sex: 1,
              timeZone: 2,
              clientOs: 'web',
              userId: userInfo.id,
              inviteCode: '',
              invite: '',
              address: ''
            };
            this.login(loginData);
          }
        } else {
          console.log('No stored login information, waiting for user to login manually');
          // 即使没有登录信息，也要尝试重发一些不需要登录的请求
          this.retryFailedRequestsAfterReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const response = JSON.parse(event.data) as InetwarkResponseData;
            console.log('Received message from server:', {
              timestamp: new Date().toISOString(),
              rawMessage: event.data,
              command: response.command,
              code: response.code,
              errorMessage: response.message
            });

            // 处理心跳响应
            if (response.command === Commands.HEARTBEAT) {
              this.handleHeartbeatResponse(response);
              return; // 心跳响应不需要触发其他处理器
            }

            // 处理登录响应
            if (response.command === Commands.LOGIN) {
              this.processLoginResponse(response);
            }

            // 触发对应命令的事件处理器
            const handlers = this.eventHandlers.get(response.command);
            if (handlers) {
              const event: WebSocketEvent = {
                command: response.command,
                data: response.data,
                code: response.code,
                message: response.message
              };
              handlers.forEach(handler => handler(event));
            }
          } else {
            console.warn('Received non-text message, ignoring:', event.data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isLoggedIn = false;
        this.stopHeartbeat(); // 停止心跳机制
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.stopHeartbeat(); // 发生错误时停止心跳
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  // 启动心跳机制
  private startHeartbeat() {
    if (this.isHeartbeatEnabled) {
      console.log('Heartbeat already enabled');
      return;
    }

    this.isHeartbeatEnabled = true;
    this.missedHeartbeats = 0;
    this.connectionStartTime = Date.now();
    this.resetHeartbeatStats();
    console.log('Starting heartbeat mechanism');

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatConfig.INTERVAL);
  }

  // 重置心跳统计
  private resetHeartbeatStats() {
    this.heartbeatStats = {
      totalSent: 0,
      totalReceived: 0,
      totalTimeouts: 0,
      averageRTT: 0,
      lastRTT: 0,
      connectionUptime: 0
    };
    this.rttHistory = [];
  }

  // 更新心跳配置
  public updateHeartbeatConfig(config: Partial<typeof HEARTBEAT_CONFIG>) {
    this.heartbeatConfig = { ...this.heartbeatConfig, ...config };
    console.log('Heartbeat config updated:', this.heartbeatConfig);
    
    // 如果心跳正在运行，重启以应用新配置
    if (this.isHeartbeatEnabled) {
      this.stopHeartbeat();
      this.startHeartbeat();
    }
  }

  // 获取心跳统计信息
  public getHeartbeatStats(): HeartbeatStats {
    if (this.connectionStartTime > 0) {
      this.heartbeatStats.connectionUptime = Date.now() - this.connectionStartTime;
    }
    return { ...this.heartbeatStats };
  }

  // 停止心跳机制
  private stopHeartbeat() {
    if (!this.isHeartbeatEnabled) {
      return;
    }

    this.isHeartbeatEnabled = false;
    console.log('Stopping heartbeat mechanism');

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // 发送心跳包
  private sendHeartbeat() {
    if (!this.isConnectionOpen()) {
      console.warn('Connection not open, skipping heartbeat');
      return;
    }

    this.lastHeartbeatTime = Date.now();
    
    const heartbeatData = {
      timestamp: this.lastHeartbeatTime,
      clientId: localStorage.getItem('playerId') || 'unknown'
    };

    console.log('Sending heartbeat:', heartbeatData);
    
    // 发送心跳包
    this.sendRawMessage(Commands.HEARTBEAT, heartbeatData);

    // 更新统计信息
    this.heartbeatStats.totalSent++;

    // 触发心跳发送事件
    if (this.heartbeatEventCallback) {
      this.heartbeatEventCallback({ type: 'sent', data: heartbeatData });
    }

    // 设置心跳超时定时器
    this.heartbeatTimeoutTimer = setTimeout(() => {
      this.handleHeartbeatTimeout();
    }, this.heartbeatConfig.TIMEOUT);
  }

  // 处理心跳响应
  private handleHeartbeatResponse(response: InetwarkResponseData) {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    if (response.code === 0) {
      this.missedHeartbeats = 0;
      const responseTime = Date.now() - this.lastHeartbeatTime;
      console.log(`Heartbeat response received, RTT: ${responseTime}ms`);
      
      // 更新统计信息
      this.heartbeatStats.totalReceived++;
      this.heartbeatStats.lastRTT = responseTime;
      this.rttHistory.push(responseTime);
      
      // 保持RTT历史记录在合理范围内（最多100个记录）
      if (this.rttHistory.length > 100) {
        this.rttHistory.shift();
      }
      
      // 计算平均RTT
      this.heartbeatStats.averageRTT = this.rttHistory.reduce((sum, rtt) => sum + rtt, 0) / this.rttHistory.length;
      
      // 触发心跳接收事件
      if (this.heartbeatEventCallback) {
        this.heartbeatEventCallback({ 
          type: 'received', 
          data: { 
            responseTime, 
            serverData: response.data 
          } 
        });
      }
    } else {
      console.warn('Heartbeat response with error:', response.message);
      this.handleHeartbeatTimeout();
    }
  }

  // 处理心跳超时
  private handleHeartbeatTimeout() {
    this.missedHeartbeats++;
    this.heartbeatStats.totalTimeouts++;
    console.warn(`Heartbeat timeout, missed: ${this.missedHeartbeats}/${this.heartbeatConfig.MAX_MISSED}`);

    // 触发心跳超时事件
    if (this.heartbeatEventCallback) {
      this.heartbeatEventCallback({ 
        type: 'timeout', 
        data: { 
          missedCount: this.missedHeartbeats,
          maxMissed: this.heartbeatConfig.MAX_MISSED
        } 
      });
    }

    if (this.missedHeartbeats >= this.heartbeatConfig.MAX_MISSED) {
      console.error('Too many missed heartbeats, reconnecting...');
      
      // 触发心跳丢失事件
      if (this.heartbeatEventCallback) {
        this.heartbeatEventCallback({ 
          type: 'missed', 
          data: { 
            missedCount: this.missedHeartbeats,
            action: 'reconnecting'
          } 
        });
      }
      
      this.handleConnectionLost();
    }
  }

  // 处理连接丢失
  private handleConnectionLost() {
    this.stopHeartbeat();
    this.isLoggedIn = false;
    
    if (this.ws) {
      this.ws.close();
    }
    
    // 触发重连
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  // 发送原始消息（不经过登录检查）
  private sendRawMessage(command: number, data: any) {
    if (!this.isConnectionOpen()) {
      console.error('WebSocket connection not open');
      return;
    }

    const message = {
      requestId: 0,
      type: 1,
      command,
      data
    };
    
    const jsonMessage = JSON.stringify(message);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(jsonMessage);
    }
  }

  // 获取连接状态信息
  public getConnectionStatus() {
    return {
      isConnected: this.isConnectionOpen(),
      isLoggedIn: this.isLoggedIn,
      isHeartbeatEnabled: this.isHeartbeatEnabled,
      missedHeartbeats: this.missedHeartbeats,
      lastHeartbeatTime: this.lastHeartbeatTime,
      reconnectAttempts: this.reconnectAttempts,
      heartbeatConfig: { ...this.heartbeatConfig },
      heartbeatStats: this.getHeartbeatStats()
    };
  }

  // 注册事件处理器
  on(command: number, handler: (event: WebSocketEvent) => void) {
    if (!this.eventHandlers.has(command)) {
      this.eventHandlers.set(command, []);
    }
    this.eventHandlers.get(command)?.push(handler);
  }

  // 移除事件处理器
  off(command: number, handler: (event: WebSocketEvent) => void) {
    const handlers = this.eventHandlers.get(command);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 添加连接状态检查
  isConnectionOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  // 等待连接建立
  private waitForConnection(timeout = 5000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.isConnectionOpen()) {
        resolve(true);
        return;
      }
      
      // 如果未连接，则等待onopen事件或超时
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      const checkInterval = setInterval(() => {
        if (this.isConnectionOpen()) {
          clearInterval(checkInterval);
          if (timeoutId) clearTimeout(timeoutId);
          resolve(true);
        }
      }, 100);
      
      timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('WebSocket connection timeout');
        resolve(false);
      }, timeout);
    });
  }

  async send(command: number, data: any, bypassLoginCheck: boolean = false) {
    try {
      console.log('📤 尝试发送消息:', {
        command,
        data,
        bypassLoginCheck,
        isConnectionOpen: this.isConnectionOpen(),
        isLoggedIn: this.isLoggedIn
      });
      
      // 等待连接建立
      if (!this.isConnectionOpen()) {
        console.log('⏳ WebSocket未连接，等待连接建立...');
        const connected = await this.waitForConnection();
        if (!connected) {
          console.error('❌ WebSocket连接建立失败');
          // 将请求添加到待处理队列
          this.pendingRequests.push({ command, data });
          return;
        }
      }

      // 检查登录状态（可以被绕过）
      if (command !== Commands.LOGIN && !this.isLoggedIn && !bypassLoginCheck) {
        console.log('🔒 未登录，将请求添加到待处理队列:', {
          command,
          data,
          queueLength: this.pendingRequests.length
        });
        this.pendingRequests.push({ command, data });
        return;
      }

      const message = {
        requestId: 0, // 不再使用 requestId 进行消息匹配
        type: 1,
        command,
        data
      };
      
      const jsonMessage = JSON.stringify(message);
      console.log('📡 发送消息到服务器:', {
        timestamp: new Date().toISOString(),
        message: jsonMessage,
        command: command,
        data: data,
        bypassedLogin: bypassLoginCheck
      });
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(jsonMessage);
      } else {
        console.error('❌ WebSocket连接未就绪，无法发送消息');
        // 将请求添加到待处理队列
        this.pendingRequests.push({ command, data });
      }
    } catch (error) {
      console.error('❌ 发送消息时出错:', error);
      // 发生错误时，将请求添加到待处理队列
      this.pendingRequests.push({ command, data });
    }
  }

  // 测试所有业务功能
  public testAllFeatures() {
    console.log('Testing all features...');
    
    // 测试获取场景Feed
    this.getSceneFeed();
    
    // 测试获取角色历史
    this.getCharacterHistory();
    
    // 测试投票功能
    this.voteThread('test_thread', true);
  }

  // 手动控制心跳机制
  public enableHeartbeat() {
    if (this.isConnectionOpen()) {
      this.startHeartbeat();
    } else {
      console.warn('Cannot enable heartbeat: WebSocket not connected');
    }
  }

  public disableHeartbeat() {
    this.stopHeartbeat();
  }

  // 手动发送心跳（用于测试）
  public sendManualHeartbeat() {
    if (this.isConnectionOpen()) {
      this.sendHeartbeat();
    } else {
      console.warn('Cannot send heartbeat: WebSocket not connected');
    }
  }

  // 监听心跳事件
  public onHeartbeatEvent(callback: (event: { type: 'sent' | 'received' | 'timeout' | 'missed', data?: any }) => void) {
    // 可以在心跳相关方法中调用这个回调
    this.heartbeatEventCallback = callback;
  }

  private heartbeatEventCallback?: (event: { type: 'sent' | 'received' | 'timeout' | 'missed', data?: any }) => void;

  disconnect() {
    console.log('Disconnecting WebSocket...');
    this.stopHeartbeat(); // 确保停止心跳机制
    this.isLoggedIn = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // 清空待处理请求
    this.pendingRequests = [];
  }

  // Business methods
  login(loginData: LoginRequestData) {
    this.send(Commands.LOGIN, loginData);
  }

  // 手动普通登录方法
  manualLogin(username: string, password: string, nickname?: string) {
    const loginData: LoginRequestData = {
      loginType: 1,
      name: username,
      password: password,
      nickName: nickname || username,
      avatar: 0,
      sex: 1,
      timeZone: 2,
      clientOs: 'web',
      userId: '',
      inviteCode: '',
      invite: '',
      address: ''
    };
    this.login(loginData);
  }

  getSceneFeed(roomId: number = 0, page: number = 0, size: number = 30, episode?: number) {
    console.log(`获取场景推文，房间ID: ${roomId}, 页码: ${page}, 每页数量: ${size}${episode ? `, EP: ${episode}` : ''}`);
    
    // 构建请求参数，如果提供了episode就包含它
    const requestData: any = { roomId, page, size };
    if (episode !== undefined) {
      requestData.epId = `EP${episode}`; // 修改为epId格式
    }
    
    // 构建完整的请求消息
    const message = {
      requestId: Date.now(), // 使用当前时间戳作为requestId
      type: 1,
      command: Commands.GET_SCENE_FEED,
      data: requestData
    };
    
    const jsonMessage = JSON.stringify(message);
    console.log('📡 发送获取场景推文请求:', jsonMessage);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(jsonMessage);
    } else {
      console.error('❌ WebSocket连接未就绪，无法发送获取场景推文请求');
      this.pendingRequests.push({ command: Commands.GET_SCENE_FEED, data: requestData });
    }
  }

  operateTweet(tweetId: number, type: number, content: string, replyId: number, chooseIndex: number, rateList?: number[]) {
    // 获取用户信息
    const storedUserInfo = localStorage.getItem('userInfo');
    const userInfo = storedUserInfo ? JSON.parse(storedUserInfo) : null;
    const playerId = localStorage.getItem('playerId') || '';
    
    const requestData: OperateTweetRequest = {
      tweetId,
      type,
      content,
      replyId,
      chooseIndex,
      nickName: userInfo?.userId || '',
      userNo: userInfo?.id || '',
      commentId: 0, // 新增：评论ID，新评论时为0
      rateList: rateList || []  // 使用传入的rateList或默认空数组
    };

    // 构建完整的请求消息，包含playerId
    const message = {
      requestId: 0,
      playerId: playerId, // 新增：玩家ID
      type: 1,
      command: Commands.OPERATE_TWEET,
      data: requestData
    };
    
    const jsonMessage = JSON.stringify(message);
    console.log('Sending OPERATE_TWEET message:', {
      timestamp: new Date().toISOString(),
      message: jsonMessage,
      command: Commands.OPERATE_TWEET,
      data: requestData
    });
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(jsonMessage);
    } else {
      console.error('WebSocket连接未就绪，无法发送推文操作请求');
      this.pendingRequests.push({ command: Commands.OPERATE_TWEET, data: requestData });
    }
  }

  voteThread(threadId: string, isUpvote: boolean) {
    this.send(Commands.VOTE_THREAD, {
      postId: threadId,
      vote: isUpvote ? 1 : -1
    });
  }

  // 新增：专门用于投票历史的投票方法
  voteOnHistory(roomId: number, requestId?: number, option?: string, voteValue?: number, content?: string) {
    const voteData: any = {
      roomId: roomId
    };
    
    // 如果提供了详细参数，则添加到请求中
    if (requestId !== undefined) voteData.requestId = requestId;
    if (option !== undefined) voteData.option = option;
    if (voteValue !== undefined) voteData.voteValue = voteValue;
    if (content !== undefined) voteData.content = content;
    
    console.log('🗳️ Sending vote history request:', voteData);
    this.send(Commands.VOTE_THREAD, voteData);
  }

  // 获取投票历史（支持指定房间ID）
  getVoteHistory(roomId: number) {
    console.log('🗳️ Requesting vote history for roomId:', roomId);
    this.send(Commands.VOTE_THREAD, {
      roomId: roomId
    });
  }

  getCharacterHistory(pageSize: number = 10, pageNum: number = 1) {
    this.send(Commands.GET_CHARACTER_HISTORY, {
      pageSize,
      pageNum
    });
  }

  public subscribe(handler: (message: any) => void) {
    this.on(Commands.GET_SCENE_FEED, (event: WebSocketEvent) => {
      if (event.command === Commands.GET_SCENE_FEED) {
        handler(event.data);
      }
    });
  }

  public unsubscribe(handler: (message: any) => void) {
    this.off(Commands.GET_SCENE_FEED, (event: WebSocketEvent) => {
      if (event.command === Commands.GET_SCENE_FEED) {
        handler(event.data);
      }
    });
  }

  // 处理 Google 登录
  googleLogin(googleUser: any) {
    const loginData: LoginRequestData = {
      loginType: 2, // Google 登录类型
      name: googleUser.getBasicProfile().getEmail(),
      password: '', // Google 登录不需要密码
      nickName: googleUser.getBasicProfile().getName(),
      avatar: 0, // 默认头像
      sex: 1, // 默认性别
      timeZone: 2, // 默认时区
      clientOs: "web",
      userId: googleUser.getBasicProfile().getId(),
      inviteCode: '',
      invite: '',
      address: ''
    };

    this.login(loginData);
  }

  private processLoginResponse(response: InetwarkResponseData) {
    if (response.code === 0) {
      console.log('✅ Login successful, processing pending requests...');
      this.isLoggedIn = true;
      const loginData = response.data as any; // 使用any类型以访问可能存在的address字段
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('playerId', loginData.player.playerId);
      
      // 触发用户登录事件
      window.dispatchEvent(new CustomEvent('user-logged-in'));
      
      // 更新用户信息中的地址
      // 根据实际响应，address可能在data顶层
      if (loginData.address) {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          try {
            const userInfo = JSON.parse(storedUserInfo);
            userInfo.location = loginData.address;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            console.log('📍 已更新用户登录地址:', loginData.address);
          } catch (error) {
            console.error('❌ 更新用户地址信息失败:', error);
          }
        }
      }
      
      // 处理待发送的请求
      const pendingCount = this.pendingRequests.length;
      if (pendingCount > 0) {
        console.log(`🔄 Login successful, retrying ${pendingCount} pending requests...`);
      }
      this.processPendingRequests();
    } else {
      console.error('❌ Login failed:', response.message);
    }
  }

  private processPendingRequests() {
    if (!this.isLoggedIn) return;
    
    console.log('🔄 Processing pending requests, queue length:', this.pendingRequests.length);

    while (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift();
      if (request) {
        console.log('📤 Retrying failed request:', request.command);
        this.send(request.command, request.data);
      }
    }
  }

  // 在重连后重试失败的请求，即使没有登录
  private retryFailedRequestsAfterReconnect() {
    if (this.pendingRequests.length === 0) {
      console.log('🔄 No failed requests to retry after reconnect');
      return;
    }

    console.log('🔄 Retrying failed requests after reconnect, queue length:', this.pendingRequests.length);

    // 创建一个副本来避免在迭代时修改原数组
    const requestsToRetry = [...this.pendingRequests];
    this.pendingRequests = []; // 清空原队列

    // 定义不需要登录就可以重试的请求类型
    const nonLoginRequiredCommands = [
      Commands.HEARTBEAT,
      // 可以根据需要添加其他不需要登录的命令
    ];

    requestsToRetry.forEach((request, index) => {
      // 对于不需要登录的请求，立即重试
      if (nonLoginRequiredCommands.includes(request.command)) {
        console.log(`📤 Retrying non-login request: ${request.command} (${index + 1}/${requestsToRetry.length})`);
        this.send(request.command, request.data, true); // 绕过登录检查
      } else {
        // 对于需要登录的请求，重新加入队列等待登录成功后处理
        console.log(`⏳ Re-queuing request that requires login: ${request.command}`);
        this.pendingRequests.push(request);
      }
    });

    console.log('🔄 Completed reconnect retry, remaining queue length:', this.pendingRequests.length);
  }

  // 添加获取EP列表的方法
  getEpList() {
    console.log('📤 Requesting EP list...');
    return this.send(Commands.GET_EP_LIST, {});
  }

  // 获取用户积分
  getUserPoints() {
    console.log('💰 Requesting user points...');
    return this.send(Commands.GET_USER_POINTS, {});
  }
}

export const websocketService = new WebSocketService(); 

/*
使用示例：

// 1. 监听心跳事件
websocketService.onHeartbeatEvent((event) => {
  switch (event.type) {
    case 'sent':
      console.log('心跳已发送:', event.data);
      break;
    case 'received':
      console.log('心跳响应已接收, RTT:', event.data.responseTime + 'ms');
      break;
    case 'timeout':
      console.warn('心跳超时:', event.data);
      break;
    case 'missed':
      console.error('心跳丢失，正在重连:', event.data);
      break;
  }
});

// 2. 获取连接状态
const status = websocketService.getConnectionStatus();
console.log('连接状态:', status);

// 3. 获取心跳统计
const stats = websocketService.getHeartbeatStats();
console.log('心跳统计:', stats);

// 4. 自定义心跳配置
websocketService.updateHeartbeatConfig({
  INTERVAL: 20000,  // 20秒发送一次心跳
  TIMEOUT: 8000,    // 8秒超时
  MAX_MISSED: 2     // 最多丢失2次心跳就重连
});

// 5. 手动控制心跳
websocketService.disableHeartbeat();  // 禁用心跳
websocketService.enableHeartbeat();   // 启用心跳
websocketService.sendManualHeartbeat(); // 手动发送心跳

心跳机制特性：
- 自动心跳：连接建立后自动开始心跳
- 超时检测：检测心跳响应超时
- 重连机制：多次心跳丢失后自动重连
- 统计信息：记录心跳发送/接收次数、RTT等
- 事件通知：心跳状态变化时触发事件
- 可配置：支持自定义心跳间隔、超时时间等
- 连接状态：提供详细的连接和心跳状态信息
*/ 