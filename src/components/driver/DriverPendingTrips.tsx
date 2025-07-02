import React, { useState, useEffect } from 'react';
import { 
  Loader2,
  Calendar,
  Clock,
  Repeat,
  ArrowRight,
  MapPin,
  Users,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Car,
  DollarSign,
  Edit3,
  Plus
} from 'lucide-react';
import { supabase, formatToEST, formatTimeToEST, parseAndFormatDate } from '../../lib/supabase';

type PrivateRequest = {
  id: string;
  user_id: string | null;
  phone_number: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  trip_type: 'one-way' | 'round-trip';
  return_time: string | null;
  passengers: number;
  notes: string | null;
  status: string;
  created_at: string;
  // Fields for anonymous users
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  // User profile data (for authenticated users)
  user: {
    email: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  // Bidding fields
  bidding_enabled: boolean;
  accepted_bid_id: string | null;
  min_bid_amount: number | null;
  max_bid_amount: number | null;
};

type DriverBid = {
  id: string;
  ride_request_id: string;
  driver_id: string;
  bid_amount: number;
  status: 'active' | 'accepted' | 'rejected' | 'expired';
  notes: string | null;
  created_at: string;
  updated_at: string;
  driver: {
    first_name: string | null;
    last_name: string | null;
    name: string;
  } | null;
};

export const DriverPendingTrips = () => {
  const [requests, setRequests] = useState<PrivateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PrivateRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [bids, setBids] = useState<DriverBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidNotes, setBidNotes] = useState<string>('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [currentUserBid, setCurrentUserBid] = useState<DriverBid | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      loadBids(selectedRequest.id);
    }
  }, [selectedRequest]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('private_ride_requests')
        .select(`
          *,
          user:profiles(
            email,
            name,
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const loadBids = async (rideRequestId: string) => {
    setLoadingBids(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('driver_bids')
        .select(`
          *,
          driver:profiles(
            first_name,
            last_name,
            name
          )
        `)
        .eq('ride_request_id', rideRequestId)
        .order('bid_amount', { ascending: true });

      if (error) throw error;
      
      setBids(data || []);
      
      // Find current user's bid
      const userBid = data?.find(bid => bid.driver_id === user.id);
      setCurrentUserBid(userBid || null);
      
      if (userBid) {
        setBidAmount(userBid.bid_amount.toString());
        setBidNotes(userBid.notes || '');
      } else {
        setBidAmount('');
        setBidNotes('');
      }
    } catch (err) {
      console.error('Error loading bids:', err);
      setError('Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedRequest || !bidAmount) return;
    
    setSubmittingBid(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const amount = parseFloat(bidAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid bid amount');
      }

      if (currentUserBid) {
        // Update existing bid
        const { error } = await supabase
          .from('driver_bids')
          .update({
            bid_amount: amount,
            notes: bidNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUserBid.id);

        if (error) throw error;
      } else {
        // Create new bid
        const { error } = await supabase
          .from('driver_bids')
          .insert({
            ride_request_id: selectedRequest.id,
            driver_id: user.id,
            bid_amount: amount,
            notes: bidNotes || null
          });

        if (error) throw error;
      }

      // Reload bids
      await loadBids(selectedRequest.id);
      setShowBidForm(false);
      setError(null);
    } catch (err) {
      console.error('Error submitting bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleCancelBid = async () => {
    if (!currentUserBid) return;
    
    try {
      const { error } = await supabase
        .from('driver_bids')
        .delete()
        .eq('id', currentUserBid.id);

      if (error) throw error;

      await loadBids(selectedRequest!.id);
      setShowBidForm(false);
      setError(null);
    } catch (err) {
      console.error('Error canceling bid:', err);
      setError('Failed to cancel bid');
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('private_ride_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      
      // Update local state
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus }
          : request
      ));

      // Update selected request if modal is open
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }).format(date);
      } else {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }).format(date);
      }
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return formatTimeToEST(timeString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900/60 text-green-400';
      case 'cancelled':
        return 'bg-red-900/60 text-red-400';
      case 'completed':
        return 'bg-blue-900/60 text-blue-400';
      case 'in-progress':
        return 'bg-purple-900/60 text-purple-400';
      default:
        return 'bg-yellow-900/60 text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'in-progress':
        return <Car size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const getCustomerName = (request: PrivateRequest) => {
    if (request.user_id && request.user) {
      return request.user.first_name && request.user.last_name
        ? `${request.user.first_name} ${request.user.last_name}`
        : request.user.name || 'Unknown User';
    } else {
      return request.first_name && request.last_name
        ? `${request.first_name} ${request.last_name}`
        : 'Anonymous User';
    }
  };

  const getCustomerEmail = (request: PrivateRequest) => {
    if (request.user_id && request.user) {
      return request.user.email;
    } else {
      return request.email || 'No email provided';
    }
  };

  const getCustomerType = (request: PrivateRequest) => {
    return request.user_id ? 'Registered' : 'Guest';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Pending Trips</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage pending private ride requests
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Requests Table */}
      <div className="mt-6">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date & Time
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Trip Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Route
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Passengers
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No pending trips</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No pending private ride requests available.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium text-gray-900">
                            {formatDate(request.pickup_date)}
                          </div>
                          <div>{formatTime(request.pickup_time)}</div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            {request.trip_type === 'one-way' ? (
                              <ArrowRight size={16} className="text-gray-400 mr-2" />
                            ) : (
                              <Repeat size={16} className="text-gray-400 mr-2" />
                            )}
                            <span className="font-medium text-gray-900 capitalize">
                              {request.trip_type.replace('-', ' ')}
                            </span>
                            {request.trip_type === 'round-trip' && request.return_time && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Return: {formatTime(request.return_time)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium text-gray-900">
                            {request.pickup_location}
                          </div>
                          <div>to {request.dropoff_location}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {request.passengers}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Trip Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Trip Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Date</p>
                          <p className="text-sm text-gray-900 font-semibold">{formatDate(selectedRequest.pickup_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Time</p>
                          <p className="text-sm text-gray-900 font-semibold">{formatTime(selectedRequest.pickup_time)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Users className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Passengers</p>
                          <p className="text-sm text-gray-900 font-semibold">{selectedRequest.passengers}</p>
                        </div>
                      </div>
                      {selectedRequest.trip_type === 'round-trip' && selectedRequest.return_time && (
                        <div className="flex items-start">
                          <Clock className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600 mb-1">Return Time</p>
                            <p className="text-sm text-gray-900 font-semibold">{formatTime(selectedRequest.return_time)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Pickup Location</p>
                          <p className="text-sm text-gray-900 font-semibold">{selectedRequest.pickup_location}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Dropoff Location</p>
                          <p className="text-sm text-gray-900 font-semibold">{selectedRequest.dropoff_location}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        {selectedRequest.trip_type === 'one-way' ? (
                          <ArrowRight className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        ) : (
                          <Repeat className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Trip Type</p>
                          <p className="text-sm text-gray-900 font-semibold capitalize">{selectedRequest.trip_type.replace('-', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes - Full Width */}
                  {selectedRequest.notes && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-start">
                        <FileText className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">Additional Notes</p>
                          <p className="text-sm text-gray-900 font-semibold">{selectedRequest.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bidding Section */}
              {selectedRequest.bidding_enabled && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Driver Bids</h4>
                    {!currentUserBid && !showBidForm && (
                      <button
                        onClick={() => setShowBidForm(true)}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Place Bid
                      </button>
                    )}
                    {currentUserBid && !showBidForm && (
                      <button
                        onClick={() => setShowBidForm(true)}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Update Bid
                      </button>
                    )}
                  </div>

                  {/* Bid Form */}
                  {showBidForm && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bid Amount ($)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="Enter your bid amount"
                            />
                          </div>
                          {selectedRequest.min_bid_amount && (
                            <p className="mt-1 text-xs text-gray-500">
                              Minimum bid: ${selectedRequest.min_bid_amount}
                            </p>
                          )}
                          {selectedRequest.max_bid_amount && (
                            <p className="mt-1 text-xs text-gray-500">
                              Maximum bid: ${selectedRequest.max_bid_amount}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={bidNotes}
                            onChange={(e) => setBidNotes(e.target.value)}
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Add any additional notes about your bid..."
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleSubmitBid}
                            disabled={submittingBid || !bidAmount}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingBid ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : currentUserBid ? (
                              'Update Bid'
                            ) : (
                              'Submit Bid'
                            )}
                          </button>
                          {currentUserBid && (
                            <button
                              onClick={handleCancelBid}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Cancel Bid
                            </button>
                          )}
                          <button
                            onClick={() => setShowBidForm(false)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current User's Bid */}
                  {currentUserBid && !showBidForm && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Your Bid</p>
                          <p className="text-lg font-semibold text-green-900">${currentUserBid.bid_amount}</p>
                          {currentUserBid.notes && (
                            <p className="text-sm text-green-700 mt-1">{currentUserBid.notes}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          currentUserBid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          currentUserBid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {currentUserBid.status.charAt(0).toUpperCase() + currentUserBid.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* All Bids */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    {loadingBids ? (
                      <div className="p-4 text-center">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Loading bids...</p>
                      </div>
                    ) : bids.length === 0 ? (
                      <div className="p-4 text-center">
                        <DollarSign className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No bids yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {bids.map((bid) => (
                          <div key={bid.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900">
                                    {bid.driver?.first_name && bid.driver?.last_name
                                      ? `${bid.driver.first_name} ${bid.driver.last_name}`
                                      : bid.driver?.name || 'Unknown Driver'
                                    }
                                  </p>
                                  {bid.id === currentUserBid?.id && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-lg font-semibold text-gray-900">${bid.bid_amount}</p>
                                {bid.notes && (
                                  <p className="text-sm text-gray-600 mt-1">{bid.notes}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(bid.created_at).toLocaleString()}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                bid.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 