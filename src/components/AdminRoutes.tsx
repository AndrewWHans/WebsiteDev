import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Archive, MapPin, Check, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
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
  const [cityOrder, setCityOrder] = useState<string[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<RouteFormData>();

  useEffect(() => {
    loadRoutes();
    loadLocations();
    loadCityVisibility();
    loadCityOrder();
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
      
      // Initialize all cities as visible (ensure we have all current cities)
      const allCities = ['Miami', 'Orlando', 'Tampa', 'St. Petersburg', 'Oaxaca', 'Jersey Shore', 'Austin', 'Nashville', 'Mexico City', 'New Haven'];
      const initialVisibility: {[key: string]: boolean} = {};
      allCities.forEach(city => {
        initialVisibility[city] = true;
      });
      
      // If we have hidden cities in the database, mark them as hidden
      if (data && data.length > 0) {
        try {
          const hiddenCities = JSON.parse(data[0].value);
          if (Array.isArray(hiddenCities)) {
            hiddenCities.forEach(city => {
              // Only hide cities that are in our current city list
              if (initialVisibility.hasOwnProperty(city)) {
                initialVisibility[city] = false;
              }
            });
          }
        } catch (e) {
          console.error('Error parsing hidden cities:', e);
        }
      }
      
      setCityVisibility(initialVisibility);
    } catch (err) {
      console.error('Error loading city visibility:', err);
      // Fallback to all cities visible
      const fallbackCities = ['Miami', 'Orlando', 'Tampa', 'St. Petersburg', 'Oaxaca', 'Jersey Shore', 'Austin', 'Nashville', 'Mexico City', 'New Haven'];
      const fallbackVisibility: {[key: string]: boolean} = {};
      fallbackCities.forEach(city => {
        fallbackVisibility[city] = true;
      });
      setCityVisibility(fallbackVisibility);
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
      setCitySearchTerm(''); // Reset search when saving
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

  const loadCityOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'city_order')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // All cities that should be available
      const allCities = ['Tampa', 'St. Petersburg', 'Orlando', 'Miami', 'Nashville', 'Austin', 'Jersey Shore', 'Oaxaca', 'Mexico City', 'New Haven'];
      
      // If we have a custom order, use it but ensure all cities are included
      if (data && data.value) {
        try {
          const customOrder = JSON.parse(data.value);
          if (Array.isArray(customOrder)) {
            // Add any missing cities to the end of the custom order
            const missingCities = allCities.filter(city => !customOrder.includes(city));
            const completeOrder = [...customOrder, ...missingCities];
            setCityOrder(completeOrder);
            
            // If we added missing cities, save the updated order
            if (missingCities.length > 0) {
              await supabase
                .from('system_settings')
                .upsert({
                  key: 'city_order',
                  value: JSON.stringify(completeOrder),
                  description: 'Custom order for displaying cities'
                });
            }
            return;
          }
        } catch (e) {
          console.error('Error parsing city order:', e);
        }
      }
      
      // Default order if no custom order found
      setCityOrder(allCities);
    } catch (err) {
      console.error('Error loading city order:', err);
      // Default order on error
      const defaultCities = ['Tampa', 'St. Petersburg', 'Orlando', 'Miami', 'Nashville', 'Austin', 'Jersey Shore', 'Oaxaca', 'Mexico City', 'New Haven'];
      setCityOrder(defaultCities);
    }
  };

  const saveCityOrder = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'city_order',
          value: JSON.stringify(cityOrder),
          description: 'Custom order for displaying cities'
        });

      if (error) throw error;
      
      setSuccess('City order saved successfully');
      setShowOrderModal(false);
    } catch (err) {
      console.error('Error saving city order:', err);
      setError('Failed to save city order');
    }
  };

  const moveCityUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...cityOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setCityOrder(newOrder);
    }
  };

  const moveCityDown = (index: number) => {
    if (index < cityOrder.length - 1) {
      const newOrder = [...cityOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setCityOrder(newOrder);
    }
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
    reset();
  };

  const handleCloseCityModal = () => {
    setShowCityModal(false);
    setCitySearchTerm(''); // Reset search when closing
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
            onClick={() => setShowOrderModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <GripVertical className="w-4 h-4 mr-2" />
            City Order
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Manage City Visibility</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {Object.values(cityVisibility).filter(Boolean).length} of {Object.keys(cityVisibility).length} cities visible
                </p>
              </div>
              <button 
                onClick={handleCloseCityModal}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search and Bulk Actions */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search cities..."
                    value={citySearchTerm}
                    onChange={(e) => setCitySearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newVisibility = { ...cityVisibility };
                      Object.keys(newVisibility).forEach(city => {
                        if (!citySearchTerm || city.toLowerCase().includes(citySearchTerm.toLowerCase())) {
                          newVisibility[city] = true;
                        }
                      });
                      setCityVisibility(newVisibility);
                    }}
                    className="px-3 py-2 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => {
                      const newVisibility = { ...cityVisibility };
                      Object.keys(newVisibility).forEach(city => {
                        if (!citySearchTerm || city.toLowerCase().includes(citySearchTerm.toLowerCase())) {
                          newVisibility[city] = false;
                        }
                      });
                      setCityVisibility(newVisibility);
                    }}
                    className="px-3 py-2 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                  >
                    Hide All
                  </button>
                </div>
              </div>
            </div>
            
            {/* Cities List - Scrollable with fixed height */}
            <div className="flex-1 overflow-y-auto p-4 max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(cityVisibility)
                  .filter(([city]) => !citySearchTerm || city.toLowerCase().includes(citySearchTerm.toLowerCase()))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([city, isVisible]) => (
                  <div key={city} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-center min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{city}</span>
                    </div>
                    <button
                      onClick={() => toggleCityVisibility(city)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center transition-all ml-3 flex-shrink-0 ${
                        isVisible 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Visible
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Hidden
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
              
              {/* No results message */}
              {citySearchTerm && Object.entries(cityVisibility)
                .filter(([city]) => city.toLowerCase().includes(citySearchTerm.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No cities found matching "{citySearchTerm}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                Changes will be saved to the database
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseCityModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCityVisibility}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Save Changes
                </button>
              </div>
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

      {/* City Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Manage City Order</h3>
              <button onClick={() => setShowOrderModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Drag cities to reorder them or use the arrow buttons. This order will be used on the shuttles and deals pages.
            </p>
            
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {cityOrder.map((city, index) => (
                <div key={city} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <GripVertical className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="font-medium">{city}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => moveCityUp(index)}
                      disabled={index === 0}
                      className={`p-1 rounded ${
                        index === 0 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveCityDown(index)}
                      disabled={index === cityOrder.length - 1}
                      className={`p-1 rounded ${
                        index === cityOrder.length - 1 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCityOrder}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};