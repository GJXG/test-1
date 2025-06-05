# Header折叠功能实现

## 功能概述
在Header组件的最右端添加了一个折叠按钮，用户点击后可以让header向上折叠，节省屏幕空间。

## 实现细节

### 1. 组件修改

#### Header.tsx
- 添加了 `isCollapsed` 和 `onToggleCollapse` props
- 支持内部状态管理（当未传入外部控制时）
- 添加了折叠按钮UI和交互逻辑
- 实现了平滑的动画过渡效果

#### Scene.tsx
- 添加了 `isHeaderCollapsed` 状态
- 通过props将状态传递给Header组件

### 2. 功能特性

#### 🎯 折叠效果
- **完全折叠时**：Header高度变为 32px (h-8) - 超级极小化设计
- **展开状态**：Header保持原有高度
- **动画过渡**：300ms 的平滑动画效果

#### 🎨 视觉设计
- **折叠按钮**：位于Header最右端
- **图标状态**：
  - 展开时显示向上箭头 (ChevronUp, 24x24px)
  - 折叠时显示向下箭头 (ChevronDown, 12x12px)
- **按钮尺寸**：
  - 展开时：48x48px
  - 折叠时：24x24px (超级极小化)
- **Live Now图标**：
  - 展开时：正常尺寸显示
  - 折叠时：完全隐藏
- **样式调整**：
  - 背景：半透明灰色背景
  - 悬停效果：颜色加深
  - 阴影效果：subtle shadow

#### 📱 响应式行为
- **Home页面**：折叠时隐藏整个动画背景区域
- **Scene页面**：主要影响tag标签区域
- **Live Now图标**：折叠时完全消失
- **Tag标签**：折叠时完全隐藏
- **间距优化**：折叠时移除所有内边距 (py-0)，最大化空间利用

### 3. 使用方式

```jsx
// 基础使用（内部状态管理）
<Header 
  onTagSelect={handleTagSelect}
  selectedTag={selectedTag}
/>

// 外部状态控制
<Header 
  onTagSelect={handleTagSelect}
  selectedTag={selectedTag}
  isCollapsed={isCollapsed}
  onToggleCollapse={setIsCollapsed}
/>
```

### 4. 技术实现

#### CSS类名动态切换
```jsx
className={cn(
  "bg-background border-b transition-all duration-300 ease-in-out relative overflow-hidden",
  collapsed ? "h-16" : "h-auto",
  className
)}
```

#### 元素显示/隐藏控制
```jsx
// Tags区域
<div className={cn(
  "flex gap-6 transition-all duration-300 ease-in-out",
  collapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
)}>

// Home页面背景
{location.pathname === '/home' && !collapsed && (
  // 背景内容
)}
```

### 5. 用户体验优化

- ✅ **平滑动画**：使用 CSS transition 实现
- ✅ **可访问性**：添加了 title 属性提示
- ✅ **状态持久化**：可通过外部状态管理实现
- ✅ **视觉反馈**：按钮悬停和图标状态变化
- ✅ **响应式设计**：适配不同页面布局

## 后续改进建议

1. **记忆功能**：将折叠状态保存到 localStorage
2. **键盘快捷键**：添加快捷键支持（如 Ctrl+H）
3. **动画增强**：添加更复杂的动画效果
4. **移动端优化**：针对移动设备调整交互方式 