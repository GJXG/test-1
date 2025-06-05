# Cocos Iframe 优化方案

## 问题描述
之前的架构导致了双iframe问题：
1. App.tsx中用CocosEmbed包装整个应用
2. Scene.tsx中又使用了CocosEmbed
3. 两个实例都在试图控制同一个GlobalIframe的位置
4. 导致iframe在不同位置跳跃，视觉上看起来像有两个iframe

## 优化方案

### 1. 架构重构
- **分离关注点**：将Context Provider和iframe定位逻辑分离
- **单一职责**：CocosProvider只负责提供上下文，CocosEmbed只负责iframe定位

### 2. 组件拆分
```typescript
// 新架构：
CocosProvider        // 只提供全局上下文，不参与iframe定位
├── GlobalIframe     // 全局唯一iframe实例
└── CocosEmbed       // 容器组件，负责iframe定位到具体位置
```

### 3. 修改内容

#### App.tsx
- 移除了`<CocosEmbed>`包装器
- 使用`<CocosProvider>`提供全局上下文
- 保留`<GlobalIframe>`作为全局唯一iframe

#### CocosEmbed.tsx
- 导出了`CocosContext`和新的`CocosProvider`
- `CocosProvider`只处理消息通信和状态管理
- `CocosEmbed`组件专注于iframe定位逻辑

### 4. 优化效果
- ✅ 消除双iframe视觉效果
- ✅ 清晰的架构分层
- ✅ 保持所有现有功能
- ✅ 减少iframe位置竞争

### 5. 使用方式
```jsx
// App级别 - 提供全局上下文
<CocosProvider>
  <App />
</CocosProvider>
<GlobalIframe />

// 页面级别 - 定位iframe到具体容器
<CocosEmbed sceneId={gameSceneId} className="w-full h-full" />
```

## 技术细节
- GlobalIframe始终存在但可以隐藏
- CocosEmbed通过positionIframeToContainer()动态定位iframe
- 状态管理通过React Context在全局共享
- 消息通信通过单一iframe实例处理

## 后续优化建议
1. 考虑使用状态机管理iframe状态
2. 添加iframe加载错误处理
3. 优化iframe重定位的性能
4. 添加更多的调试工具 