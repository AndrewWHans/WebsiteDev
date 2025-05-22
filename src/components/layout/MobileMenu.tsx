import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X,
  UserCircle,
  Wallet,
  LogOut,
  Home,
  Bus,
  Tag,
  Ticket,
  Users,
  Info,
  MessageSquare,
  Crown
} from 'lucide-react';

interface MobileMenuProps {
  user: any;
  userRole: string | null;
  onClose: () => void;
  onSignIn: () => void;
  onShowProfile: () => void;
  onShowWallet: () => void;
  onSignOut: () => void;
}

export function MobileMenu({
  user,
  userRole,
  onClose,
  onSignIn,
  onShowProfile,
  onShowWallet,
  onSignOut
}: MobileMenuProps) {
  const navigate = useNavigate();
  
  // Enhanced navigation function that scrolls to top
  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
    window.scrollTo(0, 0);
  };
  
  return (
    <div className="fixed inset-0 bg-black/95 z-40 md:hidden overflow-y-auto">
      <div className="flex flex-col h-full pt-16 pb-8 px-6">
        <div className="absolute top-5 right-5">
          <button 
            className="text-gold p-2 bg-gray-900/50 rounded-full" 
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Main Navigation */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: <Home size={20} />, label: "Home", path: "/" },
            { icon: <Bus size={20} />, label: "Shuttles", path: "/shuttles" },
            { icon: <Ticket size={20} />, label: "My Tickets", path: "/tickets", requiresAuth: true },
            { icon: <Users size={20} />, label: "Refer & Earn", path: "/refer" },
            { icon: <Tag size={20} />, label: "Deals", path: "/deals" },
            { icon: <Info size={20} />, label: "About", path: "/about" },
            { icon: <Crown size={20} />, label: "Private Ride", path: "/private-ride" },
            { icon: <MessageSquare size={20} />, label: "Feedback", path: "/feedback" }
          ].map((item, index) => (
            (!item.requiresAuth || user) && (
              <button 
                key={index}
                onClick={() => handleNavigation(item.path)}
                className="flex items-center p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gold/30 transition-all"
              >
                <div className="bg-gray-800 p-2 rounded-full mr-3">
                  {item.icon}
                </div>
                <span className="text-white font-medium">{item.label}</span>
              </button>
            )
          ))}
        </div>
        
        {/* Admin Dashboard */}
        {userRole === 'Admin' && (
          <button 
            onClick={() => handleNavigation("/admin-dashboard")}
            className="flex items-center p-4 bg-gold/10 rounded-xl border border-gold/30 hover:bg-gold/20 transition-all mb-6"
          >
            <div className="bg-gold/20 p-2 rounded-full mr-3">
              <Crown size={20} className="text-gold" />
            </div>
            <span className="text-gold font-medium">Admin Dashboard</span>
          </button>
        )}
        
        {/* Account Actions */}
        {user ? (
          <div className="mt-auto space-y-3">
            <button
              onClick={() => {
                onShowProfile();
                onClose();
              }}
              className="flex items-center w-full bg-gray-900/70 p-4 rounded-xl border border-gray-800 hover:border-gold/30 transition-all"
            >
              <div className="bg-gray-800 p-2 rounded-full mr-3">
                <UserCircle size={20} />
              </div>
              <span className="text-white font-medium">Profile</span>
            </button>
            <button
              onClick={() => {
                onShowWallet();
                onClose();
              }}
              className="flex items-center w-full bg-gray-900/70 p-4 rounded-xl border border-gray-800 hover:border-gold/30 transition-all"
            >
              <div className="bg-gray-800 p-2 rounded-full mr-3">
                <Wallet size={20} />
              </div>
              <span className="text-white font-medium">Wallet</span>
            </button>
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="flex items-center w-full bg-red-900/20 p-4 rounded-xl border border-red-900/30 hover:bg-red-900/30 transition-all"
            >
              <div className="bg-red-900/30 p-2 rounded-full mr-3">
                <LogOut size={20} className="text-red-400" />
              </div>
              <span className="text-red-400 font-medium">Sign Out</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              onSignIn();
              onClose();
            }}
            className="mt-auto w-full bg-gold hover:bg-yellow-400 text-black font-bold py-4 rounded-xl flex items-center justify-center transition-colors"
          >
            <UserCircle size={20} className="mr-2" />
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}