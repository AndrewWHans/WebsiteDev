import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Bus,
  Home,
  Users,
  LogOut,
  Loader2,
  QrCode,
  Menu,
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  User as UserIcon,
  BarChart3,
  Settings,
  Bell,
  Car
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DriverAuthModal } from './DriverAuthModal';
import { DriverPendingTrips } from './DriverPendingTrips';

export const DriverPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'scan' | 'profile' | 'pending-trips'>('overview');
  const [upcomingRoutes, setUpcomingRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [completedRoutes, setCompletedRoutes] = useState(0);
  const [scannedTickets, setScannedTickets] = useState(0);
  const [pendingTrips, setPendingTrips] = useState(0);

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
            
            // Load driver stats (placeholder)
            setCompletedRoutes(Math.floor(Math.random() * 10));
            setScannedTickets(Math.floor(Math.random() * 100));
            
            // Load pending trips count
            loadPendingTripsCount();
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

  const loadPendingTripsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('private_ride_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (error) throw error;
      
      setPendingTrips(count || 0);
    } catch (err) {
      console.error('Error loading pending trips count:', err);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <DriverAuthModal isOpen={true} onClose={() => navigate('/')} onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Removed */}
      {/* <nav className="bg-white shadow-sm sticky top-0 z-50"> ... </nav> */}
      <div className="flex flex-grow">
        {/* Sidebar */}
        <div className={`${
          showMobileMenu 
            ? 'fixed inset-0 z-40 bg-white w-full transform translate-x-0 transition-transform duration-300 ease-in-out'
            : 'fixed inset-y-0 left-0 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out lg:relative lg:w-64 bg-white shadow-sm'
        }`}>
          {showMobileMenu && (
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
          )}
          <nav className="mt-5 px-2">
            <a
              href="#"
              className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'overview' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                setActiveTab('overview');
                setShowMobileMenu(false);
              }}
            >
              <LayoutDashboard className="mr-3 h-6 w-6" />
              Overview
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'routes' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                setActiveTab('routes');
                setShowMobileMenu(false);
              }}
            >
              <Bus className="mr-3 h-6 w-6" />
              My Routes
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'scan' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                setActiveTab('scan');
                setShowMobileMenu(false);
              }}
            >
              <QrCode className="mr-3 h-6 w-6" />
              Scan Tickets
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'profile' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                setActiveTab('profile');
                setShowMobileMenu(false);
              }}
            >
              <UserIcon className="mr-3 h-6 w-6" />
              My Profile
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'pending-trips' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                setActiveTab('pending-trips');
                setShowMobileMenu(false);
              }}
            >
              <Car className="mr-3 h-6 w-6" />
              Pending Trips
            </a>
            <a
              href="#"
              className="mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <Settings className="mr-3 h-6 w-6" />
              Settings
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
          <main className="p-6">
            {activeTab === 'routes' ? ( 
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">My Routes</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    View and manage your assigned routes
                  </p>
                </div>
                
                {loadingRoutes ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : upcomingRoutes.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center">
                    <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No routes assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any upcoming routes assigned to you yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingRoutes.map((route) => (
                      <div 
                        key={route.id}
                        className="bg-white rounded-lg shadow overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <div>
                              <div className="flex items-center mb-2">
                                <Calendar className="text-indigo-600 mr-2" size={16} />
                                <span className="text-gray-600 text-sm">
                                  {formatDate(route.date)}
                                </span>
                              </div>
                              
                              <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {route.pickup.name} to {route.dropoff.name}
                              </h3>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                {route.time_slots.map((time: string, index: number) => (
                                  <div 
                                    key={index}
                                    className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full flex items-center"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatTime(time)}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="mt-3 md:mt-0">
                              <div className="bg-gray-100 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-600 text-xs">Passengers</span>
                                  <span className="text-gray-900 font-bold">
                                    {route.tickets_sold}/{route.max_capacity_per_slot * route.time_slots.length}
                                  </span>
                                </div>
                                
                                <div className="w-full bg-gray-300 rounded-full h-2">
                                  <div 
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${Math.min(100, (route.tickets_sold / (route.max_capacity_per_slot * route.time_slots.length)) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              <button
                                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md transition-colors flex items-center justify-center"
                              >
                                <QrCode size={16} className="mr-2" />
                                Scan Tickets
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'scan' ? (
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">Scan Tickets</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Scan passenger tickets to verify and check them in
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center py-12">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Ticket Scanner</h3>
                    <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto mb-6">
                      Click the button below to open the camera and scan passenger tickets
                    </p>
                    <button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md transition-colors inline-flex items-center"
                    >
                      <QrCode size={18} className="mr-2" />
                      Start Scanning
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Scans</h2>
                  <div className="text-center py-8 text-gray-500">
                    No recent scans
                  </div>
                </div>
              </div>
            ) : activeTab === 'profile' ? (
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    View and update your driver profile
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center">
                      <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                        {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
                      </div>
                      <div className="ml-6">
                        <h2 className="text-xl font-bold text-gray-900">
                          {userProfile.first_name} {userProfile.last_name}
                        </h2>
                        <p className="text-indigo-600 font-medium">Driver</p>
                        <p className="text-gray-500">{userProfile.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <div className="mt-1 p-2 bg-gray-100 rounded-md">
                              {userProfile.email}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <div className="mt-1 p-2 bg-gray-100 rounded-md">
                              {userProfile.phone_number || 'Not provided'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Driver ID</label>
                            <div className="mt-1 p-2 bg-gray-100 rounded-md font-mono text-sm">
                              {userProfile.id.substring(0, 8)}...
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={12} className="mr-1" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'pending-trips' ? (
              <DriverPendingTrips />
            ) : (
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">Welcome, {userProfile.first_name}!</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Here's an overview of your upcoming routes and stats
                  </p>
                </div>
    
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Routes Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                          <Bus className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Upcoming Routes
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {upcomingRoutes.length}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Pending Trips Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                          <Car className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Pending Trips
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {pendingTrips}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Completed Routes Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Completed Routes
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {completedRoutes}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Tickets Scanned Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                          <QrCode className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Tickets Scanned
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {scannedTickets}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
    
                {/* Next Route Section */}
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Next Route</h2>
                  {upcomingRoutes.length > 0 ? (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div>
                            <div className="flex items-center mb-2">
                              <Calendar className="text-indigo-600 mr-2" size={16} />
                              <span className="text-gray-600 text-sm">
                                {formatDate(upcomingRoutes[0].date)}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                              {upcomingRoutes[0].pickup.name} to {upcomingRoutes[0].dropoff.name}
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {upcomingRoutes[0].time_slots.map((time: string, index: number) => (
                                <div 
                                  key={index}
                                  className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full flex items-center"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(time)}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mt-3 md:mt-0">
                            <div className="bg-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-600 text-xs">Passengers</span>
                                <span className="text-gray-900 font-bold">
                                  {upcomingRoutes[0].tickets_sold}/{upcomingRoutes[0].max_capacity_per_slot * upcomingRoutes[0].time_slots.length}
                                </span>
                              </div>
                              
                              <div className="w-full bg-gray-300 rounded-full h-2">
                                <div 
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (upcomingRoutes[0].tickets_sold / (upcomingRoutes[0].max_capacity_per_slot * upcomingRoutes[0].time_slots.length)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex space-x-2">
                              <button
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md transition-colors flex items-center justify-center"
                              >
                                <QrCode size={16} className="mr-2" />
                                Scan Tickets
                              </button>
                              
                              <button
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-md transition-colors flex items-center justify-center"
                              >
                                <MapPin size={16} className="mr-2" />
                                View Map
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">No upcoming routes</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        You don't have any upcoming routes assigned to you yet.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Recent Activity Section */}
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
                  <div className="bg-white shadow rounded-lg">
                    <div className="p-6">
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>No recent activity</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};