import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Lock, ChevronRight, Users } from 'lucide-react';

interface HeroSectionProps {
  user: any;
  onSignIn: () => void;
}

export function HeroSection({ user, onSignIn }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black z-10"></div>
        <video 
          src="https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/video/LimoHeader.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-50"
        ></video>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-gold leading-tight flex justify-center">
            <img 
              src="https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/picture/Original_ULimo_logo.png" 
              alt="ULimo Logo"
              className="h-32 md:h-48 object-contain"
            />
          </h1>
          <p className="text-lg md:text-2xl mb-8 text-gray-300">
            Welcome to the Future of Nightlife
          </p>
          {!user && (
            <button 
              onClick={onSignIn}
              className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full text-lg transition-colors"
            >
              Sign Up Now
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Private Ride Card */}
          <div className="bg-gradient-to-br from-gold/10 to-gray-900 p-6 rounded-xl border border-gold hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all order-1 md:order-1">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gold text-black rounded-full p-2">
                <svg 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                </svg>
              </div>
              <span className="bg-gold/90 text-black text-xs font-bold px-3 py-1 rounded-full">
                AVAILABLE
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2">Private Ride</h3>
            <p className="text-gray-400 mb-6">
              Charter the entire bus for your group. Perfect for special events.
            </p>
            <button 
              className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
              onClick={() => navigate('/private-ride')}
            >
              Book Now <ChevronRight size={16} className="ml-1" />
            </button>
          </div>

          {/* Direct Route Card */}
          <div className="bg-gradient-to-br from-gold/10 to-gray-900 p-6 rounded-xl border border-gold hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all order-2 md:order-2">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gold text-black rounded-full p-3">
                <Bus size={24} />
              </div>
              <span className="bg-gold/90 text-black text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Direct Shuttle</h3>
            <p className="text-gray-300 mb-6">
              Scheduled routes to popular destinations. Book your seat now!
            </p>
            <button 
              className="w-full bg-gold text-black font-bold py-3 rounded-lg flex items-center justify-center hover:bg-yellow-400 transition-colors"
              onClick={() => navigate('/shuttles')}
            >
              Book Now <ChevronRight size={16} className="ml-1" />
            </button>
          </div>

          {/* Ride Share Card */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900 p-6 rounded-xl border border-gray-700 opacity-80 order-3">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gray-700 text-white rounded-full p-3">
                <Users size={24} />
              </div>
              <span className="bg-gray-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">COMING SOON</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Ride Share</h3>
            <p className="text-gray-400 mb-6">
              Share the ride with others heading to the same destination.
            </p>
            <button className="w-full bg-gray-700 text-gray-300 font-bold py-3 rounded-lg flex items-center justify-center cursor-not-allowed">
              <Lock size={16} className="mr-2" /> Coming Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}