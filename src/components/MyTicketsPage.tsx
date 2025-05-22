import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { 
  Bus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  AlertTriangle,
  Loader2,
  Maximize2,
  X,
  ChevronRight,
  CheckCircle,
  ChevronLeft,
  XCircle,
  ShoppingBag,
  Ticket,
  Tag
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Ticket = {
  id: string;
  route_id: string;
  time_slot: string;
  quantity: number;
  total_price: number;
  status: string;
  booking_date: string;
  miles_redeemed: number | null;
  route: {
    date: string;
    time_slots: string[];
    price: number;
    max_capacity_per_slot: number;
    min_threshold: number;
    tickets_sold: number;
    status: string;
    pickup: { name: string; address: string; };
    dropoff: { name: string; address: string; };
  };
};

type DealBooking = {
  id: string;
  deal_id: string;
  quantity: number;
  total_price: number;
  status: string;
  booking_date: string;
  miles_redeemed: number | null;
  deal: {
    title: string;
    price: number;
    location_name: string;
    location_address: string;
    deal_date: string | null;
    deal_time: string | null;
    image_url: string | null;
  };
};
export const MyTicketsPage = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dealBookings, setDealBookings] = useState<DealBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [activeSection, setActiveSection] = useState<'shuttles' | 'deals'>('shuttles');
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQRInfo, setSelectedQRInfo] = useState(null);
  const [routeBookings, setRouteBookings] = useState<Record<string, number>>({});
  const [showRefunded, setShowRefunded] = useState(true);

  useEffect(() => {
    loadTickets();
    loadDealBookings();
  }, []);

  useEffect(() => {
    // Fetch actual booking counts for all routes
    const fetchActualBookings = async () => {
      try {
        // Get unique route IDs from tickets
        const routeIds = [...new Set(tickets.map(ticket => ticket.route_id))];
        
        if (routeIds.length === 0) return;
        
        // Fetch booking data for all routes
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('ticket_bookings')
          .select('route_id, quantity')
          .in('route_id', routeIds)
          .neq('status', 'refunded');

        if (bookingsError) throw bookingsError;

        // Calculate total tickets by summing quantities for each route
        const bookingsByRoute: Record<string, number> = {};
        bookingsData?.forEach(booking => {
          const routeId = booking.route_id;
          bookingsByRoute[routeId] = (bookingsByRoute[routeId] || 0) + (booking.quantity || 0);
        });
        
        setRouteBookings(bookingsByRoute);
      } catch (error) {
        console.error('Error fetching actual bookings:', error);
      }
    };

    if (tickets.length > 0) {
      fetchActualBookings();
    }
  }, [tickets]);

  const loadDealBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('deal_bookings')
        .select(`
          id,
          deal_id,
          quantity,
          total_price,
          status,
          booking_date,
          miles_redeemed,
          deal:deals (
            title,
            price,
            location_name,
            location_address,
            deal_date,
            deal_time,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'refunded') // Filter out refunded bookings
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;
      setDealBookings(bookingsData || []);
    } catch (err: any) {
      console.error('Error loading deal bookings:', err);
      setError(err.message || 'Failed to load deal bookings');
    }
  };

  const loadTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket_bookings')
        .select(`
          id,
          route_id,
          time_slot,
          quantity,
          total_price,
          status,
          booking_date,
          miles_redeemed,
          route:routes (
            date,
            time_slots,
            price,
            max_capacity_per_slot,
            min_threshold,
            tickets_sold,
            status,
            pickup:locations!routes_pickup_location_fkey (name, address),
            dropoff:locations!routes_dropoff_location_fkey (name, address)
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'refunded') // Filter out refunded tickets
        .order('booking_date', { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Handle dates with timezone information
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDealDate = (dateString: string | null) => {
    if (!dateString) return 'Any date';
    // Ensure we're working with a valid date by adding time component if needed
    const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    return new Date(dateWithTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDealTime = (timeString: string | null) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return timeString || '';
    }
  };

  const isUpcoming = (ticket: Ticket) => {
    const today = new Date();
    const ticketDate = new Date(ticket.route.date + 'T00:00:00');
    return ticketDate >= today;
  };

  const isDealUpcoming = (booking: DealBooking) => {
    if (!booking.deal.deal_date) return true; // If no date, consider it upcoming
    const today = new Date();
    const dealDate = new Date(booking.deal.deal_date + 'T00:00:00');
    return dealDate >= today;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-900/60 text-green-400';
      case 'completed':
        return 'bg-blue-900/60 text-blue-400';
      case 'cancelled':
        return 'bg-red-900/60 text-red-400';
      case 'refunded':
        return 'bg-purple-900/60 text-purple-400';
      case 'pending':
        return 'bg-yellow-900/60 text-yellow-400';
      default:
        return 'bg-gray-900/60 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      case 'refunded':
        return <XCircle size={16} />;
      case 'pending':
        return <Clock4 size={16} />;
      default:
        return null;
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    activeTab === 'upcoming' ? isUpcoming(ticket) : !isUpcoming(ticket)
  );

  const filteredDealBookings = dealBookings.filter(booking =>
    activeTab === 'upcoming' ? isDealUpcoming(booking) : !isDealUpcoming(booking)
  );

  const handleQRClick = (ticket, index) => {
    setSelectedQRInfo({
      id: ticket.id,
      number: index + 1,
      quantity: ticket.quantity
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
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              to="/"
              className="flex items-center mr-4 text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="ml-2 hidden sm:inline">Back</span>
            </Link>
            <h1 className="text-3xl font-bold text-gold">My Tickets</h1>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-gold text-black'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
              }`}
            >
              Upcoming Tickets
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                activeTab === 'past'
                  ? 'bg-gold text-black'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
              }`}
            >
              Past Tickets
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setActiveSection('shuttles')}
              className={`flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'shuttles'
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              <Bus className="w-4 h-4 mr-2" />
              Shuttle Tickets
            </button>
            <button
              onClick={() => setActiveSection('deals')}
              className={`flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'deals'
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              <Tag className="w-4 h-4 mr-2" />
              Deal Tickets
            </button>
          </div>

          {/* Tickets List */}
          {activeSection === 'shuttles' && filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-xl border border-gold/30">
              <Bus className="w-12 h-12 text-gold mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No {activeTab} tickets
              </h3>
              <p className="text-gray-400">
                {activeTab === 'upcoming' 
                  ? 'Browse available routes to book your next ride!'
                  : 'You haven\'t taken any rides yet.'}
              </p>
              {activeTab === 'upcoming' && (
                <Link
                  to="/shuttles"
                  className="inline-block mt-4 bg-gold hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Browse Routes
                </Link>
              )}
            </div>
          ) : (
            activeSection === 'shuttles' ? (
            <div className="space-y-6">
              {filteredTickets.map((ticket, index) => (
                <div 
                  key={ticket.id}
                  className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden hover:border-gold/50 transition-all"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="bg-gold/20 p-2 rounded-full mr-3">
                          <Bus className="text-gold" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {ticket.route.pickup.name} to {ticket.route.dropoff.name}
                          </h3>
                          <div className="flex items-center mt-1">
                            <Calendar className="text-gold mr-2" size={16} />
                            <span className="text-gray-300">
                              {formatDate(ticket.route.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-gold font-bold mt-2">
                          ${ticket.total_price.toFixed(2)}
                          {ticket.miles_redeemed ? ` | ${ticket.miles_redeemed} Miles` : ''}
                        </span>
                        
                        {/* Share button - only show for upcoming tickets */}
                        {isUpcoming(ticket) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/shuttles/${ticket.route_id}`;
                              navigator.clipboard.writeText(url);
                              
                              // Optional: Show a toast/notification that URL was copied
                              alert("Booking link copied to clipboard!");
                              
                              // Alternative: Use the Web Share API if available
                              if (navigator.share) {
                                navigator.share({
                                  title: `${ticket.route.pickup.name} to ${ticket.route.dropoff.name} Shuttle`,
                                  text: `Join me on this shuttle from ${ticket.route.pickup.name} to ${ticket.route.dropoff.name}!`,
                                  url: url,
                                });
                              }
                            }}
                            className="bg-yellow-900/50 border border-yellow-500 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full hover:bg-yellow-800/50 transition-colors flex items-center mt-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                              <polyline points="16 6 12 2 8 6"></polyline>
                              <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                            Share
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left Column: Location Details */}
                      <div className="md:col-span-2 space-y-4">
                        {/* Pickup */}
                        <div className="flex">
                          <div className="mr-3 flex flex-col items-center">
                            <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center">
                              <MapPin className="text-gold" size={16} />
                            </div>
                            <div className="w-0.5 h-8 bg-gray-700 my-1"></div>
                          </div>
                          <div>
                            <h4 className="font-medium text-white">Pickup</h4>
                            <p className="text-gray-400 text-sm">{ticket.route.pickup.address}</p>
                          </div>
                        </div>

                        {/* Dropoff */}
                        <div className="flex">
                          <div className="mr-3">
                            <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center">
                              <MapPin className="text-gold" size={16} />
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-white">Destination</h4>
                            <p className="text-gray-400 text-sm">{ticket.route.dropoff.address}</p>
                          </div>
                        </div>

                        {/* Time and Seats */}
                        <div className="flex items-center space-x-6 mt-4">
                          <div className="flex items-center">
                            <Clock className="text-gold mr-2" size={16} />
                            <span className="text-gray-300">
                              {formatTime(ticket.time_slot)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Users className="text-gold mr-2" size={16} />
                            <span className="text-gray-300">
                              {ticket.quantity} {ticket.quantity === 1 ? 'seat' : 'seats'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar for upcoming tickets that aren't confirmed */}
                        {isUpcoming(ticket) && (
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">
                                {(routeBookings[ticket.route_id] || ticket.route.tickets_sold) >= ticket.route.min_threshold 
                                  ? 'Shuttle Confirmed!' 
                                  : 'Progress to minimum required seats'}
                              </span>
                              <span className={`font-bold ${(routeBookings[ticket.route_id] || ticket.route.tickets_sold) >= ticket.route.min_threshold ? 'text-green-500' : 'text-gold'}`}>
                                {routeBookings[ticket.route_id] || ticket.route.tickets_sold}/{ticket.route.max_capacity_per_slot * ticket.route.time_slots.length} total seats
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 relative">
                              {/* Calculate total capacity */}
                              {(() => {
                                const totalCapacity = ticket.route.max_capacity_per_slot * ticket.route.time_slots.length;
                                const actualBookings = routeBookings[ticket.route_id] || ticket.route.tickets_sold;
                                const isConfirmed = actualBookings >= ticket.route.min_threshold;
                                
                                return (
                                  <>
                                    {/* Progress bar */}
                                    <div 
                                      className={`${isConfirmed ? 'bg-green-500' : 'bg-gold'} h-2 rounded-full transition-all duration-500`} 
                                      style={{ 
                                        width: `${Math.min(100, Math.round((actualBookings / totalCapacity) * 100))}%` 
                                      }}
                                    ></div>
                                    
                                    {/* Minimum threshold marker - line instead of circle */}
                                    <div 
                                      className="absolute -top-1 -bottom-1 w-1 bg-white"
                                      style={{
                                        left: `${Math.min(100, Math.round((ticket.route.min_threshold / totalCapacity) * 100))}%`,
                                        transform: 'translateX(-50%)'
                                      }}
                                    ></div>
                                    <div 
                                      className="absolute top-4 text-xs text-white bg-gray-700 px-1 rounded"
                                      style={{
                                        left: `${Math.min(100, Math.round((ticket.route.min_threshold / totalCapacity) * 100))}%`,
                                        transform: 'translateX(-50%)'
                                      }}
                                    >
                                      minimum {ticket.route.min_threshold} required
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex justify-between text-xs mt-1 mb-1">
                              <span className="text-gray-500">0 seats</span>
                              <span className="text-gray-500">{ticket.route.max_capacity_per_slot * ticket.route.time_slots.length} seats</span>
                            </div>
                            
                            {(routeBookings[ticket.route_id] || ticket.route.tickets_sold) < ticket.route.min_threshold && (
                              <p className="text-sm text-yellow-500 mt-1 flex items-start">
                                <AlertTriangle size={16} className="mr-1 flex-shrink-0 mt-0.5" />
                                {ticket.route.min_threshold - (routeBookings[ticket.route_id] || ticket.route.tickets_sold)} more seats needed for confirmation
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: QR Code */}
                      <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-4 relative">
                        <div className="w-full">
                          <Swiper
                            modules={[Pagination]}
                            pagination={{ clickable: true }}
                            spaceBetween={30}
                            slidesPerView={1}
                            className="qr-swiper"
                          >
                            {Array.from({ length: ticket.quantity }).map((_, index) => (
                              <SwiperSlide key={index}>
                                <div 
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => handleQRClick(ticket, index)}
                                >
                                  <QRCodeSVG
                                    value={`https://ulimo.com/verify/${ticket.id}/${index + 1}`}
                                    size={120}
                                    level="H"
                                    includeMargin
                                    className="bg-white p-2 rounded-lg mx-auto"
                                  />
                                  <p className="text-center text-sm text-gray-400 mt-2">
                                    Ticket {index + 1} of {ticket.quantity}
                                  </p>
                                  <p className="text-center text-xs text-gray-500">
                                    Tap to enlarge
                                  </p>
                                </div>
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end mt-6">
                      <Link
                        to={`/shuttles/${ticket.route_id}`}
                        className="flex items-center text-gold hover:text-gold/80 transition-colors"
                      >
                        View Route Details
                        <ChevronRight size={16} className="ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              filteredDealBookings.length === 0 ? (
                <div className="text-center py-12 bg-gray-900 rounded-xl border border-gold/30">
                  <Tag className="w-12 h-12 text-gold mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    No {activeTab} deal tickets
                  </h3>
                  <p className="text-gray-400">
                    {activeTab === 'upcoming' 
                      ? 'Browse available deals to book your next experience!'
                      : 'You haven\'t used any deal tickets yet.'}
                  </p>
                  {activeTab === 'upcoming' && (
                    <Link
                      to="/deals"
                      className="inline-block mt-4 bg-gold hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      Browse Deals
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredDealBookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden hover:border-gold/50 transition-all"
                    >
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                            <div className="bg-gold/20 p-2 rounded-full mr-3">
                              <Tag className="text-gold" size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {booking.deal.title}
                              </h3>
                              <div className="flex items-center mt-1">
                                <MapPin className="text-gold mr-2" size={16} />
                                <span className="text-gray-300">
                                  {booking.deal.location_name || 'Location not specified'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {booking.deal.deal_date && (
                              <span className="text-gray-300 text-sm mb-1">
                                {formatDealDate(booking.deal.deal_date)}
                                {booking.deal.deal_time && ` at ${formatDealTime(booking.deal.deal_time)}`}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1">
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Left Column: Deal Image */}
                          <div className="md:col-span-1">
                            <div className="relative h-32 rounded-lg overflow-hidden">
                              <img 
                                src={booking.deal.image_url || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
                                alt={booking.deal.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Right Column: Deal Details */}
                          <div className="md:col-span-2 flex flex-col justify-between">
                            <div className="space-y-3">
                              {booking.deal.location_address && (
                                <div className="flex items-start">
                                  <MapPin className="text-gold mr-2 mt-1" size={16} />
                                  <span className="text-gray-300 text-sm">{booking.deal.location_address}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <Users className="text-gold mr-2" size={16} />
                                <span className="text-gray-300">
                                  {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">Total paid:</span>
                                <span className="text-gold font-semibold">
                                  ${booking.total_price.toFixed(2)}
                                  {booking.miles_redeemed ? ` | ${booking.miles_redeemed} Miles` : ''}
                                </span>
                              </div>
                            </div>
                            
                            {/* Booking Date */}
                            <div className="mt-4 text-right">
                              {booking.booking_date && (
                                <span className="text-xs text-gray-500">
                                  Booked on {formatDate(booking.booking_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQRInfo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedQRInfo(null)}
        >
          <div 
            className="bg-white rounded-xl p-8 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <p className="text-gray-600 font-medium">
                Ticket {selectedQRInfo.number} of {selectedQRInfo.quantity}
              </p>
            </div>
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setSelectedQRInfo(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <QRCodeSVG
              value={`https://ulimo.com/verify/${selectedQRInfo.id}/${selectedQRInfo.number}`}
              size={280}
              level="H"
              includeMargin
              className="mx-auto"
            />
            <p className="text-center text-gray-600 mt-4">
              Show this QR code to the driver
            </p>
          </div>
        </div>
      )}
    </div>
  );
};