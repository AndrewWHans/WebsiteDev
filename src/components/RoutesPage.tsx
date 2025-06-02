import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, 
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
};

type GroupedRoutes = {
  [key: string]: Route[];
};

export const RoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string; }[]>([]);
  const [visibleCities, setVisibleCities] = useState<string[]>([]);
  const [activeBookingCounts, setActiveBookingCounts] = useState<{[key: string]: number}>({});
  const [timeSlotBookings, setTimeSlotBookings] = useState<{[key: string]: {[timeSlot: string]: number}}>({});

  // Update loadRoutes when selectedCity changes
  useEffect(() => {
    loadRoutes();
  }, [selectedCity]);

  useEffect(() => {
    loadLocations();
    loadVisibleCities();
    loadRoutes();
  }, []);

  const loadVisibleCities = async () => {
    try {
      // Get the list of all cities
      const allCities = ['Tampa', 'St. Petersburg', 'Oaxaca', 'Orlando', 'Miami', 'Nashville', 'Austin', 'Jersey Shore', 'Mexico City'];
      
      // Get hidden cities from system settings
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hidden_cities')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // If we have hidden cities, filter them out
      if (data && data.value) {
        try {
          const hiddenCities = JSON.parse(data.value);
          if (Array.isArray(hiddenCities)) {
            setVisibleCities(allCities.filter(city => !hiddenCities.includes(city)));
            return;
          }
        } catch (e) {
          console.error('Error parsing hidden cities:', e);
        }
      }
      
      // Default to all cities if no hidden cities found
      setVisibleCities(allCities);
    } catch (err) {
      console.error('Error loading visible cities:', err);
      // Default to all cities if there's an error
      setVisibleCities(['Tampa', 'St. Petersburg', 'Oaxaca', 'Orlando', 'Miami', 'Nashville', 'Austin', 'Jersey Shore', 'Mexico City']);
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const loadRoutes = async () => {
    try {
      // Get today's date (start of day) in Eastern Time
      const easternNow = new Date(new Date().toLocaleString("en-US", { 
        timeZone: "America/New_York" 
      }));
      const easternDateStr = easternNow.toISOString().split('T')[0];
      
      // Get all active routes with filters
      let query = supabase
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
          pickup:locations!routes_pickup_location_fkey (name, address),
          dropoff:locations!routes_dropoff_location_fkey (name, address)
        `)
        .eq('status', 'active');
        
      // Apply filters
      if (selectedPickup) {
        query = query.eq('pickup_location', selectedPickup);
      }
      if (selectedDropoff) {
        query = query.eq('dropoff_location', selectedDropoff);
      }
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }
      
      // Order results
      query = query.order('date', { ascending: true });
      
      const { data: routes, error } = await query;

      if (error) throw error;
      
      // Filter routes to include today and future dates
      const filteredRoutes = routes?.filter(route => {
        return route.date >= easternDateStr;
      }) || [];
      
      // Get active booking counts (excluding refunded tickets)
      const routeIds = filteredRoutes.map(route => route.id);
      
      if (routeIds.length > 0) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('ticket_bookings')
          .select('route_id, quantity, time_slot')
          .in('route_id', routeIds)
          .neq('status', 'refunded');
          
        if (bookingError) throw bookingError;
        
        // Calculate active booking counts
        const counts: {[key: string]: number} = {};
        const slotCounts: {[key: string]: {[timeSlot: string]: number}} = {};
        
        (bookingData || []).forEach(booking => {
          // Total bookings per route
          if (!counts[booking.route_id]) {
            counts[booking.route_id] = 0;
          }
          counts[booking.route_id] += booking.quantity;
          
          // Bookings per time slot
          if (!slotCounts[booking.route_id]) {
            slotCounts[booking.route_id] = {};
          }
          
          const timeSlot = booking.time_slot || 'default';
          if (!slotCounts[booking.route_id][timeSlot]) {
            slotCounts[booking.route_id][timeSlot] = 0;
          }
          slotCounts[booking.route_id][timeSlot] += booking.quantity;
        });
        
        setActiveBookingCounts(counts);
        setTimeSlotBookings(slotCounts);
      }
      
      setRoutes(filteredRoutes);
      
      // When routes load, expand all dates
      if (filteredRoutes.length) {
        const dates = [...new Set(filteredRoutes.map(route => route.date))].sort();
        setExpandedDates(new Set(dates)); // Set all dates as expanded
      }
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupRoutesByDate = (routes: Route[]): GroupedRoutes => {
    return routes.reduce((groups: GroupedRoutes, route) => {
      const date = route.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(route);
      return groups;
    }, {});
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
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

  const getActiveBookingCount = (routeId: string) => {
    return activeBookingCounts[routeId] || 0;
  };

  const getTimeSlotAvailability = (routeId: string, timeSlot: string) => {
    const totalBookings = timeSlotBookings[routeId]?.[timeSlot] || 0;
    const route = routes.find(r => r.id === routeId);
    if (!route) return 0;
    return Math.max(0, route.max_capacity_per_slot - totalBookings);
  };

  const toggleDateExpansion = (date: string) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) {
      newExpandedDates.delete(date);
    } else {
      newExpandedDates.add(date);
    }
    setExpandedDates(newExpandedDates);
  };

  const handleFilterChange = () => {
    setLoading(true);
    loadRoutes();
  };

  const navigateToRouteDetail = (routeId: string) => {
    navigate(`/shuttles/${routeId}`);
    window.scrollTo(0, 0);
  };

  const handleCityClick = (city: string) => {
    const newCity = selectedCity === city ? null : city;
    setSelectedCity(newCity);
    const routesSection = document.getElementById('routes-section');
    if (routesSection) {
      routesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const groupedRoutes = groupRoutesByDate(routes);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gold mb-4">Available Shuttles</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Book your next party bus adventure. All shuttles include premium sound system and party lighting.
          </p>
        </div>

        {/* City Images Section */}
        <div className="mb-16">
          {/* Desktop Version - 4 cities per row */}
          <div className="hidden md:grid md:grid-cols-4 gap-4 min-h-[200px]">
            {visibleCities.length === 0 ? (
              <div className="col-span-4 flex items-center justify-center p-8 bg-gray-900 rounded-xl border border-gold/30">
                <p className="text-gray-400">No cities are currently visible. Please contact an administrator.</p>
              </div>
            ) : (
              visibleCities.map(cityName => {
              const city = {
                name: cityName,
                defaultSrc: cityName === "St. Petersburg" ? "stpete.png" : 
                            cityName === "Jersey Shore" ? "jerseyshore.png" : 
                            cityName === "Mexico City" ? "MexicoCity.png" :
                            `${cityName.toLowerCase()}.png`,
                grayscaleSrc: cityName === "St. Petersburg" ? "stpetebw.png" : 
                              cityName === "Jersey Shore" ? "jerseyshorebw.png" : 
                              cityName === "Mexico City" ? "MexicoCitybw.png" :
                              `${cityName.toLowerCase()}bw.png`
              };
              return (
                <button
                  key={city.name}
                  onClick={() => handleCityClick(city.name)}
                  className={`relative h-48 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedCity === city.name ? 'ring-2 ring-gold scale-[1.02]' : 'ring-1 ring-gray-800'
                  }`}
                >
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/40 z-10" />

                  <img
                    src={`https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/picture/${
                      selectedCity && selectedCity !== city.name ? city.grayscaleSrc : city.defaultSrc
                    }`}
                    alt={city.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  {/* Label */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className={`px-6 py-2 rounded-full ${
                      selectedCity === city.name 
                        ? 'bg-gold text-black' 
                        : 'bg-black/50 text-white'
                    } font-bold text-xl transition-colors duration-300`}>
                      {city.name}
                    </div>
                  </div>
                </button>
              );
            }))}
          </div>
          
          {/* Mobile Version - Stacked rectangular tiles */}
          <div className="md:hidden space-y-3 min-h-[200px]">
            {visibleCities.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-gray-900 rounded-xl border border-gold/30">
                <p className="text-gray-400 text-sm">No cities are currently visible. Please contact an administrator.</p>
              </div>
            ) : (
              visibleCities.map(cityName => {
              const city = {
                name: cityName,
                defaultSrc: cityName === "St. Petersburg" ? "stpete.png" : 
                            cityName === "Jersey Shore" ? "jerseyshore.png" : 
                            cityName === "Mexico City" ? "MexicoCity.png" :
                            `${cityName.toLowerCase()}.png`,
                grayscaleSrc: cityName === "St. Petersburg" ? "stpetebw.png" : 
                              cityName === "Jersey Shore" ? "jerseyshorebw.png" : 
                              cityName === "Mexico City" ? "MexicoCitybw.png" :
                              `${cityName.toLowerCase()}bw.png`
              };
              return (
                <button
                  key={city.name}
                  onClick={() => handleCityClick(city.name)}
                  className={`relative w-full h-24 rounded-xl overflow-hidden flex items-center cursor-pointer transition-all duration-200 ${
                    selectedCity === city.name ? 'ring-2 ring-gold scale-[1.02]' : 'ring-1 ring-gray-800'
                  }`}
                >
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/40 z-10" />

                  <img
                    src={`https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/picture/${
                      selectedCity && selectedCity !== city.name ? city.grayscaleSrc : city.defaultSrc
                    }`}
                    alt={city.name}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />

                  {/* Label with highlight effect */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className={`px-6 py-2 rounded-full ${
                      selectedCity === city.name 
                        ? 'bg-gold text-black' 
                        : 'bg-black/50 text-white'
                    } font-bold text-xl transition-colors duration-300`}>
                      {city.name}
                    </div>
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gold hover:text-gold/80 transition-colors mb-4"
          >
            <Filter size={20} />
            <span>Filter Routes</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showFilters && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gold/30 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pickup Location
                  </label>
                  <select
                    value={selectedPickup || ''}
                    onChange={(e) => {
                      setSelectedPickup(e.target.value || null);
                      handleFilterChange();
                    }}
                    className="w-full bg-gray-800 text-white rounded-lg border border-gray-700 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="">Any Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Destination
                  </label>
                  <select
                    value={selectedDropoff || ''}
                    onChange={(e) => {
                      setSelectedDropoff(e.target.value || null);
                      handleFilterChange();
                    }}
                    className="w-full bg-gray-800 text-white rounded-lg border border-gray-700 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="">Any Destination</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Routes List */}
        <div id="routes-section">
        {Object.entries(groupedRoutes).length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gold/30">
            <Bus className="w-12 h-12 text-gold mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Shuttles Available</h3>
            <p className="text-gray-400">
              {selectedPickup || selectedDropoff || selectedCity
                ? 'No shuttles found with the selected filters. Try different options.'
                : 'Check back soon for new shuttles!'}
            </p>
            {selectedCity && (
              <button
                onClick={() => setSelectedCity(null)}
                className="mt-4 text-gold hover:text-gold/80 transition-colors"
              >
                Clear city filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRoutes).map(([date, routes]) => {
              return (
                <div key={date} className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden relative">
                  {/* Date Header */}
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Calendar className="text-gold" size={24} />
                      <div className="text-left">
                        <h2 className="text-xl font-bold text-white">
                          {formatDate(date)}
                        </h2>
                        <p className="text-gray-400">
                          {routes.length} {routes.length === 1 ? 'route' : 'routes'} available
                        </p>
                      </div>
                    </div>
                    {expandedDates.has(date) ? (
                      <ChevronUp className="text-gold" size={24} />
                    ) : (
                      <ChevronDown className="text-gold" size={24} />
                    )}
                  </button>

                  {/* Route Cards */}
                  {expandedDates.has(date) && (
                    <div className="divide-y divide-gray-800">
                      {routes.map((route: Route) => {
                        const isConfirmed = getActiveBookingCount(route.id) >= route.min_threshold;
                        return (
                          <div 
                            key={route.id} 
                            className="p-6 hover:bg-gray-800/50 transition-colors cursor-pointer relative"
                            onClick={() => navigateToRouteDetail(route.id)}
                          >
                            {/* Desktop View */}
                            <div className="hidden md:flex md:flex-row md:items-center md:justify-between">
                              {/* Route Info */}
                              <div className="flex-1 mb-4 md:mb-0 md:mr-8">
                                <div className="flex items-start space-x-4">
                                  <div className={`rounded-lg p-3 ${isConfirmed ? 'bg-green-500/20' : 'bg-gold/20'}`}>
                                    <Bus className={isConfirmed ? 'text-green-500' : 'text-gold'} size={24} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="text-xl font-bold text-white">
                                        {route.pickup?.name} to {route.dropoff?.name}
                                      </h3>
                                      {isConfirmed && (
                                        <span className="bg-green-500/20 text-green-500 text-sm font-medium px-2 py-0.5 rounded-full flex items-center">
                                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                          Confirmed
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-2 text-gray-300">
                                      <div className="flex items-center">
                                        <MapPin className="w-4 h-4 text-gold mr-2" />
                                        <span className="text-sm">Pickup: {route.pickup?.address}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <Clock className="w-4 h-4 text-gold mr-2" />
                                        <div className="flex flex-wrap items-center gap-2">
                                          {route.time_slots.map((time, index) => {
                                            const availableSeats = getTimeSlotAvailability(route.id, time);
                                            
                                            return (
                                              <div className="relative"
                                                key={index}
                                              >
                                                <div className="bg-gold/20 text-gold text-xs md:text-sm px-2 md:px-3 py-1 rounded-full hover:bg-gold/30 transition-colors">
                                                  {formatTime(time)}
                                                </div>
                                                <div className="absolute -top-2 -right-2 bg-gold text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                                  {availableSeats}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        <Users className="w-4 h-4 text-gold mr-2" />
                                        <span className="text-sm">Min {route.min_threshold} seats needed</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Price and Action */}
                              <div className="flex items-center justify-between md:flex-col md:items-end space-y-2">
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
                                        title: `${route.pickup?.name} to ${route.dropoff?.name} Shuttle`,
                                        text: `Join me on this shuttle from ${route.pickup?.name} to ${route.dropoff?.name}!`,
                                        url: url,
                                      });
                                    }
                                  }}
                                  className="bg-yellow-900/50 border border-yellow-500 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full hover:bg-yellow-800/50 transition-colors flex items-center self-end"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                    <polyline points="16 6 12 2 8 6"></polyline>
                                    <line x1="12" y1="2" x2="12" y2="15"></line>
                                  </svg>
                                  Share
                                </button>
                                <div className="text-right">
                                  <span className="text-2xl font-bold text-gold">${route.price}</span>
                                  <span className="text-gray-400 text-sm ml-1">/ person</span>
                                </div>
                                <button 
                                  className="bg-gold hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-colors flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToRouteDetail(route.id);
                                  }}
                                >
                                  Book Now
                                  <ArrowRight size={16} className="ml-2" />
                                </button>
                              </div>
                            </div>

                            {/* Mobile View - Completely Redesigned */}
                            <div className="md:hidden">
                              {/* Route Header with Icon and Title */}
                              <div className="flex items-center mb-3">
                                <div className={`rounded-lg p-2 mr-3 ${isConfirmed ? 'bg-green-500/20' : 'bg-gold/20'}`}>
                                  <Bus className={isConfirmed ? 'text-green-500' : 'text-gold'} size={20} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-bold text-white">
                                      {route.pickup?.name} to {route.dropoff?.name}
                                    </h3>
                                    {isConfirmed && (
                                      <span className="bg-green-500/20 text-green-500 text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center whitespace-nowrap">
                                        <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
                                        Confirmed
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-400">
                                    <MapPin className="w-3 h-3 text-gold mr-1" />
                                    <span className="truncate">{route.pickup?.address}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Time Slots in Grid */}
                              <div className="mb-3">
                                <div className="flex items-center mb-1">
                                  <Clock className="w-3 h-3 text-gold mr-1" />
                                  <span className="text-xs text-gray-400">Available Times:</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {route.time_slots.map((time, index) => {
                                    const availableSeats = getTimeSlotAvailability(route.id, time);
                                    
                                    return (
                                      <div className="relative" key={index}>
                                        <div className="bg-gold/20 text-gold text-xs px-1 py-1 rounded-full text-center">
                                          {formatTime(time)}
                                        </div>
                                        <div className="absolute -top-2 -right-1 bg-gold text-black text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                          {availableSeats}
                                        
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* Min Seats Needed */}
                              <div className="flex items-center mb-3">
                                <Users className="w-3 h-3 text-gold mr-1" />
                                <span className="text-xs text-gray-400">Min {route.min_threshold} seats needed</span>
                              </div>
                              
                              {/* Price and Book Now */}
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <span className="text-xl font-bold text-gold">${route.price}</span>
                                  <span className="text-gray-400 text-xs ml-1">/ person</span>
                                </div>
                                <button 
                                  className="bg-gold hover:bg-yellow-400 text-black font-bold py-1.5 px-4 rounded-lg transition-colors flex items-center text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToRouteDetail(route.id);
                                  }}
                                >
                                  Book Now
                                  <ArrowRight size={14} className="ml-1" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};