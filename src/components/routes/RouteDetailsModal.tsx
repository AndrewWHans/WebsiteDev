import React, { useState, useEffect } from 'react';
import { X, Users, Clock, DollarSign, Calendar, CheckCircle, XCircle, Clock4, CreditCard, Wallet, RefreshCw, AlertTriangle, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type RouteDetailsModalProps = {
  routeId: string;
  onClose: () => void;
  onArchive?: (id: string, status: string) => void;
};

type BookingData = {
  id: string;
  user: {
    email: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
  };
  time_slot: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  payment_method: 'wallet' | 'card';
  discount_code?: string;
  discount_amount?: number;
  discount_type?: string;
  promoter_username?: string;
};

type TimeSlotMetrics = {
  [key: string]: {
    sold: number;
    available: number;
    revenue: number;
  };
};

export const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({ routeId, onClose, onArchive }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [route, setRoute] = useState<any>(null);
  const [timeSlotMetrics, setTimeSlotMetrics] = useState<TimeSlotMetrics>({});
  const [checkoutSessions, setCheckoutSessions] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [remainingToThreshold, setRemainingToThreshold] = useState<number>(0);
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundedCount, setRefundedCount] = useState<number>(0);
  const [isPastRoute, setIsPastRoute] = useState<boolean>(false);
  const [discountCodeSummary, setDiscountCodeSummary] = useState<{[key: string]: {tickets: number, revenue: number}}>({});

  useEffect(() => {
    loadRouteDetails();
  }, [routeId]);

  const loadRouteDetails = async () => {
    try {
      // Load route details
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          *,
          pickup:locations!routes_pickup_location_fkey (name, address),
          dropoff:locations!routes_dropoff_location_fkey (name, address)
        `)
        .eq('id', routeId)
        .single();

      if (routeError) throw routeError;
      setRoute(routeData);
      
      // Check if route is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const routeDate = new Date(routeData.date + 'T00:00:00');
      setIsPastRoute(routeDate < today);

      // Load bookings with user details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('ticket_bookings')
        .select(`
          id,
          user_id,
          user:profiles!ticket_bookings_user_id_fkey (
            id,
            email,
            name,
            first_name,
            last_name
          ),
          time_slot,
          quantity,
          total_price,
          discount_code,
          discount_amount,
          discount_type,
          status,
          created_at,
          stripe_payment_intent_id
        `)
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get promoter usernames for bookings with discount codes
      const bookingsWithPromoters = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          if (booking.discount_code) {
            try {
              const { data: referralCode, error: referralError } = await supabase
                .from('referral_codes')
                .select(`
                  user:profiles!referral_codes_user_id_fkey (
                    first_name,
                    last_name,
                    name,
                    email
                  )
                `)
                .eq('code', booking.discount_code)
                .single();

              if (!referralError && referralCode?.user) {
                const promoterName = referralCode.user.first_name && referralCode.user.last_name
                  ? `${referralCode.user.first_name} ${referralCode.user.last_name}`
                  : referralCode.user.name || referralCode.user.email;
                
                return {
                  ...booking,
                  promoter_username: promoterName
                };
              }
            } catch (error) {
              console.error('Error fetching promoter for discount code:', booking.discount_code, error);
            }
          }
          
          return {
            ...booking,
            promoter_username: null
          };
        })
      );
      // Load payment links (card payments)
      const { data: paymentLinksData, error: paymentLinksError } = await supabase
        .from('payment_links')
        .select('*')
        .eq('route_id', routeId);

      if (paymentLinksError) throw paymentLinksError;

      // Calculate metrics
      const metrics: TimeSlotMetrics = {};
      let totalRev = 0;
      let refundedTickets = 0;
      
      // Initialize metrics for each time slot
      routeData.time_slots.forEach((slot: string) => {
        metrics[slot] = {
          sold: 0,
          available: routeData.max_capacity_per_slot,
          revenue: 0
        };
      });

      // Calculate metrics from bookings
      bookingsData?.forEach((booking) => {
       // Only process bookings for time slots that exist in the route
       if (!metrics[booking.time_slot]) {
         return;
       }
       
        if (booking.status === 'confirmed' || booking.status === 'completed') {
          metrics[booking.time_slot].sold += booking.quantity;
          metrics[booking.time_slot].available -= booking.quantity;
          metrics[booking.time_slot].revenue += booking.total_price;
          totalRev += booking.total_price;
        } else if (booking.status === 'refunded') {
          refundedTickets += booking.quantity;
        }
      });

      // Set remaining tickets needed for threshold
      const totalSold = Object.values(metrics).reduce((sum, m) => sum + m.sold, 0);
      setRemainingToThreshold(Math.max(0, routeData.min_threshold - totalSold));

      // Set total revenue
      setTotalRevenue(totalRev);

      // Set number of checkout sessions created
      setCheckoutSessions(paymentLinksData?.length || 0);

      // Set refunded count
      setRefundedCount(refundedTickets);

      // Set metrics
      setTimeSlotMetrics(metrics);

      // Set bookings with payment method
      setBookings(bookingsWithPromoters?.map(booking => ({
        ...booking,
        payment_method: 'wallet' // For now, all existing bookings are wallet payments
      })) || []);

    } catch (err: any) {
      console.error('Error loading route details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to refund this booking?')) return;
    
    setProcessingRefund(bookingId);
    setRefundError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process refund');

      // Create a transaction record for the refund
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        console.log("Creating refund transaction for user:", booking.user_id);
        
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: booking.user_id, // This should be the customer's ID
            amount: booking.total_price,
            description: `Refund for booking to ${route.pickup.name} - ${route.dropoff.name}`,
            type: 'refund',
            created_at: new Date().toISOString()
          });
        
        if (transactionError) {
          console.error('Error creating refund transaction:', transactionError);
          console.error('Transaction details:', {
            user_id: booking.user_id,
            booking_user: booking.user,
            amount: booking.total_price
          });
        }
      }

      // Reload route details to reflect changes
      await loadRouteDetails();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      setRefundError(err.message);
    } finally {
      setProcessingRefund(null);
    }
  };

  const handleRefundAll = async () => {
    if (!window.confirm('Are you sure you want to refund ALL bookings for this route?')) return;
    
    setProcessingRefund('all');
    setRefundError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ routeId, refundAll: true }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process refunds');

      // Reload route details to reflect changes
      await loadRouteDetails();
    } catch (err: any) {
      console.error('Error processing refunds:', err);
      setRefundError(err.message);
    } finally {
      setProcessingRefund(null);
    }
  };

  const formatDate = (dateString: string) => {
    // Add a default time to ensure consistent date interpretation
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
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

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!route) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full my-8 mt-16">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Route Details</h2>
            <p className="text-gray-500 mt-1">
              {route.pickup.name} to {route.dropoff.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Route Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Route Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-600">{formatDate(route.date)}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Min Threshold: {route.min_threshold} passengers
                  </span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    ${route.price.toFixed(2)} per ticket
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Current Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-semibold text-green-600">
                    ${totalRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Checkout Sessions:</span>
                  <span className="font-semibold">{checkoutSessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Remaining to Threshold:</span>
                  <span className="font-semibold text-orange-600">
                    {remainingToThreshold} passengers
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Refunded Tickets:</span>
                  <span className="font-semibold text-red-600">
                    {refundedCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Slot Metrics */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Time Slot Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {route.time_slots.map((slot: string) => (
               <div key={slot} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="font-medium">{formatTime(slot)}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                     timeSlotMetrics[slot]?.available === 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                     {timeSlotMetrics[slot]?.available || 0} seats left
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tickets Sold:</span>
                     <span className="font-medium">{timeSlotMetrics[slot]?.sold || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Revenue:</span>
                      <span className="font-medium text-green-600">
                       ${(timeSlotMetrics[slot]?.revenue || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Discount Code Usage Summary */}
          {Object.keys(discountCodeSummary).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Discount Code Usage</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets Sold
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(discountCodeSummary).map(([code, data]) => (
                      <tr key={code} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
                            {code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.tickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${data.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Booking History</h3>
              <button
                onClick={handleRefundAll}
                disabled={processingRefund !== null}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {processingRefund === 'all' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                Refund All Bookings
              </button>
            </div>

            {refundError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                {refundError}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Slot
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promoter Username
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booked At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.user.first_name && booking.user.last_name
                              ? `${booking.user.first_name} ${booking.user.last_name}`
                              : booking.user.name}
                          </div>
                          <div className="text-sm text-gray-500">{booking.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(booking.time_slot)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.quantity}</div>
                          <div className="text-sm text-gray-500">${booking.total_price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            {booking.payment_method === 'wallet' ? (
                              <Wallet className="w-4 h-4 mr-1" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-1" />
                            )}
                            {booking.payment_method === 'wallet' ? 'Credits' : 'Card'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {booking.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                            {booking.status === 'pending' && <Clock4 className="w-3 h-3 mr-1" />}
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.discount_code ? (
                            <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
                              {booking.discount_code}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.promoter_username || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(booking.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleRefund(booking.id)}
                              disabled={processingRefund !== null}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              {processingRefund === booking.id ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                              )}
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Archive/Restore Button */}
          {isPastRoute && onArchive && (
            <div className="mt-6 flex justify-end">
              {route.status !== 'archived' ? (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to archive this route?')) {
                      onArchive(routeId, 'archived');
                      onClose();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Route
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to restore this route?')) {
                      onArchive(routeId, 'active');
                      onClose();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Restore Route
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};