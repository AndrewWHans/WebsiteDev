import React, { useState } from 'react';
import {
  Instagram,
  ExternalLink,
} from 'lucide-react';

export function Footer() {
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  
  return (
    <footer className="bg-black border-t border-gold/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <span className="text-xl font-bold text-gold">ULimo</span>
            </div>
            <p className="text-gray-400 mb-4">
              The ultimate party bus experience for college students
            </p>
            <div className="relative">
              <button 
                onClick={() => setShowInstagramOptions(!showInstagramOptions)}
                className="group flex items-center space-x-2 text-gray-400 hover:text-gold transition-colors duration-300"
                aria-label="Instagram accounts"
              >
                <Instagram 
                  size={22} 
                  className={`transition-transform duration-300 ${showInstagramOptions ? 'text-gold rotate-12' : ''}`} 
                />
                <span className="text-sm font-medium">Follow Us</span>
              </button>
              
              {showInstagramOptions && (
                <div className="absolute bottom-full right-0 mb-3 bg-gradient-to-br from-gray-900 to-black border border-gold/20 rounded-lg shadow-xl p-3 z-10 w-64 animate-fadeIn">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 pl-2">Our Instagram Accounts</div>
                  
                  <a 
                    href="https://instagram.com/ulimoinc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-3 text-gray-300 hover:text-gold hover:bg-gray-800/50 rounded-md transition-all duration-200 mb-1 group"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center mr-3">
                        <Instagram size={16} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium">@ulimoinc</div>
                        <div className="text-xs text-gray-500">Main Account</div>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-gray-500 group-hover:text-gold transition-colors" />
                  </a>
                  
                  <a 
                    href="https://instagram.com/universitylimo" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-3 text-gray-300 hover:text-gold hover:bg-gray-800/50 rounded-md transition-all duration-200 group"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center mr-3">
                        <Instagram size={16} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium">@universitylimo</div>
                        <div className="text-xs text-gray-500">University Events</div>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-gray-500 group-hover:text-gold transition-colors" />
                  </a>
                </div>
              )}
            </div>
          </div>
          {/* Add additional footer columns here */}
        </div>
      </div>
    </footer>
  );
} 