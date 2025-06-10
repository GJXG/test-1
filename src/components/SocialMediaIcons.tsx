import React from 'react';
import { cn } from '@/lib/utils';

interface SocialMediaIconsProps {
  className?: string;
}

const SocialMediaIcons: React.FC<SocialMediaIconsProps> = ({ className }) => {
  const socialLinks = [
    { name: 'Discord', icon: '/icons/discord.svg', url: 'https://discord.gg/dramai' },
    { name: 'Instagram', icon: '/icons/instagram.svg', url: 'https://instagram.com/dramai' },
    { name: 'Twitter', icon: '/icons/twitter.svg', url: 'https://twitter.com/dramai' },
    { name: 'TikTok', icon: '/icons/tiktok.svg', url: 'https://tiktok.com/@dramai' },
    { name: 'Reddit', icon: '/icons/reddit.svg', url: 'https://reddit.com/r/dramai' },
  ];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center justify-center gap-4">
        {socialLinks.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors mt-3"
            title={social.name}
          >
            <img
              src={social.icon}
              alt={`${social.name} icon`}
              className="w-5 h-5"
            />
          </a>
        ))}
      </div>
      
      {/* Legal Links */}
      <div className="flex flex-col items-center justify-center gap-[-100px] mt-0 mb-[-13px] text-[15px]">
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

export default SocialMediaIcons; 