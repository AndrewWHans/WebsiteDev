import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Archive, MapPin, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { Route, Location, RouteFormData } from '../../types/route.types';
import { RouteForm } from './RouteForm';
import { RoutesTable } from './RoutesTable';
import { AddLocationModal } from './AddLocationModal';
import { RouteDetailsModal } from './RouteDetailsModal';

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
  const [cityVisibility, setCityVisibility] = useState<{[key: string]: boolean}>({});
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<RouteFormData>();

  useEffect(() => {
    loadRoutes();
    loadLocations();
    loadCityVisibility();
  }, []);

  useEffect(() => {
    if (editingRoute) {
      setValue('pickup_location', editingRoute.pickup_location || '');
      setValue('dropoff_location', editingRoute.dropoff_location || '');
      setValue('price', editingRoute.price);
      setValue('max_capacity_per_slot', editingRoute.max_capacity_per_slot);
      setValue('min_threshold', editingRoute.min_threshold);
      setValue('city', editingRoute.city);
      setSelectedDate(new Date(editingRoute.date));
      setSelectedTimes(editingRoute.time_slots.map(time => new Date(`1970-01-01T${time}`)));
    }
  }, [editingRoute, setValue]);

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
      setError('Failed to load locations');
    }
  };

  const loadCityVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'hidden_cities');

      if (error) throw error;
      
      // Initialize all cities as visible
      const cities = ['Miami', 'Orlando', 'Tampa', 'St. Petersburg', 'Oaxaca', 'Jersey Shore', 'Austin', 'Nashville', 'Mexico City'];
      const initialVisibility: {[key: string]: boolean} = {};
      cities.forEach(city => {
        initialVisibility[city] = true;
      });
      
      // If we have hidden cities in the database, mark them as hidden
      if (data && data.length > 0) {
        try {
          const hiddenCities = JSON.parse(data[0].value);
          if (Array.isArray(hiddenCities)) {
            hiddenCities.forEach(city => {
              initialVisibility[city] = false;
            });
          }
        } catch (e) {
          console.error('Error parsing hidden cities:', e);
        }
      }
      
      setCityVisibility(initialVisibility);
    } catch (err) {
      console.error('Error loading city visibility:', err);
    }
  };

  const saveCityVisibility = async () => {
    try {
      // Create array of hidden cities
      const hiddenCities = Object.entries(cityVisibility)
        .filter(([_, isVisible]) => !isVisible)
        .map(([city]) => city);
      
      // Save to database
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'hidden_cities',
          value: JSON.stringify(hiddenCities),
          description: 'Cities hidden from the shuttles page'
        });

      if (error) throw error;
      
      setSuccess('City visibility settings saved successfully');
      setShowCityModal(false);
    } catch (err) {
      console.error('Error saving city visibility:', err);
      setError('Failed to save city visibility settings');
    }
  };

  const toggleCityVisibility = (city: string) => {
    setCityVisibility(prev => ({
      ...prev,
      [city]: !prev[city]
    }));
  };

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
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

  const handleArchiveRoute = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      await loadRoutes();
      setSuccess(`Route ${status === 'archived' ? 'archived' : 'restored'} successfully`);
    } catch (err) {
      console.error(`Error ${status === 'archived' ? 'archiving' : 'restoring'} route:`, err);
      setError(`Failed to ${status === 'archived' ? 'archive' : 'restore'} route`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
    setSelectedDate(null);
    setSelectedTimes([]);
    setError(null);
  };

  const handleEdit = (route: Route) => {
    // Reset form state
    reset();
    setSelectedDate(null);
    setSelectedTimes([]);
    
    // Set editing route
    setEditingRoute(route);
    setShowModal(true);
  };

  const onSubmit = async (data: RouteFormData) => {
    if (!selectedDate || selectedTimes.length === 0) {
      setError('Please select date and at least one time slot');
      return;
    }

    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const formattedTimes = selectedTimes.map(time => {
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
        status: 'active',
        city: data.city
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
            Manage all scheduled party bus routes and city visibility
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
          <button
            onClick={() => setShowCityModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Manage Cities
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Route
          </button>
        </div>
      </div>

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

      <RoutesTable
        routes={routes}
        locations={locations}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewDetails={(id) => setSelectedRouteId(id)}
        onArchive={handleArchiveRoute}
      />

      {showModal && (
        <RouteForm
          locations={locations}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTimes={selectedTimes}
          setSelectedTimes={setSelectedTimes}
          onSubmit={onSubmit}
          register={register}
          errors={errors}
          setValue={setValue}
          handleSubmit={handleSubmit}
          editingRoute={editingRoute}
          handleCloseModal={handleCloseModal}
          setShowLocationModal={setShowLocationModal}
        />
      )}

      {showLocationModal && (
        <AddLocationModal
          showLocationModal={showLocationModal}
          setShowLocationModal={setShowLocationModal}
          newLocationName={newLocationName}
          setNewLocationName={setNewLocationName}
          newLocationAddress={newLocationAddress}
          setNewLocationAddress={setNewLocationAddress}
          handleAddLocation={handleAddLocation}
        />
      )}
      
      {/* City Visibility Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Manage City Visibility</h3>
              <button onClick={() => setShowCityModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Toggle which cities are visible on the shuttles page. Hidden cities will not appear in the city selection grid.
            </p>
            
            <div className="space-y-3 mb-6">
              {Object.entries(cityVisibility).map(([city, isVisible]) => (
                <div key={city} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="font-medium">{city}</span>
                  </div>
                  <button
                    onClick={() => toggleCityVisibility(city)}
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                      isVisible 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Visible
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Hidden
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCityModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCityVisibility}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRouteId && (
        <RouteDetailsModal
          routeId={selectedRouteId}
          onClose={() => setSelectedRouteId(null)}
          onArchive={handleArchiveRoute}
        />
      )}
    </div>
  );
};