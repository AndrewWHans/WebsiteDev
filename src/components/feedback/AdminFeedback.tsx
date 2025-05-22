import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  MessageSquare, 
  Lightbulb, 
  Bug, 
  Sparkles, 
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronDown,
  Search,
  X,
  Eye,
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Feedback = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  feedback_type: 'suggestion' | 'bug' | 'feature' | 'other';
  message: string;
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  created_at: string;
  updated_at: string;
};

export const AdminFeedback = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      if (typeFilter) {
        query = query.eq('feedback_type', typeFilter);
      }
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setFeedback(data || []);
    } catch (err: any) {
      console.error('Error loading feedback:', err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: 'pending' | 'reviewed' | 'implemented' | 'rejected') => {
    try {
      setUpdatingStatus(true);
      
      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setFeedback(feedback.map(item => 
        item.id === id ? { ...item, status } : item
      ));
      
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
      
    } catch (err: any) {
      console.error('Error updating feedback status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-yellow-400" />;
      case 'bug':
        return <Bug className="w-5 h-5 text-red-400" />;
      case 'feature':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'other':
        return <HelpCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Eye className="w-3 h-3 mr-1" />
            Reviewed
          </span>
        );
      case 'implemented':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Implemented
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const handleFilterChange = () => {
    loadFeedback();
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setSearchTerm('');
    loadFeedback();
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
          <h1 className="text-2xl font-semibold text-gray-900">User Feedback</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and respond to user feedback, suggestions, and bug reports
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mt-6 mb-6 bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name, email, or content..."
            />
          </div>

          <div className="flex md:flex-row flex-col gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`ml-1 h-4 w-4 transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={handleFilterChange}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Apply Filters
            </button>

            {(statusFilter || typeFilter || searchTerm) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear Filters
                <X className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="implemented">Implemented</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
              <select
                value={typeFilter || ''}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Types</option>
                <option value="suggestion">Suggestions</option>
                <option value="bug">Bug Reports</option>
                <option value="feature">Feature Requests</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Feedback Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {feedback.length === 0 ? (
                <div className="bg-white px-6 py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No feedback found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter || typeFilter 
                      ? 'Try adjusting your search or filter parameters.' 
                      : 'No feedback has been submitted yet.'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        From
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Message
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {feedback.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {getFeedbackTypeIcon(item.feedback_type)}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900 capitalize">
                                {item.feedback_type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-gray-500">{item.email}</div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">{item.message}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => {
                              setSelectedFeedback(item);
                              setShowModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Detail Modal */}
      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center">
                {getFeedbackTypeIcon(selectedFeedback.feedback_type)}
                <h3 className="text-lg font-medium text-gray-900 ml-2 capitalize">
                  {selectedFeedback.feedback_type} Feedback
                </h3>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Submitted By
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedFeedback.name}</p>
                      <p className="text-gray-500">{selectedFeedback.email}</p>
                    </div>
                    <a 
                      href={`mailto:${selectedFeedback.email}`}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Reply
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Message
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-line">{selectedFeedback.message}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Details
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Submitted On</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedFeedback.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedFeedback.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ID</p>
                      <p className="font-medium text-gray-900 font-mono text-xs">{selectedFeedback.id}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Update Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'pending')}
                    disabled={selectedFeedback.status === 'pending' || updatingStatus}
                    className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm ${
                      selectedFeedback.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'text-yellow-700 bg-white hover:bg-yellow-50 border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pending
                  </button>
                  <button
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'reviewed')}
                    disabled={selectedFeedback.status === 'reviewed' || updatingStatus}
                    className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm ${
                      selectedFeedback.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'text-blue-700 bg-white hover:bg-blue-50 border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Reviewed
                  </button>
                  <button
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'implemented')}
                    disabled={selectedFeedback.status === 'implemented' || updatingStatus}
                    className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm ${
                      selectedFeedback.status === 'implemented'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'text-green-700 bg-white hover:bg-green-50 border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Implemented
                  </button>
                  <button
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'rejected')}
                    disabled={selectedFeedback.status === 'rejected' || updatingStatus}
                    className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm ${
                      selectedFeedback.status === 'rejected'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'text-red-700 bg-white hover:bg-red-50 border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejected
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};