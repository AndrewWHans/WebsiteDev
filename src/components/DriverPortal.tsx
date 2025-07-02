import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  CheckCircle,
  Loader2,
  QrCode,
  LogOut,
  User as UserIcon,
  Bus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DriverAuthModal } from './DriverAuthModal';

export const DriverPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [upcomingRoutes, setUpcomingRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Check if user is logged in and has Driver role
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if user has Driver role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) throw profileError;
          
          if (profile.role !== 'Driver') {
            // Not a driver, show auth modal
            setUser(null);
            setUserProfile(null);
            setShowAuthModal(true);
          } else {
            // Is a driver, set user and profile
            setUser(user);
            setUserProfile(profile);
            setShowAuthModal(false);
            
            // Load upcoming routes
            loadUpcomingRoutes();
          }
        } else {
          // No user, show auth modal
          setShowAuthModal(true);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setShowAuthModal(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const loadUpcomingRoutes = async () => {
    setLoadingRoutes(true);
    
    try {
      // Get today's date in ISO format
      const today = new Date().toISOString().split('T')[0];
      
      // Get upcoming routes
      const { data: routes, error } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          time_slots,
          pickup:locations!routes_pickup_location_fkey (name),
          dropoff:locations!routes_dropoff_location_fkey (name),
          tickets_sold,
          max_capacity_per_slot
        `)
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10);
        
      if (error) throw error;
      
      setUpcomingRoutes(routes || []);
    } catch (err) {
      console.error('Error loading upcoming routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setShowAuthModal(true);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleAuthSuccess = (user: any) => {
    setUser(user);
    setShowAuthModal(false);
    
    // Reload the page to check role and load data
    window.location.reload();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Auth Modal */}
      <DriverAuthModal
        isOpen={showAuthModal}
        onClose={() => navigate('/')}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Driver Dashboard */}
      {user && userProfile && (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 text-gold hover:text-gold/80 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-gold">Driver Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gray-900 rounded-lg px-4 py-2 border border-gold/30">
                <div className="flex items-center">
                  <div className="bg-gold/20 rounded-full p-2 mr-3">
                    <UserIcon className="text-gold" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {userProfile.first_name} {userProfile.last_name}
                    </p>
                    <p className="text-gray-400 text-sm">Driver</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg border border-red-500/30 transition-colors flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 rounded-xl border border-gold/30 p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/verify')}
                    className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <QrCode size={20} className="mr-2" />
                    Scan Tickets
                  </button>
                  
                  <button
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Bus size={20} className="mr-2" />
                    View Assigned Routes
                  </button>
                </div>
              </div>
              
              {/* Driver Stats */}
              <div className="bg-gray-900 rounded-xl border border-gold/30 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Driver Stats</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Routes Completed</span>
                    <span className="text-white font-bold">0</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Tickets Scanned</span>
                    <span className="text-white font-bold">0</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Rating</span>
                    <span className="text-gold font-bold">N/A</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Upcoming Routes */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-xl border border-gold/30 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming Routes</h2>
                
                {loadingRoutes ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  </div>
                ) : upcomingRoutes.length === 0 ? (
                  <div className="text-center py-12">
                    <Bus className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No upcoming routes assigned</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingRoutes.map((route) => (
                      <div 
                        key={route.id}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gold/30 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div>
                            <div className="flex items-center mb-2">
                              <Calendar className="text-gold mr-2" size={16} />
                              <span className="text-gray-300 text-sm">
                                {formatDate(route.date)}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2">
                              {route.pickup.name} to {route.dropoff.name}
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {route.time_slots.map((time: string, index: number) => (
                                <div 
                                  key={index}
                                  className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center"
                                >
                                  <Clock className="w-3 h-3 text-gold mr-1" />
                                  {formatTime(time)}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mt-3 md:mt-0">
                            <div className="bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400 text-xs">Passengers</span>
                                <span className="text-white font-bold">
                                  {route.tickets_sold}/{route.max_capacity_per_slot * route.time_slots.length}
                                </span>
                              </div>
                              
                              <div className="w-full bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-gold h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (route.tickets_sold / (route.max_capacity_per_slot * route.time_slots.length)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};