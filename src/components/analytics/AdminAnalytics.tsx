import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Ticket, 
  Users, 
  Bus, 
  XCircle, 
  CalendarDays,
  RefreshCw,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Clock,
  MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RevenueChart } from './RevenueChart';
import { RoutePerformanceTable } from './RoutePerformanceTable';
import { UserMetricsChart } from './UserMetricsChart';
import { TimeSlotHeatmap } from './TimeSlotHeatmap';

export const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({
    revenue: {
      total: 0,
      last30Days: 0,
      trend: 0
    },
    tickets: {
      total: 0,
      last30Days: 0,
      trend: 0
    },
    users: {
      total: 0,
      activeThisMonth: 0,
      newThisMonth: 0
    },
    routes: {
      completed: 0,
      cancelled: 0,
      upcoming: 0
    },
    refunds: {
      count: 0,
      amount: 0
    }
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [routePerformance, setRoutePerformance] = useState<any[]>([]);
  const [userMetrics, setUserMetrics] = useState<any[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get date ranges
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const startDate = new Date(now.getTime() - (parseInt(timeRange) * 24 * 60 * 60 * 1000));

      // Load revenue metrics
      const { data: revenueData, error: revenueError } = await supabase
        .from('ticket_bookings')
        .select('total_price, created_at, status, quantity')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (revenueError) throw revenueError;

      // Load user metrics
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, created_at, role');

      if (userError) throw userError;

      // Load route metrics
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          time_slots,
          price,
          max_capacity_per_slot,
          min_threshold,
          tickets_sold,
          status,
          pickup:locations!routes_pickup_location_fkey (name),
          dropoff:locations!routes_dropoff_location_fkey (name)
        `)
        .order('date', { ascending: false });

      if (routeError) throw routeError;

      // Calculate metrics
      const totalRevenue = revenueData
        ?.filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.total_price, 0) || 0;

      const last30DaysRevenue = revenueData
        ?.filter(b => 
          (b.status === 'confirmed' || b.status === 'completed') &&
          new Date(b.created_at) >= thirtyDaysAgo
        )
        .reduce((sum, b) => sum + b.total_price, 0) || 0;

      const refundedBookings = revenueData
        ?.filter(b => b.status === 'refunded') || [];

      const refundedAmount = refundedBookings
        .reduce((sum, b) => sum + b.total_price, 0);

      // Calculate route performance
      const routePerformanceData = routeData?.map(route => ({
        id: route.id,
        route: `${route.pickup.name} to ${route.dropoff.name}`,
        date: route.date,
        capacity: route.max_capacity_per_slot * route.time_slots.length,
        threshold: route.min_threshold,
        sold: route.tickets_sold,
        revenue: route.tickets_sold * route.price,
        fillRate: (route.tickets_sold / (route.max_capacity_per_slot * route.time_slots.length)) * 100,
        status: route.status
      })) || [];

      // Update state
      setMetrics({
        revenue: {
          total: totalRevenue,
          last30Days: last30DaysRevenue,
          trend: ((last30DaysRevenue / totalRevenue) * 100) - 100
        },
        tickets: {
          total: revenueData
            ?.filter(b => b.status === 'confirmed' || b.status === 'completed')
            .reduce((sum, b) => sum + (b.quantity || 0), 0) || 0,
          last30Days: revenueData
            ?.filter(b => 
              (b.status === 'confirmed' || b.status === 'completed') &&
              new Date(b.created_at) >= thirtyDaysAgo
            )
            .reduce((sum, b) => sum + (b.quantity || 0), 0) || 0
        },
        users: {
          total: userData?.length || 0,
          activeThisMonth: userData?.filter(u => 
            new Date(u.created_at) >= thirtyDaysAgo
          ).length || 0,
          newThisMonth: userData?.filter(u => 
            new Date(u.created_at) >= thirtyDaysAgo
          ).length || 0
        },
        routes: {
          completed: routeData?.filter(r => r.status === 'completed').length || 0,
          cancelled: routeData?.filter(r => r.status === 'cancelled').length || 0,
          upcoming: routeData?.filter(r => 
            r.status === 'active' && new Date(r.date) > new Date()
          ).length || 0
        },
        refunds: {
          count: refundedBookings.length,
          amount: refundedAmount
        }
      });

      setRoutePerformance(routePerformanceData);
      setRevenueData(revenueData || []);

    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprehensive overview of your platform's performance
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setTimeRange('7d')}
            className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
              timeRange === '7d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
              timeRange === '30d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
              timeRange === '90d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.revenue.trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.revenue.trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Revenue</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.revenue.total.toFixed(2)}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              last {timeRange}
            </span>
          </div>
        </div>

        {/* Tickets Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <Ticket className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tickets Sold</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {metrics.tickets.total}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              ({metrics.tickets.last30Days} this month)
            </span>
          </div>
        </div>

        {/* Users Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 rounded-full p-3">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="bg-green-100 rounded-full px-2 py-1">
              <div className="flex items-center text-xs font-medium text-green-600">
                <UserPlus className="w-3 h-3 mr-1" />
                +{metrics.users.newThisMonth}
              </div>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Users</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {metrics.users.total}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              ({metrics.users.activeThisMonth} active)
            </span>
          </div>
        </div>

        {/* Routes Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 rounded-full p-3">
              <Bus className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Routes</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Completed:</span>
              <span className="font-medium text-gray-900">{metrics.routes.completed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cancelled:</span>
              <span className="font-medium text-gray-900">{metrics.routes.cancelled}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Upcoming:</span>
              <span className="font-medium text-gray-900">{metrics.routes.upcoming}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue Over Time</h3>
          <RevenueChart data={revenueData} timeRange={timeRange} />
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">User Growth</h3>
          <UserMetricsChart data={metrics.users} timeRange={timeRange} />
        </div>
      </div>

      {/* Route Performance Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Route Performance</h3>
          <p className="mt-1 text-sm text-gray-500">
            Detailed metrics for all routes
          </p>
        </div>
        <RoutePerformanceTable routes={routePerformance} />
      </div>

      {/* Additional Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Slot Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Popular Time Slots</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <TimeSlotHeatmap data={timeSlotData} />
        </div>

        {/* Popular Routes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Top Routes</h3>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {routePerformance
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5)
              .map((route, index) => (
                <div key={route.id} className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-indigo-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {route.route}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${route.revenue.toFixed(2)} • {route.sold} tickets
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Refund Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Refund Metrics</h3>
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Refunds</span>
                <span className="text-sm font-medium text-gray-900">
                  {metrics.refunds.count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Refunded Amount</span>
                <span className="text-sm font-medium text-red-600">
                  ${metrics.refunds.amount.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Refund Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {((metrics.refunds.count / metrics.tickets.total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};