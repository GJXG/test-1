import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI;
}

interface DragonBonesAnimationProps {
  className?: string;
  skePath: string;
  texJsonPath: string;
  texPngPath: string;
  animationName?: string;
  scale?: number;
}

const DragonBonesAnimation: React.FC<DragonBonesAnimationProps> = ({ 
  className, 
  skePath, 
  texJsonPath, 
  texPngPath,
  animationName,
  scale = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const armatureDisplayRef = useRef<any>(null);

  useEffect(() => {
    let destroyed = false;

    import('pixi5-dragonbones').then((dragonBonesModule) => {
      if (!containerRef.current || destroyed) return;

      // 兼容 window.dragonBones 和 ESM/CJS 导入
      const dragonBones = (window as any).dragonBones || dragonBonesModule.default || dragonBonesModule;
      const factory = dragonBones.PixiFactory.factory;

      // Create PIXI Application
      const app = new PIXI.Application({
        width: 300,
        height: 300,
        transparent: true,
      });
      appRef.current = app;
      containerRef.current.appendChild(app.view);

      // Load DragonBones resources
      const loader = new PIXI.Loader();
      
      // 清理之前的资源
      if (PIXI.utils.TextureCache[texPngPath]) {
        PIXI.utils.TextureCache[texPngPath].destroy(true);
        delete PIXI.utils.TextureCache[texPngPath];
      }
      
      loader
        .add('ske', skePath)
        .add('texJson', texJsonPath)
        .add('texPng', texPngPath)
        .load((loader, resources) => {
          // 检查资源是否加载成功
          if (!resources.ske.data || !resources.texJson.data || !resources.texPng.texture) {
            console.error('DragonBones 资源加载失败', {
              ske: resources.ske,
              texJson: resources.texJson,
              texPng: resources.texPng
            });
            return;
          }

          try {
            // Parse DragonBones data
            factory.parseDragonBonesData(resources.ske.data);
            factory.parseTextureAtlasData(
              resources.texJson.data,
              resources.texPng.texture
            );

            // 自动获取第一个骨架名
            const armatureData = resources.ske.data.armature;
            const armatureName = armatureData && armatureData.length > 0 ? armatureData[0].name : 'Armature';
            console.log('DragonBones name:', resources.ske.data.name);
            console.log('Armature name:', armatureName);
            
            const armatureDisplay = factory.buildArmatureDisplay(armatureName);
            
            if (armatureDisplay) {
              armatureDisplayRef.current = armatureDisplay;
              armatureDisplay.x = app.renderer.width / 2;
              armatureDisplay.y = app.renderer.height / 2;
              armatureDisplay.scale.set(scale);

              // 获取可用的动画列表
              const animationList = armatureData && armatureData.length > 0 && armatureData[0].animation;
              const availableAnimations = animationList ? animationList.map((anim: any) => anim.name) : [];
              console.log('Available animations:', availableAnimations);
              
              // 使用指定的动画名或默认动画
              const targetAnimation = animationName && availableAnimations.includes(animationName) 
                ? animationName 
                : (armatureData[0].defaultActions?.[0]?.gotoAndPlay || availableAnimations[0] || 'idle');

              console.log('Playing animation:', targetAnimation);
              // Add to stage and play animation
              app.stage.addChild(armatureDisplay);
              armatureDisplay.animation.play(targetAnimation);
            }
          } catch (error) {
            console.error('DragonBones 动画加载错误:', error);
          }
        });
    });

    // Cleanup
    return () => {
      destroyed = true;
      if (armatureDisplayRef.current) {
        armatureDisplayRef.current.destroy();
      }
      if (appRef.current) {
        appRef.current.destroy(true);
      }
      // 清理纹理缓存
      if (PIXI.utils.TextureCache[texPngPath]) {
        PIXI.utils.TextureCache[texPngPath].destroy(true);
        delete PIXI.utils.TextureCache[texPngPath];
      }
    };
  }, [skePath, texJsonPath, texPngPath, animationName, scale]);

  return <div ref={containerRef} className={className} />;
};

export default DragonBonesAnimation; 