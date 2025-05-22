import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Route = {
  id: string;
  pickup_location: string;
  pickup_location_id?: string;
  dropoff_location: string;
  dropoff_location_id?: string;
  date: string;
  time_slots: string[];
  price: number;
  max_capacity_per_slot: number;
  min_threshold: number;
  tickets_sold: number;
  status: string;
};

type Location = {
  id: string;
  name: string;
  address: string;
};

type RouteFormData = {
  pickup_location: string;
  dropoff_location: string;
  price: number;
  max_capacity_per_slot: number;
  min_threshold: number;
};

export const AdminRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<Date[]>([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<RouteFormData>();

  useEffect(() => {
    loadRoutes();
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const handleAddLocation = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .insert([{
          name: newLocationName,
          address: newLocationAddress
        }]);

      if (error) throw error;
      
      setSuccess('Location added successfully');
      setShowLocationModal(false);
      setNewLocationName('');
      setNewLocationAddress('');
      loadLocations();
    } catch (err) {
      console.error('Error adding location:', err);
      setError('Failed to add location');
    }
  };

  useEffect(() => {
    if (editingRoute) {
      setValue('pickup_location', editingRoute.pickup_location);
      setValue('dropoff_location', editingRoute.dropoff_location);
      setValue('price', editingRoute.price);
      setValue('max_capacity_per_slot', editingRoute.max_capacity_per_slot);
      setValue('min_threshold', editingRoute.min_threshold);
      setSelectedDate(new Date(editingRoute.date));
      setSelectedTimes(editingRoute.time_slots.map(time => new Date(`1970-01-01T${time}`)));
    }
  }, [editingRoute, setValue]);

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          pickup_location,
          dropoff_location,
          date,
          time_slots,
          price,
          max_capacity_per_slot,
          min_threshold,
          tickets_sold,
          status
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      setRoutes(data || []);
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RouteFormData) => {
    if (!selectedDate || selectedTimes.length === 0) {
      setError('Please select date and at least one time slot');
      return;
    }

    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const formattedTimes = selectedTimes.map(time => {
        // Format time as HH:mm:ss
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}:00`;
      });

      const routeData = {
        pickup_location: data.pickup_location,
        dropoff_location: data.dropoff_location,
        date: formattedDate,
        time_slots: formattedTimes,
        price: data.price,
        max_capacity_per_slot: data.max_capacity_per_slot,
        min_threshold: data.min_threshold,
        status: 'active'
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(routeData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        setSuccess('Route updated successfully');
      } else {
        const { error } = await supabase
          .from('routes')
          .insert([routeData]);

        if (error) throw error;
        setSuccess('Route created successfully');
      }

      await loadRoutes();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving route:', err);
      setError('Failed to save route');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadRoutes();
      setSuccess('Route deleted successfully');
    } catch (err) {
      console.error('Error deleting route:', err);
      setError('Failed to delete route');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
    setSelectedDate(null);
    setSelectedTimes([]);
    reset();
    setError(null);
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
          <h1 className="text-2xl font-semibold text-gray-900">Routes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all scheduled party bus routes
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Route
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Routes Table */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Pickup Location
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Dropoff Location
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Time
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Capacity
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Tickets Sold
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {new Date(route.date).toLocaleDateString()}
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
                        ${route.price}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {route.min_threshold}-{route.max_capacity_per_slot}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {route.tickets_sold}
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
                          onClick={() => {
                            setEditingRoute(route);
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(route.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h3>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Pickup Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pickup Location
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <div className="flex-1 relative">
                      <select
                        {...register('pickup_location', { required: true })}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select location</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} - {loc.address}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Location
                    </button>
                  </div>
                  {errors.pickup_location && (
                    <p className="mt-1 text-sm text-red-600">Pickup location is required</p>
                  )}
                </div>

                {/* Dropoff Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dropoff Location
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <div className="flex-1 relative">
                      <select
                        {...register('dropoff_location', { required: true })}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select location</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} - {loc.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {errors.dropoff_location && (
                    <p className="mt-1 text-sm text-red-600">Dropoff location is required</p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="MM/dd/yyyy"
                        minDate={new Date()}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholderText="Select date"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Time
                    </label>
                    <div className="mt-1">
                      <DatePicker
                        selected={null}
                        onChange={(time) => {
                          if (time) {
                            setSelectedTimes(prev => [...prev, time]);
                          }
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeFormat="HH:mm"
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        className="block w-full px-3 py-2 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholderText="Add time slot"
                      />
                      {selectedTimes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedTimes.map((time, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              <button
                                type="button"
                                onClick={() => setSelectedTimes(prev => prev.filter((_, i) => i !== index))}
                                className="ml-1 text-indigo-600 hover:text-indigo-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price per Ticket
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('price', { required: true, min: 0 })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">Valid price is required</p>
                  )}
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Minimum Threshold
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        {...register('min_threshold', { required: true, min: 1 })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Min threshold"
                      />
                    </div>
                    {errors.min_threshold && (
                      <p className="mt-1 text-sm text-red-600">Minimum threshold is required</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Maximum Capacity per Time Slot
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        {...register('max_capacity_per_slot', { required: true, min: 1 })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Max capacity per slot"
                      />
                    </div>
                    {errors.max_capacity_per_slot && (
                      <p className="mt-1 text-sm text-red-600">Maximum capacity per slot is required</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add New Location</h3>
              <button onClick={() => setShowLocationModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location Name
                </label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Downtown Bus Stop"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Full address"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={!newLocationName || !newLocationAddress}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  Add Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};