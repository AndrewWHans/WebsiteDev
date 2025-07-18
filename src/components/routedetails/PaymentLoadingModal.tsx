import React, { useEffect, useState } from 'react';
import { Bus, Users, Sparkles } from 'lucide-react';

interface PaymentLoadingModalProps {
  isOpen: boolean;
  progressPercentage: number;
  minThreshold: number;
  ticketsSold: number;
  quantity: number;
}

export const PaymentLoadingModal = ({
  isOpen,
  progressPercentage,
  minThreshold,
  ticketsSold,
  quantity
}: PaymentLoadingModalProps) => {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showProjection, setShowProjection] = useState(false);
  const [projectedProgress, setProjectedProgress] = useState(0);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [displayedTicketCount, setDisplayedTicketCount] = useState(0);

  useEffect(() => {
    let animationId: number | null = null;
    
    if (isOpen) {
      // Reset states when modal opens
      setCurrentProgress(0);
      setProjectedProgress(0);
      setCurrentPercentage(0);
      setDisplayedTicketCount(0);
      setShowProjection(false);
      
      // Calculate the current percentage (tickets already sold)
      const currentPercentValue = Math.max(0, Math.min(100, (ticketsSold / minThreshold) * 100));
      
      // Calculate the projected percentage (after user's purchase with correct quantity)
      const projectedPercentValue = Math.max(0, Math.min(100, ((ticketsSold + (quantity || 1)) / minThreshold) * 100));
      
      // Skip the first animation and immediately show the projected progress
      const animationDuration = 1500; // Longer animation for more impact
      const animationStart = performance.now();
      
      // Set showProjection immediately
      setShowProjection(true);
      
      const animateProjection = (timestamp: number) => {
        const elapsed = timestamp - animationStart;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Ease out cubic function for smoother animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Animate directly from 0 to projected percentage
        const incrementValue = projectedPercentValue * easeOut;
        
        // Update both current and projected progress
        setCurrentProgress(incrementValue);
        setCurrentPercentage(Math.round(incrementValue));
        setProjectedProgress(incrementValue);
        
        // Animate the ticket count from current to projected
        const ticketCountValue = ticketsSold + ((quantity ?? 1) * easeOut);
        setDisplayedTicketCount(Math.round(ticketCountValue));
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animateProjection);
        }
      };
      
      animationId = requestAnimationFrame(animateProjection);
    }
    
    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isOpen, minThreshold, ticketsSold, quantity ?? 1]);

  // Don't render if not open - moved after hooks
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-gray-900/50 backdrop-blur rounded-xl border border-gold/30 p-8 relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gold/10 blur-3xl animate-pulse-slow"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-gold/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Bus animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gold/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <Bus className="w-12 h-12 text-gold animate-bounce" />
              </div>
            </div>
          </div>
          
          {/* Progress visualization */}
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gold mr-2" />
                <span className="text-white font-medium">Riders Joined</span>
              </div>
              <div className="flex items-center">
                <Sparkles className="w-4 h-4 text-gold mr-1" />
                <span className="text-gold font-bold">{Math.round(currentProgress)}%</span>
              </div>
            </div>
            
            {/* Progress bar - simplified to show only the projected value */}
            <div className="relative h-4 bg-gray-700/50 rounded-full overflow-hidden mb-3">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-gold/20 to-gold/5 animate-pulse-slow"
                style={{ animationDuration: '3s' }}
              ></div>
              <div className="relative h-full">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${currentProgress}%` }}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpIi8+PC9zdmc+')] animate-slide"></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between text-sm mt-4">
              <span className="text-gray-400">
                <span className="text-emerald-400 font-medium">{displayedTicketCount}</span> of {minThreshold} needed
              </span>
              <span className="text-emerald-400">after you book!</span>
            </div>
          </div>
          
          {/* Status message */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-400 text-sm bg-gray-800/30 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>Hang tight — taking you to the checkout...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};