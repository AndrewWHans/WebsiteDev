import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RouteCard } from './RouteCard';

type Route = {
  id: string;
  date: string;
  time_slots: string[];
  price: number;
  max_capacity_per_slot: number;
  min_threshold: number;
  tickets_sold: number;
  status: string;
  pickup: { name: string; address: string; } | null;
  dropoff: { name: string; address: string; } | null;
  active_bookings?: number;
};

export function UpcomingRoutes() {
  const [upcomingRoutes, setUpcomingRoutes] = useState<Route[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUpcomingRoutes();
  }, []);

  const loadUpcomingRoutes = async () => {
    try {
      // Get today's date (start of day) in Eastern Time
      const easternNow = new Date(new Date().toLocaleString("en-US", { 
        timeZone: "America/New_York" 
      }));
      const easternDateStr = easternNow.toISOString().split('T')[0];
      
      console.log("Current date (Eastern):", easternDateStr); // Debug date value
      
      const { data: routes, error } = await supabase
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
          pickup_location,
          dropoff_location,
          pickup:locations!routes_pickup_location_fkey (name),
          dropoff:locations!routes_dropoff_location_fkey (name)
        `)
        .eq('status', 'active')
        .order('date', { ascending: true })
        .limit(10); // Fetch more routes than needed
      
      if (error) throw error;
      
      console.log("Routes before filtering:", routes?.map(r => r.date)); // Debug all routes
      
      // Filter routes to include only future dates (not past ones)
      const filteredRoutes = routes?.filter((route: Route) => {
        console.log(`Comparing route date ${route.date} with ${easternDateStr}`);
        
        // Only include routes with dates today or in the future
        const isUpcoming = route.date >= easternDateStr;
        
        console.log(`Route ${route.id} is ${isUpcoming ? 'upcoming' : 'past'}`);
        return isUpcoming;
      }).slice(0, 3) || []; // Only take the first 3 filtered routes
      
      console.log("Filtered routes:", filteredRoutes.length); // Debug filtered routes
      
      // Get active booking counts (excluding refunded tickets)
      const routeIds = filteredRoutes.map(route => route.id);
      
      if (routeIds.length > 0) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('ticket_bookings')
          .select('route_id, quantity')
          .in('route_id', routeIds)
          .neq('status', 'refunded');
          
        if (bookingError) throw bookingError;
        
        // Calculate active booking counts
        const counts: {[key: string]: number} = {};
        
        (bookingData || []).forEach((booking: { route_id: string; quantity: number }) => {
          if (!counts[booking.route_id]) {
            counts[booking.route_id] = 0;
          }
          counts[booking.route_id] += booking.quantity;
        });
        
        // Add active_bookings to routes
        const routesWithActiveBookings = filteredRoutes.map(route => ({
          ...route,
          active_bookings: counts[route.id] || 0
        }));
        
        setUpcomingRoutes(routesWithActiveBookings);
      } else {
        setUpcomingRoutes(filteredRoutes);
      }
    } catch (err) {
      console.error('Error loading upcoming routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Soonest Departures</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Secure your spot on our scheduled party bus routes. Limited seats available!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingRoutes ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : upcomingRoutes.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-400">No upcoming routes available</p>
            </div>
          ) : (
            upcomingRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))
          )}
        </div>

        <div className="text-center mt-10">
          <button 
            className="bg-transparent border border-gold text-gold hover:bg-gold hover:text-black font-bold py-3 px-8 rounded-full transition-colors"
            onClick={() => navigate('/shuttles')}
          >
            View All Shuttles
          </button>
        </div>
      </div>
    </section>
  );
} 