import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Eye, ChevronDown, ChevronUp, ChevronRight, Archive, Clock } from 'lucide-react';
import { Route, Location } from '../../types/route.types';
import { supabase } from '../../lib/supabase';

type RoutesTableProps = {
  routes: Route[];
  locations: Location[];
  onEdit: (route: Route) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  onArchive?: (id: string, status: string) => void;
};

type SortField = 'city' | 'date' | 'pickup' | 'dropoff' | 'time' | 'price' | 'capacity' | 'tickets';
type SortDirection = 'asc' | 'desc';

export const RoutesTable = ({ routes, locations, onEdit, onDelete, onViewDetails, onArchive }: RoutesTableProps) => {
  const [ticketCounts, setTicketCounts] = useState<{[key: string]: number}>({});
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateGroups, setDateGroups] = useState<{[key: string]: Route[]}>({});
  const [showPastRoutes, setShowPastRoutes] = useState(false);
  
  // Group and sort routes
  useEffect(() => {
    // Group routes by date
    const groupedByDate = routes.reduce((groups: {[key: string]: Route[]}, route) => {
      const date = route.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(route);
      return groups;
    }, {});

    // Sort the dates
    const sortedDateGroups: {[key: string]: Route[]} = {};
    Object.keys(groupedByDate)
      .sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .forEach(date => {
        sortedDateGroups[date] = groupedByDate[date];
      });

    // Set all dates as expanded initially
    setExpandedDates(new Set(Object.keys(sortedDateGroups)));
    setDateGroups(sortedDateGroups);
  }, [routes]);
  
  useEffect(() => {
    // Fetch active ticket counts for all routes
    const fetchTicketCounts = async () => {
      const counts: {[key: string]: number} = {};
      
      for (const route of routes) {
        const { data, error } = await supabase
          .from('ticket_bookings')
          .select('quantity')
          .eq('route_id', route.id)
          .in('status', ['confirmed', 'completed']);
          
        if (!error && data) {
          counts[route.id] = data.reduce((sum, booking) => sum + booking.quantity, 0);
        } else {
          counts[route.id] = 0;
        }
      }
      
      setTicketCounts(counts);
    };
    
    fetchTicketCounts();
  }, [routes]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
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

  const sortRoutes = (routes: Route[]) => {
    return [...routes].sort((a, b) => {
      let comparison = 0;
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'city':
          comparison = (a.city || '').localeCompare(b.city || '');
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'pickup':
          const pickupA = locations.find(loc => loc.id === a.pickup_location)?.name || '';
          const pickupB = locations.find(loc => loc.id === b.pickup_location)?.name || '';
          comparison = pickupA.localeCompare(pickupB);
          break;
        case 'dropoff':
          const dropoffA = locations.find(loc => loc.id === a.dropoff_location)?.name || '';
          const dropoffB = locations.find(loc => loc.id === b.dropoff_location)?.name || '';
          comparison = dropoffA.localeCompare(dropoffB);
          break;
        case 'time':
          comparison = a.time_slots[0]?.localeCompare(b.time_slots[0] || '') || 0;
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'capacity':
          comparison = (a.max_capacity_per_slot || 0) - (b.max_capacity_per_slot || 0);
          break;
        case 'tickets':
          comparison = (ticketCounts[a.id] || 0) - (ticketCounts[b.id] || 0);
          break;
        default:
          comparison = 0;
      }
      
      return comparison * multiplier;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if a route is in the past
  const isPastRoute = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const routeDate = new Date(date + 'T00:00:00');
    return routeDate < today;
  };

  // Filter date groups based on past/future status
  const filteredDateGroups = Object.entries(dateGroups).filter(([date, _]) => {
    const isPast = isPastRoute(date);
    return showPastRoutes ? isPast : !isPast;
  });

  return (
    <div className="mt-8 flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPastRoutes(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              !showPastRoutes 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Active Routes
          </button>
          <button
            onClick={() => setShowPastRoutes(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              showPastRoutes 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            <Archive className="inline-block w-4 h-4 mr-1" />
            Past Routes
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {showPastRoutes 
            ? 'Viewing past routes (read-only)' 
            : 'Viewing active routes'}
        </div>
      </div>

      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            {filteredDateGroups.length === 0 ? (
              <div className="bg-white p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                  {showPastRoutes ? (
                    <Archive className="h-6 w-6 text-gray-400" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No {showPastRoutes ? 'past' : 'active'} routes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {showPastRoutes 
                    ? 'There are no past routes to display.' 
                    : 'Get started by creating a new route.'}
                </p>
              </div>
            ) : (
              filteredDateGroups.map(([date, dateRoutes]) => (
              <div key={date} className="mb-4">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer"
                  onClick={() => toggleDateExpansion(date)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedDates.has(date) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <h2 className="text-lg font-medium text-gray-900">{formatDate(date)}</h2>
                    <span className="text-sm text-gray-500">({dateRoutes.length} routes)</span>
                    {isPastRoute(date) && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Past
                      </span>
                    )}
                  </div>
                </div>
                
                {expandedDates.has(date) && (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('city')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>City</span>
                            {sortField === 'city' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            {sortField === 'date' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('pickup')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Pickup Location</span>
                            {sortField === 'pickup' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('dropoff')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Dropoff Location</span>
                            {sortField === 'dropoff' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('time')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Time</span>
                            {sortField === 'time' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Price</span>
                            {sortField === 'price' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('capacity')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Capacity</span>
                            {sortField === 'capacity' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                          onClick={() => handleSort('tickets')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Active Tickets</span>
                            {sortField === 'tickets' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {sortRoutes(dateRoutes).map((route) => (
                        <tr key={route.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {route.city}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {new Date(route.date + 'T12:00:00').toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {locations.find(loc => loc.id === route.pickup_location)?.name || route.pickup_location}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {locations.find(loc => loc.id === route.dropoff_location)?.name || route.dropoff_location}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {route.time_slots.map(time => 
                              new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ).join(', ')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            ${route.price.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {route.min_threshold}-{route.max_capacity_per_slot}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {ticketCounts[route.id] || 0}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              route.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {route.status}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => onViewDetails(route.id)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!showPastRoutes && (
                            <button
                              onClick={() => onEdit(route)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="Edit Route"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            )}
                            {!showPastRoutes && (
                            <button
                              onClick={() => onDelete(route.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Route"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            )}
                            {!showPastRoutes && isPastRoute(route.date) && onArchive && (
                              <button
                                onClick={() => onArchive(route.id, 'archived')}
                                className="text-gray-600 hover:text-gray-900 ml-4"
                                title="Archive Route"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                            {showPastRoutes && route.status === 'archived' && onArchive && (
                              <button
                                onClick={() => onArchive(route.id, 'active')}
                                className="text-green-600 hover:text-green-900 ml-4"
                                title="Restore Route"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}; 