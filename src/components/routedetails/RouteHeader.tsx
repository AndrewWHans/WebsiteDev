import React, { useState, useEffect } from 'react';
import { Bus, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

type RouteHeaderProps = {
  route: {
    id: string;
    date: string;
    price: number;
    tickets_sold: number;
    min_threshold: number;
    pickup: { name: string; address: string; } | null;
    dropoff: { name: string; address: string; } | null;
    time_slots?: string[];
    max_capacity_per_slot?: number;
  };
  formatDate: (dateString: string) => string;
  progressPercentage: number;
  isConfirmed: boolean;
  activeBookings?: number;
};

export const RouteHeader: React.FC<RouteHeaderProps> = ({ 
  route, 
  formatDate, 
  progressPercentage, 
  isConfirmed,
  activeBookings
}) => {
  const [actualBookings, setActualBookings] = useState<number>(0);
  
  // Calculate total capacity (if time_slots and max_capacity_per_slot are available)
  const totalCapacity = route.time_slots && route.max_capacity_per_slot 
    ? route.time_slots.length * route.max_capacity_per_slot 
    : 100; // Fallback to 100 if we don't have the data

  useEffect(() => {
    // Fetch the actual booking count directly
    const fetchActualBookings = async () => {
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('ticket_bookings')
          .select('quantity')
          .eq('route_id', route.id)
          .neq('status', 'refunded');

        if (bookingsError) throw bookingsError;

        // Calculate total tickets by summing quantities
        const totalTickets = bookingsData?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
        setActualBookings(totalTickets);
      } catch (error) {
        console.error('Error fetching actual bookings:', error);
        // Fall back to the provided activeBookings or tickets_sold
        setActualBookings(activeBookings !== undefined ? activeBookings : route.tickets_sold);
      }
    };

    fetchActualBookings();
  }, [route.id, activeBookings, route.tickets_sold]);

  // Use the fetched actual bookings for display and calculations
  const displayedBookings = actualBookings;
  
  // Calculate the progress percentage based on the actual bookings vs total capacity
  const calculatedProgressPercentage = Math.min(100, Math.round((displayedBookings / totalCapacity) * 100));

  // Calculate the position for the minimum threshold marker
  const minThresholdPosition = Math.min(100, Math.round((route.min_threshold / totalCapacity) * 100));
  
  // Determine if the minimum threshold has been reached
  const thresholdReached = displayedBookings >= route.min_threshold;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-gold/30">
      <div className="relative p-4 sm:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="mb-4 sm:mb-0">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center mb-3"
            >
              <Calendar className="text-gold mr-2" size={20} />
              <span className="text-gray-300">
                {formatDate(route.date)}
              </span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight"
            >
              {route.pickup?.name} to {route.dropoff?.name}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex items-center mt-4"
            >
              <div className={`bg-gold/20 text-gold rounded-full p-2 mr-3`}>
                <Bus size={24} />
              </div>
              <div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  isConfirmed 
                    ? 'bg-green-900/60 text-green-400' 
                    : 'bg-yellow-900/60 text-yellow-400'
                }`}>
                  {isConfirmed ? 'Confirmed' : 'Awaiting Minimum Riders'}
                </span>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="text-center bg-black bg-opacity-50 py-3 px-5 sm:py-4 sm:px-6 rounded-xl border border-gold/30 self-start sm:self-auto"
          >
            <span className="block text-2xl sm:text-3xl font-bold text-gold">${route.price}</span>
            <span className="text-gray-400 text-sm">per person</span>
          </motion.div>
        </div>

        {/* Progress Bar Section */}
        <div className="mt-6 sm:mt-8 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
            <span className="text-gray-300 text-sm sm:text-base mb-1 sm:mb-0">
              {isConfirmed 
                ? 'Minimum seats reached! This shuttle is confirmed' 
                : 'Progress to minimum required seats'
              }
            </span>
            <span className={`font-bold text-sm sm:text-base ${isConfirmed ? 'text-green-500' : 'text-gold'}`}>
              {activeBookings}/{totalCapacity} seats
            </span>
          </div>
          
          {/* Progress Bar Container */}
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative"
          >
            {/* Background bar */}
            <div className="w-full bg-gray-800 rounded-full h-3"></div>
            
            {/* Filled progress bar */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${calculatedProgressPercentage}%` }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className={`h-3 rounded-full transition-all duration-700 ease-in-out absolute top-0 left-0 ${
                isConfirmed ? 'bg-green-500' : 'bg-gold'
              }`} 
            ></motion.div>
            
            {/* Minimum threshold marker - line with improved label */}
            <div 
              className="absolute -top-0.5 -bottom-0.5 group" 
              style={{ 
                left: `${minThresholdPosition}%`, 
                transform: 'translateX(-50%)',
                zIndex: 10 
              }}
            >
              {/* Label above the line - now with hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-gray-800 text-xs text-white px-2 py-1 rounded-md border border-white/20 shadow-lg">
                  <span className="font-medium">Min {route.min_threshold}</span>
                </div>
                {/* Arrow pointing to line */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800 mx-auto"></div>
              </div>
              {/* The line itself */}
              <div className="h-[calc(100%+2px)] w-1 bg-white hover:bg-white/80 transition-colors cursor-help"></div>
            </div>
          </motion.div>
          
          {/* Labels below progress bar */}
          <div className="flex justify-between mt-2 text-xs sm:text-sm text-gray-400">
            <span>0 seats</span>
            <span>{totalCapacity} seats</span>
          </div>
        </div>
      </div>
    </div>
  );
};