import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Bus,
  Tag,
  Ticket,
  UserCircle,
  Users
} from 'lucide-react';

interface MobileNavigationProps {
  user: any;
  onSignIn: () => void;
  onShowMenu: () => void;
  currentPath?: string;
}

export function MobileNavigation({
  user,
  onSignIn,
  onShowMenu,
  currentPath = ''
}: MobileNavigationProps) {
  const navigate = useNavigate();

  // Enhanced navigation function that scrolls to top
  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gold/30 z-30 shadow-lg">
      <div className="flex justify-around items-center h-16">
        <button 
          onClick={() => handleNavigation("/")}
          className={`flex flex-col items-center justify-center w-1/5 h-full ${
            currentPath === '/' ? 'text-gold' : 'text-gray-400 hover:text-gold'
          }`}
        >
          <Home size={20} />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button 
          onClick={() => handleNavigation("/shuttles")}
          className={`flex flex-col items-center justify-center w-1/5 h-full ${
            currentPath.includes('/shuttles') ? 'text-gold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Bus size={20} />
          <span className="text-xs mt-1">Shuttles</span>
        </button>
        <button
          onClick={() => handleNavigation("/refer")}
          className={`flex flex-col items-center justify-center w-1/5 h-full ${
            currentPath === '/refer' ? 'text-gold' : 'text-gray-400 hover:text-gold'
          }`}
        >
          <Users size={20} />
          <span className="text-xs mt-1">Refer</span>
        </button>
        {user ? (
          <button 
            onClick={() => handleNavigation("/tickets")}
            className={`flex flex-col items-center justify-center w-1/5 h-full ${
              currentPath === '/tickets' ? 'text-gold' : 'text-gray-400 hover:text-gold'
            }`}
          >
            <Ticket size={20} />
            <span className="text-xs mt-1">Tickets</span>
          </button>
        ) : (
          <button 
            onClick={() => handleNavigation("/deals")}
            className={`flex flex-col items-center justify-center w-1/5 h-full ${
              currentPath === '/deals' ? 'text-gold' : 'text-gray-400 hover:text-gold'
            }`}
          >
            <Tag size={20} />
            <span className="text-xs mt-1">Deals</span>
          </button>
        )}
        {user ? (
          <button 
            onClick={onShowMenu}
            className="flex flex-col items-center justify-center w-1/5 h-full text-gray-400 hover:text-gold"
          >
            <UserCircle size={20} />
            <span className="text-xs mt-1">Account</span>
          </button>
        ) : (
          <button 
            onClick={onSignIn}
            className="flex flex-col items-center justify-center w-1/5 h-full text-gray-400 hover:text-gold"
          >
            <UserCircle size={20} />
            <span className="text-xs mt-1">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}