import React from 'react';
import { useNavigate } from 'react-router-dom';
import DragonBonesAnimation from '../components/DragonBonesAnimation';

const Mobile: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white relative">
      {/* Header Section */}
      <header className="relative w-full h-[300px] overflow-hidden">
        <img
          src="/images/header-bg.png"
          alt="DraMai Header"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute top-6 right-6">
          <img
            src="/icons/live.png"
            alt="Live"
            className="h-6 w-auto animate-pulse"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </header>

      {/* Logo and Beta at bottom of header */}
      <div className="absolute top-[210px] left-[55%] -translate-x-1/2 -translate-y-1/2 flex items-center z-20">
        <img 
          src="/logo.png" 
          alt="DraMai Logo" 
          className="h-20 w-auto object-contain"
          onClick={() => navigate('/home')}
        />
        <span className="text-sm text-gray-400 font-medium ml-1">.BETA</span>
      </div>

      {/* App Icon and Social Media Icons */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <img
            src="/icons/app.png"
            alt="App Icon"
            className="w-24 h-24 object-contain rounded-2xl shadow-lg"
          />
          <span className="text-gray-400 text-sm mt-2">coming soon...</span>
        </div>
        <div className="w-24 h-[1px] bg-gray-300 my-4"></div>
        <div className="flex gap-4">
          <img src="/icons/discord.svg" alt="Discord" className="w-6 h-6" />
          <img src="/icons/instagram.svg" alt="Instagram" className="w-6 h-6" />
          <img src="/icons/twitter.svg" alt="Twitter" className="w-6 h-6" />
          <img src="/icons/tiktok.svg" alt="TikTok" className="w-6 h-6" />
          <img src="/icons/reddit.svg" alt="Reddit" className="w-6 h-6" />
        </div>
      </div>

      {/* Animations */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <DragonBonesAnimation
          className="w-[100px] h-[120px] -mt-13"
          skePath="/animations/pickflower/pickflower_ske.json"
          texJsonPath="/animations/pickflower/pickflower_tex.json"
          texPngPath="/animations/pickflower/pickflower_tex.png"
          animationName="pickflower"
        />
        <DragonBonesAnimation
          className="w-[600px] h-[1100px]"
          skePath="/animations/painting/painting_ske.json"
          texJsonPath="/animations/painting/painting_tex.json"
          texPngPath="/animations/painting/painting_tex.png"
          animationName="paint"
        />
      </div>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="space-y-4">
          {/* Content will be added here */}
        </div>
      </main>

      {/* Title at bottom left */}
      <div className="fixed bottom-12 left-6 z-10">
        <img
          src="/images/title.png"
          alt="Live Stream AI Story"
          className="h-[100px] w-auto"
        />
      </div>

      {/* Legal Links and Copyright */}
      <div className="fixed bottom-2 right-6 z-10 flex flex-col items-end gap-0 text-[15px]">
        <div className="flex items-center justify-center gap-6">
          <a
            href="/privacy-policy"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/terms-of-service"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Terms of Service
          </a>
        </div>
        <div className="text-gray-400 mt-[-5px]">
          Copyright © 2025 Cuboid.AI, Inc. All rights reserved
        </div>
      </div>
    </div>
  );
};

export default Mobile; 