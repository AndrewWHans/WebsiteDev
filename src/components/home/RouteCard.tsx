import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

interface RouteCardProps {
  route: {
    id: string;
    date: string;
    time_slots: string[];
    price: number;
    max_capacity_per_slot: number;
    tickets_sold: number;
    active_bookings?: number;
    pickup: { name: string };
    dropoff: { name: string };
    min_threshold: number;
  };
}

export function RouteCard({ route }: RouteCardProps) {
  const navigate = useNavigate();
  
  // Function to navigate and scroll to top
  const navigateToRoute = (routeId: string) => {
    navigate(`/shuttles/${routeId}`);
    window.scrollTo(0, 0);
  };

  const displayedBookings = route.active_bookings !== undefined ? route.active_bookings : route.tickets_sold;
  const isConfirmed = displayedBookings >= route.min_threshold;
  const remainingSeats = (route.max_capacity_per_slot * route.time_slots.length) - displayedBookings;
  const totalCapacity = route.max_capacity_per_slot * route.time_slots.length;

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden hover:shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all">
      <div className="p-6 flex flex-col h-full">
        {/* Top section with date and booking status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Calendar className="text-gold mr-2" size={20} />
            <span className="text-gray-300">
              {new Date(route.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const url = `${window.location.origin}/shuttles/${route.id}`;
              navigator.clipboard.writeText(url);
              
              // Optional: Show a toast/notification that URL was copied
              alert("Booking link copied to clipboard!");
              
              // Alternative: Use the Web Share API if available
              if (navigator.share) {
                navigator.share({
                  title: `${route.pickup.name} to ${route.dropoff.name} Shuttle`,
                  text: `Join me on this shuttle from ${route.pickup.name} to ${route.dropoff.name}!`,
                  url: url,
                });
              }
            }}
            className="bg-yellow-900/50 border border-yellow-500 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full hover:bg-yellow-800/50 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            Share
          </button>
        </div>
        
        {/* Middle section with route info */}
        <h3 className="text-xl font-bold mb-4">
          {route.pickup.name} to {route.dropoff.name}
        </h3>
        
        {/* Spacer to push the progress bar to the bottom */}
        <div className="flex-grow"></div>
        
        {/* Bottom section with confirmation status and progress bar */}
        <div className="mt-auto">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">
              {isConfirmed ? 'Shuttle Confirmed!' : ''}
            </span>
            <span className={`font-bold ${isConfirmed ? 'text-green-500' : 'text-gold'}`}>
              {displayedBookings}/{totalCapacity} total seats
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 relative">
            {/* Progress bar */}
            <div 
              className={`${isConfirmed ? 'bg-green-500' : 'bg-gold'} h-2 rounded-full transition-all duration-500`} 
              style={{ width: `${Math.min(100, Math.round((displayedBookings / totalCapacity) * 100))}%` }}
            ></div>
            
            {/* Minimum threshold marker - changed to line */}
            <div 
              className="absolute -top-1 -bottom-1 w-1 bg-white"
              style={{
                left: `${Math.min(100, Math.round((route.min_threshold / totalCapacity) * 100))}%`,
                transform: 'translateX(-50%)'
              }}
            ></div>
            <div 
              className="absolute top-4 text-xs text-white bg-gray-700 px-1 rounded"
              style={{
                left: `${Math.min(100, Math.round((route.min_threshold / totalCapacity) * 100))}%`,
                transform: 'translateX(-50%)'
              }}
            >
              Min {route.min_threshold}
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1 mb-4">
            <span className="text-gray-500">0 seats</span>
            <span className="text-gray-500">{totalCapacity} seats</span>
          </div>
          
          {/* Price and Book Now button */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gold text-xl font-bold">${route.price}</span>
              <span className="text-gray-400 text-sm ml-1">/ person</span>
            </div>
            <button 
              className="bg-gold hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg transition-colors"
              onClick={() => navigateToRoute(route.id)}
            >
              Book Now <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}