import React from 'react';
import { Bus } from 'lucide-react';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gold/20 rounded-full absolute animate-ping"></div>
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center relative">
            <Bus className="w-8 h-8 text-gold animate-bounce" />
          </div>
        </div>
        <p className="text-gold mt-4 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
};