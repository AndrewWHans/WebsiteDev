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
  Car
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
};

export const DriverPendingTrips = () => {
  const [requests, setRequests] = useState<PrivateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PrivateRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 