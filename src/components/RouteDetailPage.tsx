import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

// Import our new components
import { RouteHeader } from './routedetails/RouteHeader';
import { RouteDetails } from './routedetails/RouteDetails';
import { PassengersList } from './routedetails/PassengersList';
import { BookingForm } from './routedetails/BookingForm';
import { SuccessModal } from './routedetails/SuccessModal';
import { AuthModal } from '../components/AuthModal';
import { DealCard } from './deals/DealCard';
import { DealDetailModal } from './deals/DealDetailModal';
import { RelatedDeals } from './routedetails/RelatedDeals';

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
  city?: string;
};

type BookingStatus = 'idle' | 'checking' | 'processing' | 'success' | 'error';

export const RouteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [passengerProfiles, setPassengerProfiles] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number>(0); // Keep for backward compatibility
  const [userMiles, setUserMiles] = useState<number>(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [availableSeats, setAvailableSeats] = useState<{[key: string]: number}>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'card'>('card');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeBookings, setActiveBookings] = useState<number>(0);

  useEffect(() => {
    // Check if we're returning from Stripe checkout
    const paymentInProgress = sessionStorage.getItem('paymentInProgress');
    if (paymentInProgress) {
      // Clear the flag
      sessionStorage.removeItem('paymentInProgress');
    }
    
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser) {
        loadUserCredits(currentUser.id);
        loadUserMiles(currentUser.id);
      }
    });

    loadRouteDetails();
  }, [id]);

  const loadUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserCredits(data?.balance || 0);
    } catch (err) {
      console.error('Error loading user credits:', err);
    }
  };

  const loadUserMiles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_points')
        .select('points')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserMiles(data?.points || 0);
    } catch (err) {
      console.error('Error loading user miles:', err);
    }
  };

  const loadRouteDetails = async () => {
    try {
      if (!id) {
        setError('No route ID provided');
        setLoading(false);
        return;
      }

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
          pickup:locations!routes_pickup_location_fkey (name, address),
          dropoff:locations!routes_dropoff_location_fkey (name, address),
          city
        `)
        .eq('id', id)
        .single();

      if (routeError) throw routeError;
      if (!routeData) throw new Error('Route not found');

      // Get active bookings count (excluding refunded)
      const { count, error: bookingsCountError } = await supabase
        .from('ticket_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('route_id', id)
        .neq('status', 'refunded');
      
      if (bookingsCountError) throw bookingsCountError;
      
      // Update active bookings count
      setActiveBookings(count || 0);
      
      // If the route's tickets_sold doesn't match active bookings, we need to update it
      if (routeData.tickets_sold !== count) {
        // This is just for the local state - the actual DB update should happen server-side
        routeData.tickets_sold = count || 0;
      }
      
      setRoute(routeData);
      

      // Load available seats for each time slot
      const seatsInfo: {[key: string]: number} = {};
      for (const slot of routeData.time_slots) {
        const { data: bookingsData } = await supabase
          .from('ticket_bookings')
          .select('quantity')
          .eq('route_id', id)
          .eq('time_slot', slot)
          .neq('status', 'refunded')
          .eq('status', 'confirmed');
        
        const bookedSeats = bookingsData?.reduce((total, booking) => total + booking.quantity, 0) || 0;
        seatsInfo[slot] = routeData.max_capacity_per_slot - bookedSeats;
      }
      setAvailableSeats(seatsInfo);

      // Sort time slots chronologically and select the first one with available seats
      if (routeData.time_slots && routeData.time_slots.length > 0) {
        const sortedTimeSlots = [...routeData.time_slots].sort((a, b) => {
          // Convert time strings to comparable values (assuming format is HH:MM:SS)
          const timeA = a.split(':').map(Number);
          const timeB = b.split(':').map(Number);
          
          // Compare hours first
          if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
          // If hours are the same, compare minutes
          return timeA[1] - timeB[1];
        });
        
        // Find the first time slot with available seats
        const firstAvailableSlot = sortedTimeSlots.find(slot => seatsInfo[slot] > 0);
        
        // If found, select it; otherwise, select the first time slot
        setSelectedTimeSlot(firstAvailableSlot || sortedTimeSlots[0]);
      }
      // Fetch mock passenger profiles (for display purposes)
      if (count > 0) {
        // Simulate passenger data for demo purposes
        const mockProfiles = Array.from({ length: Math.min(count, 8) }, (_, i) => ({
          id: `profile-${i}`,
          initial: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
          color: getRandomColor()
        }));
        setPassengerProfiles(mockProfiles);
      }
    } catch (err: any) {
      console.error('Error loading route details:', err);
      setError(err.message || 'Failed to load route details');
    } finally {
      setLoading(false);
    }
  };

  const getRandomColor = () => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-red-500', 'bg-yellow-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
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

  const handleQuantityChange = (change: number) => {
    const newQuantity = selectedQuantity + change;
    if (selectedTimeSlot) {
      const maxAvailable = availableSeats[selectedTimeSlot] || 0;
      if (newQuantity >= 1 && newQuantity <= maxAvailable) {
        setSelectedQuantity(newQuantity);
      }
    }
  };

  const getAvailableSeats = () => {
    if (!selectedTimeSlot) return 0;
    return availableSeats[selectedTimeSlot] || 0;
  };

  const calculateTotal = () => {
    if (!route) return 0;
    return route.price * selectedQuantity;
  };

  const triggerConfetti = () => {
    // Create a colorful confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffffff', '#FFC107', '#FFEB3B', '#ffffff', '#4CAF50']
    });

    // Add a second burst after a slight delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ffffff', '#FFA000', '#F57F17']
      });
    }, 200);

    // Add a third burst from the right
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ffffff', '#FFA000', '#F57F17']
      });
    }, 400);
  };

  const handleBookNow = async () => {
    if (!user) {
      // If not logged in, we should redirect to login or show login modal
      setShowAuthModal(true);
      return;
    }

    if (!selectedTimeSlot) {
      alert('Please select a time slot');
      return;
    }

    if (!route) {
      alert('Route information is missing');
      return;
    }

    // Start booking process
    if (selectedPaymentMethod === 'card') {
      // Handle card payment flow (to be implemented)
      alert('Card payment will be implemented in the next step');
      return;
    }

    setBookingStatus('checking');
    setBookingError(null);

    try {
      // Check if user has enough credits
      const totalPrice = calculateTotal();
      
      if (userCredits < totalPrice) {
        setBookingError(`Insufficient credits. You need $${totalPrice.toFixed(2)} but have $${userCredits.toFixed(2)}`);
        setBookingStatus('error');
        return;
      }
      
      // Check if there are enough seats available
      if (getAvailableSeats() < selectedQuantity) {
        setBookingError(`Only ${getAvailableSeats()} seats available for this time slot.`);
        setBookingStatus('error');
        return;
      }
      
      // Start processing the booking
      setBookingStatus('processing');
      
      // Create booking in database
      const { data: bookingResponse, error: bookingError } = await supabase
        .from('ticket_bookings')
        .insert({
          user_id: user.id,
          route_id: route.id,
          time_slot: selectedTimeSlot,
          quantity: selectedQuantity,
          total_price: totalPrice,
          status: 'confirmed',
          booking_date: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (bookingError) throw bookingError;
      
      // Deduct credits from user's wallet
      const { error: walletError } = await supabase
        .from('wallet_credits')
        .update({ balance: userCredits - totalPrice })
        .eq('user_id', user.id);
      
      if (walletError) throw walletError;
      
      // Update route's tickets_sold count
      const { error: routeUpdateError } = await supabase
        .from('routes')
        .update({ tickets_sold: route.tickets_sold + selectedQuantity })
        .eq('id', route.id);
      
      if (routeUpdateError) throw routeUpdateError;
      
      // Update local state with new user credits
      setUserCredits(userCredits - totalPrice);
      
      // Create booking details for success modal
      setBookingDetails({
        id: bookingResponse.id,
        route: `${route.pickup?.name} to ${route.dropoff?.name}`,
        date: formatDate(route.date),
        time: formatTime(selectedTimeSlot),
        quantity: selectedQuantity,
        price: route.price,
        total: totalPrice
      });
      
      // Handle success
      setBookingStatus('success');
      setShowSuccessModal(true);
      
      // Trigger confetti effect
      triggerConfetti();
      
      // Reload route details to update metrics
      loadRouteDetails();
      
    } catch (err: any) {
      console.error('Error booking ticket:', err);
      setBookingError(err.message || 'Failed to book ticket. Please try again.');
      setBookingStatus('error');
    }
  };

  const handleShareRoute = () => {
    if (navigator.share) {
      navigator.share({
        title: `ULimo: ${route?.pickup?.name} to ${route?.dropoff?.name}`,
        text: `Join me on ULimo's party bus from ${route?.pickup?.name} to ${route?.dropoff?.name} on ${formatDate(route?.date || '')}!`,
        url: window.location.href,
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  // Add this function to handle successful authentication
  const handleAuthSuccess = (newUser: any) => {
    setUser(newUser);
    if (newUser) {
      loadUserCredits(newUser.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="min-h-screen bg-black py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link to="/shuttles" className="inline-flex items-center text-gold hover:text-gold/80 mb-6">
            <ArrowLeft size={20} className="mr-2" />
            Back to Shuttles
          </Link>
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Shuttle Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The requested shuttle does not exist or has been removed.'}</p>
            <Link to="/shuttles" className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors inline-block">
              Browse Available Shuttles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min(100, Math.round((activeBookings / route.min_threshold) * 100));
  const isConfirmed = activeBookings >= route.min_threshold;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black py-6 sm:py-12 px-3 sm:px-4"
    >
      <div className="container mx-auto max-w-4xl px-0 sm:px-4">
        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
        <Link to="/shuttles" className="inline-flex items-center text-gold hover:text-gold/80 mb-4 sm:mb-6 transition-transform hover:-translate-x-1 text-sm sm:text-base">
          <ArrowLeft size={20} className="mr-2" />
          Back to Shuttles
        </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative">
          {/* Left Column: Header + Route Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Section */}
            <RouteHeader 
              route={route}
              formatDate={formatDate}
              progressPercentage={progressPercentage}
              isConfirmed={isConfirmed}
              activeBookings={activeBookings}
            />

            {/* Locations Section */}
            <RouteDetails 
              pickup={route.pickup}
              dropoff={route.dropoff}
            />
            
            {/* Other Passengers */}
            <PassengersList 
              passengerProfiles={passengerProfiles}
              totalPassengers={activeBookings}
            />
            
            {/* Related Deals Section */}
            <RelatedDeals city={route.city} routeId={route.id} user={user} />
          </div>
          
          {/* Right Column: Booking Options */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 relative z-10">
            {/* Booking Card */}
            <BookingForm
              route={route}
              user={user}
              userCredits={userCredits}
              userMiles={userMiles}
              selectedTimeSlot={selectedTimeSlot}
              setSelectedTimeSlot={setSelectedTimeSlot}
              selectedQuantity={selectedQuantity}
              handleQuantityChange={handleQuantityChange}
              availableSeats={availableSeats}
              getAvailableSeats={getAvailableSeats}
              calculateTotal={calculateTotal}
              bookingStatus={bookingStatus}
              bookingError={bookingError}
              handleBookNow={handleBookNow}
              handleShareRoute={handleShareRoute}
              formatTime={formatTime}
              isConfirmed={isConfirmed}
              selectedPaymentMethod={selectedPaymentMethod}
              setSelectedPaymentMethod={setSelectedPaymentMethod}
              onSignIn={() => setShowAuthModal(true)}
              setBookingDetails={setBookingDetails}
              setShowSuccessModal={setShowSuccessModal}
              triggerConfetti={triggerConfetti}
              loadRouteDetails={loadRouteDetails}
            />
          </div>
        </div>
      </div>

      {/* Auth Modal - Update to include onAuthSuccess */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        bookingDetails={bookingDetails}
      />
    </motion.div>
  );
};

export default RouteDetailPage;