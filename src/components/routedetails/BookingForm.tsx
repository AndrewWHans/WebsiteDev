import React, { useState, useEffect } from 'react';
import { Minus, Plus, Loader2, Check, Share2, AlertTriangle, Wallet, CreditCard, Wind, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust path as needed
import { motion } from 'framer-motion';
import { PaymentLoadingModal } from './PaymentLoadingModal';

// Add interface for booking details
interface BookingDetails {
  id: string;
  route: string;
  date: string;
  time: string;
  quantity: number;
  price: number;
  total: number;
  paymentMethod: string;
}

type BookingFormProps = {
  route: {
    id: string;
    price: number;
    min_threshold: number;
    time_slots: string[];
    pickup?: { name: string } | null;
    dropoff?: { name: string } | null;
    tickets_sold: number;
    date: string;
  };
  user: any;
  userCredits: number;
  userMiles: number;
  selectedTimeSlot: string | null;
  setSelectedTimeSlot: (slot: string) => void;
  selectedQuantity: number;
  handleQuantityChange: (change: number) => void;
  availableSeats: {[key: string]: number};
  getAvailableSeats: () => number;
  calculateTotal: () => number;
  bookingStatus: 'idle' | 'checking' | 'processing' | 'success' | 'error';
  setBookingStatus: (status: 'idle' | 'checking' | 'processing' | 'success' | 'error') => void;
  bookingError: string | null;
  handleBookNow: () => void;
  handleShareRoute: () => void;
  formatTime: (timeString: string) => string;
  isConfirmed: boolean;
  selectedPaymentMethod: 'wallet' | 'card';
  setSelectedPaymentMethod: (method: 'wallet' | 'card') => void;
  onSignIn: () => void;
  loadRouteDetails: () => void;
  setShowSuccessModal: (show: boolean) => void;
  triggerConfetti: () => void;
  bookingDetails: BookingDetails | null;
  setBookingDetails: (details: BookingDetails | null) => void;
};

// Add this constant near the top of the file with other constants/state declarations
const EPSILON = 0.001;

export const BookingForm: React.FC<BookingFormProps> = ({
  route,
  user,
  userCredits,
  userMiles,
  selectedTimeSlot,
  setSelectedTimeSlot,
  selectedQuantity,
  handleQuantityChange,
  availableSeats,
  getAvailableSeats,
  calculateTotal,
  bookingStatus,
  setBookingStatus,
  bookingError,
  handleBookNow: originalHandleBookNow,
  handleShareRoute,
  formatTime,
  isConfirmed,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onSignIn,
  loadRouteDetails,
  setShowSuccessModal,
  triggerConfetti,
  bookingDetails,
  setBookingDetails
}) => {
  const [processingPayment, setProcessingPayment] = React.useState(false);
  const [paymentMessage, setPaymentMessage] = React.useState('');
  const [showPaymentLoading, setShowPaymentLoading] = React.useState(false);
  const [milesValue, setMilesValue] = useState<number>(0.02);
  const [milesAmount, setMilesAmount] = useState<number>(0);
  const [milesDiscount, setMilesDiscount] = useState<number>(0);
  const [applyingMiles, setApplyingMiles] = useState<boolean>(false);
  const [milesApplied, setMilesApplied] = useState<boolean>(false);
  const [processingMilesPayment, setProcessingMilesPayment] = useState<boolean>(false);

  // Format date helper function
  const formatDate = (dateString: string) => {
    // Ensure we're working with a valid date by adding time component if needed
    const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    return new Date(dateWithTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Load miles value from system settings
  useEffect(() => {
    const loadMilesValue = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'point_value')
          .single();
          
        if (error) throw error;
        if (data) {
          setMilesValue(parseFloat(data.value));
        }
      } catch (err) {
        console.error('Error loading miles value:', err);
      }
    };
    
    loadMilesValue();
  }, []);
  
  // Calculate miles discount when miles amount changes
  useEffect(() => {
    const discount = milesAmount * milesValue;
    setMilesDiscount(discount);
  }, [milesAmount, milesValue]);
  
  // Reset miles when quantity or time slot changes
  useEffect(() => {
    if (milesApplied) {
      setMilesApplied(false);
      setMilesAmount(0);
      setMilesDiscount(0);
    }
  }, [selectedQuantity, selectedTimeSlot]);

  // Reset payment state when component unmounts or when URL changes
  React.useEffect(() => {
    // Listen for popstate event (browser back/forward button)
    const handlePopState = () => {
      setShowPaymentLoading(false);
      setProcessingPayment(false);
      setPaymentMessage('');
    };

    window.addEventListener('popstate', handlePopState);
    
    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Add this useEffect to disable mouse wheel scrolling on number inputs
  React.useEffect(() => {
    // Function to prevent scroll wheel from changing number input values
    const preventScrollWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.type === 'number') {
        target.blur();
      }
    };

    // Add event listener
    document.addEventListener('wheel', preventScrollWheel, { capture: true });
    
    // Cleanup
    return () => {
      document.removeEventListener('wheel', preventScrollWheel, { capture: true });
    };
  }, []);

  // Update time slot selection when available seats change
  React.useEffect(() => {
    if (Object.keys(availableSeats).length > 0 && !selectedTimeSlot) {
      // Sort time slots chronologically
      const sortedTimeSlots = [...route.time_slots].sort((a, b) => {
        const timeA = a.split(':').map(Number);
        const timeB = b.split(':').map(Number);
        return timeA[0] !== timeB[0] ? timeA[0] - timeB[0] : timeA[1] - timeB[1];
      });
      
      // Find the first time slot with available seats
      const firstAvailableSlot = sortedTimeSlots.find(slot => 
        availableSeats[slot] && availableSeats[slot] > 0
      );
      
      // If found, select it
      if (firstAvailableSlot) {
        setSelectedTimeSlot(firstAvailableSlot);
      }
    }
  }, [availableSeats, route.time_slots, selectedTimeSlot, setSelectedTimeSlot]);
  const handleStripeCheckout = async () => { 
    if (!user || !selectedTimeSlot) return;
    
    setShowPaymentLoading(true);
    setProcessingPayment(true);
    setPaymentMessage('Processing your payment...');
    
    try {
      // Format the date for display in the UI
      const routeDate = new Date(route.date);
      const formattedDate = routeDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      // Call the Edge Function to create Stripe checkout session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            routeId: route.id,
            timeSlot: selectedTimeSlot,
            quantity: selectedQuantity,
            milesAmount: milesApplied ? milesAmount : 0,
            milesDiscount: milesApplied ? milesDiscount : 0
          }),
        }
      );

      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (!url) throw new Error('No checkout URL received');

      // Wait for animation to complete (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Store state in sessionStorage before redirecting
      sessionStorage.setItem('paymentInProgress', 'true');
      
      // Redirect to Stripe checkout
      window.location.href = url;

    } catch (error) {
      console.error('Payment error:', error);
      setShowPaymentLoading(false);
      setPaymentMessage('An error occurred. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleApplyMiles = async () => {
    if (!user || milesAmount <= 0) return;
    
    setApplyingMiles(true);
    
    try {
      // Validate miles amount
      if (milesAmount > userMiles) {
        throw new Error(`You only have ${userMiles} miles available`);
      }
      
      // Calculate discount
      const discount = milesAmount * milesValue;
      
      // Calculate total
      const total = calculateTotal();
      
      // Check if discount approximately equals total (full payment)
      const isFullPayment = Math.abs(discount - total) < EPSILON;
      
      // Modified validation for partial payments
      if (!isFullPayment) {
        const remainingAmount = total - discount;
        if (remainingAmount > 0 && remainingAmount < 0.50) {
          // Calculate the maximum miles that can be applied while keeping the total at least $0.50
          const maxAllowedDiscount = total - 0.50;
          const maxAllowedMiles = Math.floor(maxAllowedDiscount / milesValue);
          
          throw new Error(`For partial payment, please use ${maxAllowedMiles} miles or less to keep the card payment at least $0.50, or use enough miles to cover the full amount.`);
        }
      }
      
      // Set miles discount
      setMilesDiscount(discount);
      setMilesApplied(true);
    } catch (error: any) {
      console.error('Error applying miles:', error);
      setPaymentMessage(error.message);
    } finally {
      setApplyingMiles(false);
    }
  };
  
  const handleRemoveMiles = () => {
    setMilesApplied(false);
    setMilesAmount(0);
    setMilesDiscount(0);
  };
  
  const getDiscountedTotal = () => {
    const total = calculateTotal();
    return milesApplied ? Math.max(0, total - milesDiscount) : total;
  };

  const handleMilesOnlyPayment = async () => {
    if (!user || !selectedTimeSlot) return;
    
    setProcessingMilesPayment(true);
    setPaymentMessage('Processing your miles payment...');
    
    try {
      // Use a local variable to track status instead of calling setBookingStatus directly
      const updateBookingStatus = (status: 'idle' | 'checking' | 'processing' | 'success' | 'error') => {
        if (typeof setBookingStatus === 'function') {
          setBookingStatus(status);
        }
      };
      
      // Set booking status to processing
      updateBookingStatus('processing');
      
      // Validate miles amount
      if (milesAmount > userMiles) {
        throw new Error(`You only have ${userMiles} miles available`);
      }
      
      // Calculate total price
      const totalPrice = calculateTotal();
      
      // Ensure miles discount covers the total
      if (milesDiscount < totalPrice) {
        throw new Error(`Miles discount (${milesDiscount.toFixed(2)}) doesn't cover total (${totalPrice.toFixed(2)})`);
      }
      
      // Create ticket booking
      const { data: bookingResponse, error: bookingError } = await supabase
        .from('ticket_bookings')
        .insert({
          user_id: user.id,
          route_id: route.id,
          time_slot: selectedTimeSlot,
          quantity: selectedQuantity,
          total_price: 0, // Free because fully covered by miles
          status: 'confirmed',
          booking_date: new Date().toISOString(),
          miles_redeemed: milesAmount
        })
        .select('id')
        .single();
      
      if (bookingError) throw bookingError;
      
      // Redeem miles
      const { error: milesError } = await supabase.rpc('redeem_miles', {
        p_user_id: user.id,
        p_miles_amount: milesAmount,
        p_description: `Miles redeemed for ticket purchase: ${route.pickup?.name} to ${route.dropoff?.name}`,
        p_reference_id: bookingResponse.id
      });
      
      if (milesError) throw milesError;
      
      // Update route's tickets_sold count
      const { error: routeUpdateError } = await supabase
        .from('routes')
        .update({ tickets_sold: route.tickets_sold + selectedQuantity })
        .eq('id', route.id);
      
      if (routeUpdateError) throw routeUpdateError;
      
      // Create booking details for success modal
      setBookingDetails({
        id: bookingResponse.id,
        route: `${route.pickup?.name || ''} to ${route.dropoff?.name || ''}`,
        date: route.date, // Pass the raw date to allow proper formatting in the modal
        time: formatTime(selectedTimeSlot),
        quantity: selectedQuantity,
        price: route.price,
        total: 0, // Free because fully covered by miles
        paymentMethod: 'miles'
      });
      
      // Handle success
      updateBookingStatus('success');
      setShowSuccessModal(true);
      
      // Trigger confetti effect
      triggerConfetti();
      
      // Reload route details to update metrics
      loadRouteDetails();
      
    } catch (error: any) {
      console.error('Error processing miles payment:', error);
      setPaymentMessage(error.message || 'Failed to process miles payment. Please try again.');
      
      // Use the helper function for error status too
      if (typeof setBookingStatus === 'function') {
        setBookingStatus('error');
      }
    } finally {
      setProcessingMilesPayment(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      onSignIn();
      return;
    }
    
    // If miles fully cover the total, process directly without Stripe
    if (milesApplied && milesDiscount >= calculateTotal()) {
      handleMilesOnlyPayment();
      return;
    }
    
    if (selectedPaymentMethod === 'card') {
      handleStripeCheckout();
    } else {
      originalHandleBookNow();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-gray-900 rounded-xl border border-gold/30 sticky top-4"
    >
      <div className="p-4 sm:p-6 border-b border-gray-800">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Book Your Tickets</h2>
        
        {/* Time slot selection */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Selected Time
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-3">
            {[...route.time_slots]
              .sort((a, b) => {
                // Convert time strings to comparable values
                const timeA = a.split(':').map(Number);
                const timeB = b.split(':').map(Number);
                
                // Compare hours first
                if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                // If hours are the same, compare minutes
                return timeA[1] - timeB[1];
              })
              .map((timeSlot, index) => {
                const seatsAvailable = availableSeats[timeSlot] || 0;
                const isDisabled = seatsAvailable === 0;
                
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={index}
                    className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${
                      selectedTimeSlot === timeSlot
                        ? 'bg-gold text-black font-bold'
                        : isDisabled 
                          ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={() => !isDisabled && setSelectedTimeSlot(timeSlot)}
                    disabled={isDisabled}
                  >
                    <span className="text-xs sm:text-sm">{formatTime(timeSlot)}</span>
                    <div className={`absolute -top-2 -right-2 text-[10px] sm:text-xs ${
                      seatsAvailable > 0 ? 'bg-black text-gold' : 'bg-gray-800 text-gray-500'
                    } font-bold w-auto min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 rounded-full flex items-center justify-center border ${
                      seatsAvailable > 0 ? 'border-gold/50' : 'border-gray-700'
                    }`}>
                      {seatsAvailable} left
                    </div>
                  </motion.button>
                );
              })}
          </div>
        </div>
        
        {/* Quantity selection */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Number of Tickets
          </label>
          <div className="flex items-center flex-wrap">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuantityChange(-1)}
              disabled={selectedQuantity <= 1 || bookingStatus === 'processing'}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-l-lg bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus size={16} />
            </motion.button>
            <div className="h-8 sm:h-10 px-3 sm:px-4 bg-gray-800 flex items-center justify-center text-white font-medium border-x border-gray-700 text-sm sm:text-base">
              {selectedQuantity}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuantityChange(1)}
              disabled={selectedQuantity >= getAvailableSeats() || bookingStatus === 'processing'}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-r-lg bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </motion.button>
            
            <div className="ml-3 text-gray-300 text-xs sm:text-sm">
              <span className="text-gold font-bold">{getAvailableSeats()}</span> 
              <span className="hidden xs:inline"> seats available</span>
              <span className="xs:hidden"> available</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Payment Method
          </label>
          <div className="space-y-3">
            {/* Card Payment Option */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedPaymentMethod('card')}
              className={`w-full bg-gray-800 p-3 rounded-lg border ${
                selectedPaymentMethod === 'card' 
                  ? 'border-gold' 
                  : 'border-gray-700'
              } flex items-center hover:border-gold/50 transition-colors`}
            >
              <div className="bg-emerald-500/20 p-1.5 sm:p-2 rounded-full mr-2 sm:mr-3">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm sm:text-base">Pay with Card</p>
                <p className="text-xs sm:text-sm text-gray-400">Secure via Stripe</p>
              </div>
            </motion.button>
          </div>
        </div>
        
        {/* Miles Redemption Section */}
        <div className="mb-4 sm:mb-6 bg-gray-800/80 rounded-lg p-3 sm:p-4 border border-gold/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-gold/20 p-1.5 sm:p-2 rounded-full mr-2 sm:mr-3">
                <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
              </div>
              <div>
                <p className="text-white font-medium text-sm sm:text-base">ULimo Miles</p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Balance: <span className="text-gold">{userMiles}</span> miles
                </p>
              </div>
            </div>
          </div>
          
          {milesApplied ? (
            <div className="mt-2 sm:mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-xs sm:text-sm">Miles applied:</span>
                <span className="text-gold font-medium text-xs sm:text-sm">{milesAmount.toLocaleString()} miles</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-300 text-xs sm:text-sm">Discount:</span>
                <span className="text-emerald-400 font-medium text-xs sm:text-sm">
                  -${milesDiscount.toFixed(2)}
                  {milesDiscount >= calculateTotal()}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRemoveMiles}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
              >
                Remove Miles
              </motion.button>
            </div>
          ) : (
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <input
                  type="number"
                  min="0"
                  max={userMiles}
                  value={milesAmount || ''}
                  onChange={(e) => setMilesAmount(parseInt(e.target.value) || 0)}
                  className="block w-full bg-gray-700 border border-gray-600 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-white text-sm focus:ring-1 focus:ring-gold focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter miles amount"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Calculate the maximum miles that can be applied based on the total price
                    const totalPrice = calculateTotal();
                    const maxApplicableMiles = Math.floor(totalPrice / milesValue);
                    
                    // If partial payment would result in less than $0.50 remaining, adjust the max miles
                    const minRemainingForStripe = 0.50;
                    let adjustedMaxMiles = maxApplicableMiles;
                    
                    // If applying all miles would leave less than $0.50 but not cover the full amount
                    const remainingAfterMaxMiles = totalPrice - (maxApplicableMiles * milesValue);
                    if (remainingAfterMaxMiles > 0 && remainingAfterMaxMiles < minRemainingForStripe) {
                      // Either use enough miles to make it free, or keep at least $0.50 for Stripe
                      if (userMiles >= Math.ceil(totalPrice / milesValue)) {
                        // User has enough miles to cover the full amount
                        adjustedMaxMiles = Math.ceil(totalPrice / milesValue);
                      } else {
                        // Adjust to keep at least $0.50 for Stripe
                        adjustedMaxMiles = Math.floor((totalPrice - minRemainingForStripe) / milesValue);
                      }
                    }
                    
                    // Use the smaller of user's miles balance or adjusted max applicable miles
                    const maxMiles = Math.min(userMiles, adjustedMaxMiles);
                    setMilesAmount(maxMiles);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap"
                >
                  Max
                </motion.button>
              </div>
              
              {milesAmount > 0 && (
                <div className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                  {milesAmount} miles = ${(milesAmount * milesValue).toFixed(2)} discount
                </div>
              )}
              
              {/* Add warning message for invalid miles amount */}
              {milesAmount > 0 && 
               calculateTotal() - (milesAmount * milesValue) > 0 && 
               calculateTotal() - (milesAmount * milesValue) < 0.50 && (
                <div className="text-xs sm:text-sm text-amber-400 mb-2 sm:mb-3 flex items-start">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span>Discounted total must be at least $0.50 or cover the full amount</span>
                </div>
              )}
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleApplyMiles}
                disabled={
                  milesAmount <= 0 || 
                  milesAmount > userMiles || 
                  applyingMiles ||
                  (Math.abs(milesAmount * milesValue - calculateTotal()) > EPSILON &&
                   calculateTotal() - (milesAmount * milesValue) > 0 && 
                   calculateTotal() - (milesAmount * milesValue) < 0.50)
                }
                className="w-full bg-gold hover:bg-yellow-400 text-black py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {applyingMiles ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Miles'
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
      
      {/* Price summary */}
      <div className="p-4 sm:p-6 border-b border-gray-800">
        <div className="flex justify-between mb-1 sm:mb-2">
          <span className="text-gray-300 text-sm">Price per ticket</span>
          <span className="text-white text-sm">${route.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1 sm:mb-2">
          <span className="text-gray-300 text-sm">Quantity</span>
          <span className="text-white text-sm">x {selectedQuantity}</span>
        </div>
        {milesApplied && (
          <div className="flex justify-between mb-1 sm:mb-2">
            <span className="text-gray-300 text-sm">Miles Discount</span>
            <span className="text-emerald-400 text-sm">-${milesDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base sm:text-lg font-bold mt-3 sm:mt-4">
          <span className="text-white">Total</span>
          <span className="text-gold">${getDiscountedTotal().toFixed(2)}</span>
        </div>
      </div>
      
      {/* Booking Error */}
      {(bookingError || paymentMessage) && (
        <div className="px-4 sm:px-6 pt-3 sm: