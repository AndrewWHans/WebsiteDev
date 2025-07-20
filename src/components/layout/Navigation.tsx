import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UserCircle,
  ChevronDown,
  Wallet,
  LayoutDashboard,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  user: any;
  userRole: string | null;
  onSignIn: () => void;
  onShowProfile: () => void;
  onShowWallet: () => void;
  onSignOut: () => void;
  onShowMobileMenu: () => void;
  showMobileMenu: boolean;
}

export function Navigation({ 
  user, 
  userRole, 
  onSignIn, 
  onShowProfile, 
  onShowWallet, 
  onSignOut,
  onShowMobileMenu,
  showMobileMenu 
}: NavigationProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Function to handle navigation with scroll to top
  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <nav className="bg-black border-b border-gold/30 py-4 sticky top-0 z-40 transition-shadow duration-300 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-2xl font-extrabold tracking-tighter text-gold">ULimo</span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            to="/" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>Home</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/private-ride" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/private-ride');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>Private Ride</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/shuttles" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/shuttles');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>Shuttles</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/tickets" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/tickets');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>My Tickets</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/refer" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/refer');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>Refer & Earn</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/deals" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/deals');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>Deals</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            to="/about" 
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/about');
            }}
            className="text-gray-300 hover:text-gold transition-colors duration-300 font-medium relative group"
          >
            <span>About</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          {user ? (
            <div className="relative" ref={accountMenuRef}>
              <button 
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center space-x-2 bg-gold/90 text-black font-bold py-2 px-4 rounded-full hover:bg-gold transition-all duration-300 shadow-md hover:shadow-gold/30"
              >
                <UserCircle size={20} />
                <span>Account</span>
                <ChevronDown size={16} className={`transform transition-transform duration-300 ${showAccountMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl border border-gold/30 shadow-lg overflow-hidden z-50 animate-fadeIn">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onShowProfile();
                        setShowAccountMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-gold transition-all duration-200"
                    >
                      <UserCircle size={16} />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        onShowWallet();
                        setShowAccountMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-gold transition-all duration-200"
                    >
                      <Wallet size={16} />
                      <span>Wallet</span>
                    </button>
                    {userRole === 'Admin' && (
                      <>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                          onClick={() => {
                            handleNavigation('/admin-dashboard');
                            setShowAccountMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-gold transition-all duration-200"
                        >
                          <LayoutDashboard size={16} />
                          <span>Admin Dashboard</span>
                        </button>
                      </>
                    )}
                    {userRole === 'Promoter' && (
                      <>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                          onClick={() => {
                            handleNavigation('/promoter-dashboard');
                            setShowAccountMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-gold transition-all duration-200"
                        >
                          <LayoutDashboard size={16} />
                          <span>Promoter Dashboard</span>
                        </button>
                      </>
                    )}
                    {userRole === 'Error' && (
                      <>
                        <div className="border-t border-gray-700 my-1"></div>
                        <div className="px-4 py-2 text-red-400 text-sm">
                          Role Error - Contact Support
                        </div>
                      </>
                    )}
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        onSignOut();
                        setShowAccountMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-red-400 transition-all duration-200"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onSignIn}
              className="bg-gold/90 text-black font-bold py-2 px-6 rounded-full hover:bg-gold transition-all duration-300 shadow-md hover:shadow-gold/30"
            >
              Sign In
            </button>
          )}
        </div>
        <div className="md:hidden">
          <button 
            className="text-gold p-1"
            onClick={onShowMobileMenu}
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
} 