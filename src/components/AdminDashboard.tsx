import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Home,
  Tag,
  Users,
  Car,
  Settings,
  BarChart3,
  LogOut,
  Loader2,
  QrCode,
  MessageSquare,
  Menu,
  X,
  Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminRoutes } from './routes/AdminRoutes';
import { AdminUsers } from './AdminUsers';
import { AdminAnalytics } from './analytics/AdminAnalytics';
import { AdminDeals } from './AdminDeals';
import { QRScannerPage } from './routes/QRScannerPage';
import { AdminPrivateRequests } from './AdminPrivateRequests';
import { AdminFeedback } from './feedback/AdminFeedback';
import { PointsManager } from './points/PointsManager';

type AdminDashboardProps = {
  user: any;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState({
    activeRoutes: 0,
    activeDeals: 0,
    totalUsers: 0,
    pointValue: 0.02
  });
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'routes' | 'deals' | 'users' | 'private-requests' | 'analytics' | 'scan' | 'points' | 'feedback'>('overview');

  // Load overview metrics
  React.useEffect(() => {
    const loadMetrics = async () => {
      try {
        // Get active routes count
        const { count: routesCount, error: routesError } = await supabase
          .from('routes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (routesError) throw routesError;

        // Get active deals count
        const { count: dealsCount, error: dealsError } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (dealsError) throw dealsError;

        // Get total users count
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Get point value setting
        const { data: pointValueData, error: pointValueError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'point_value')
          .single();

        if (pointValueError && pointValueError.code !== 'PGRST116') {
          console.error('Error loading point value:', pointValueError);
        }

        setMetrics({
          activeRoutes: routesCount || 0,
          activeDeals: dealsCount || 0,
          totalUsers: usersCount || 0,
          pointValue: pointValueData ? parseFloat(pointValueData.value) : 0.02
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    };

    if (isAdmin) {
      loadMetrics();
    }
  }, [isAdmin]);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        if (error) throw error;
        setIsAdmin(profile?.role === 'Admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden mr-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
              <LayoutDashboard className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:inline">
                Admin Dashboard
              </span>
            </div>
            <div className="flex items-center">
              <a
                href="/"
                className="mr-2 sm:mr-4 inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Website</span>
              </a>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-grow">
        {/* Sidebar */}
        <div className={`${
          showMobileMenu 
            ? 'fixed inset-0 z-40 bg-white w-full transform translate-x-0 transition-transform duration-300 ease-in-out'
            : 'fixed inset-y-0 left-0 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out lg:relative lg:w-48 bg-white shadow-sm'
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
              onClick={() => setActiveTab('routes')}
            >
              <Bus className="mr-3 h-6 w-6" />
              Routes
            </a>
            <a
              href="#" 
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'deals' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('deals')}
            >
              <Tag className="mr-3 h-6 w-6" />
              Deals
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'users' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <Users className="mr-3 h-6 w-6" />
              Users
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'private-requests' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('private-requests')}
            >
              <Car className="mr-3 h-6 w-6" />
              Private Requests
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'analytics' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="mr-3 h-6 w-6" />
              Analytics
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'scan' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('scan')}
            >
              <QrCode className="mr-3 h-6 w-6" />
              Scan Tickets
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'points' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('points')}
            >
              <Award className="mr-3 h-6 w-6" />
              Miles Manager
            </a>
            <a
              href="#"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activeTab === 'feedback' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare className="mr-3 h-6 w-6" />
              Feedback
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
              <AdminRoutes />
            ) : activeTab === 'users' ? (
              <AdminUsers />
            ) : activeTab === 'deals' ? (
              <AdminDeals />
            ) : activeTab === 'private-requests' ? (
              <AdminPrivateRequests />
            ) : activeTab === 'analytics' ? (
              <AdminAnalytics />
            ) : activeTab === 'points' ? (
              <PointsManager pointValue={metrics.pointValue} />
            ) : activeTab === 'feedback' ? (
              <AdminFeedback />
            ) : activeTab === 'scan' ? (
              <QRScannerPage />
            ) : (
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">Welcome back, Admin!</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Here's what's happening with your platform today.
                  </p>
                </div>
    
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Active Routes Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Bus className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Active Routes
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {metrics.activeRoutes}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Active Deals Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Tag className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Active Deals
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {metrics.activeDeals}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Total Users Card */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Users
                            </dt>
                            <dd className="flex items-baseline">
                              <div className="text-2xl font-semibold text-gray-900">
                                {metrics.totalUsers.toLocaleString()}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
    
                {/* Recent Activity Section */}
                <div className="mt-6">
                  <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                  <div className="mt-3 bg-white shadow rounded-lg">
                    <div className="p-6">
                      <p className="text-center text-gray-500 text-sm">
                        Activity feed coming soon...
                      </p>
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