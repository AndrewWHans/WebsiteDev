import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { X, Calendar, DollarSign, Users, Plus, Clock, MapPin, Building, Info, Check } from 'lucide-react';
import { RouteFormData, Location, Route } from '../../types/route.types';

type RouteFormProps = {
  locations: Location[];
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedTimes: Date[];
  setSelectedTimes: (times: Date[]) => void;
  onSubmit: (data: RouteFormData) => void;
  register: any;
  errors: any;
  setValue: any;
  editingRoute: Route | null;
  handleCloseModal: () => void;
  setShowLocationModal: (show: boolean) => void;
  handleSubmit: any;
};

const CITIES = ['Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Austin', 'Nashville', 'Jersey Shore', 'Oaxaca', 'Mexico City', 'New Haven'] as const;

export const RouteForm = ({
  locations,
  selectedDate,
  setSelectedDate,
  selectedTimes,
  setSelectedTimes,
  onSubmit,
  register,
  errors,
  setValue,
  editingRoute,
  handleCloseModal,
  setShowLocationModal,
  handleSubmit
}: RouteFormProps) => {
  const [timeInputValue, setTimeInputValue] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false); 
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRoute) {
      setValue('pickup_location', editingRoute.pickup_location || '');
      setValue('dropoff_location', editingRoute.dropoff_location || '');
      setValue('price', editingRoute.price);
      setValue('max_capacity_per_slot', editingRoute.max_capacity_per_slot);
      setValue('min_threshold', editingRoute.min_threshold);
      setValue('city', editingRoute.city);
    }
  }, [editingRoute, setValue]);

  // Generate all possible times in 15-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        times.push(date);
      }
    }
    return times;
  };

  const allTimes = generateTimeOptions();

  // Filter times based on input
  const getFilteredTimes = () => {
    if (!timeInputValue) return allTimes;
    return allTimes.filter(time => {
      const timeString = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return timeString.toLowerCase().includes(timeInputValue.toLowerCase());
    });
  };

  const filteredTimes = getFilteredTimes();

  const handleTimeChange = (time) => {
    if (time) {
      setSelectedTimes(prev => [...prev, time]);
      setTimeInputValue('');
      setShowTimeDropdown(false);
      setTimeError(null);
    }
  };

  const handleTimeInputChange = (e) => {
    setTimeInputValue(e.target.value);
    e.preventDefault(); // Prevent auto-completion
  };

  const filterTime = (time) => {
    if (!timeInputValue) return true;
    const timeString = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return timeString.toLowerCase().includes(timeInputValue.toLowerCase());
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-indigo-600 to-indigo-700">
          <h3 className="text-xl font-semibold text-white flex items-center">
            {editingRoute ? <Check size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
            {editingRoute ? 'Edit Route' : 'Add New Route'}
          </h3>
          <button 
            onClick={handleCloseModal}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 mb-8">
            {/* City Selection */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 mr-2 text-indigo-500" />
                City
              </label>
              <div className="relative">
                <select
                  {...register('city', { required: true })}
                  className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm"
                >
                  <option value="">Select city</option>
                  {CITIES.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Info size={14} className="mr-1" /> City is required
                </p>
              )}
            </div>

            {/* Pickup Location */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                Pickup Location
              </label>
              <div className="mt-1 flex space-x-2">
                <div className="flex-1 relative">
                  <select
                    {...register('pickup_location', { required: true })}
                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm"
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
                  className="inline-flex items-center px-4 py-3 border border-indigo-300 shadow-sm text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Location
                </button>
              </div>
              {errors.pickup_location && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Info size={14} className="mr-1" /> Pickup location is required
                </p>
              )}
            </div>

            {/* Dropoff Location */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                Dropoff Location
              </label>
              <div className="mt-1 flex space-x-2">
                <div className="flex-1 relative">
                  <select
                    {...register('dropoff_location', { required: true })}
                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm"
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
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Info size={14} className="mr-1" /> Dropoff location is required
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                  Date
                </label>
                <div className="mt-1 relative">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      if (date) {
                        // Set the time to noon to avoid timezone issues
                        date.setHours(12, 0, 0, 0);
                        setSelectedDate(date);
                      }
                    }}
                    dateFormat="MM/dd/yyyy"
                    minDate={new Date()}
                    className="block w-full px-4 py-3 sm:text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholderText="Select date"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                  Time
                </label>
                <div className="mt-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={timeInputValue}
                      onChange={(e) => {
                        setTimeInputValue(e.target.value);
                        setShowTimeDropdown(true);
                      }}
                      onFocus={() => setShowTimeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTimeDropdown(false), 150)}
                      className="block w-full px-4 py-3 sm:text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Search or add time slots"
                    />
                    {showTimeDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {filteredTimes.map((time, index) => (
                          <div
                            key={index}
                            onClick={() => handleTimeChange(time)}
                            className="cursor-pointer select-none relative py-2 px-4 hover:bg-indigo-50 transition-colors flex items-center"
                          >
                            <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                            <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                          </div>
                        ))}
                        {filteredTimes.length === 0 && timeInputValue && (
                          <div className="cursor-default select-none relative py-2 px-4 text-gray-500 text-center">
                            No times found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {timeError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <Info size={14} className="mr-1" /> {timeError}
                    </p>
                  )}
                  {selectedTimes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTimes.map((time, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 shadow-sm"
                        >
                          <Clock className="w-3 h-3 mr-1 text-indigo-600" />
                          <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTimes(prev => prev.filter((_, i) => i !== index))}
                            className="ml-1.5 text-indigo-600 hover:text-indigo-900 bg-indigo-200 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedTimes.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">Add at least one time slot for this route</p>
                  )}
                </div>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 mr-2 text-indigo-500" />
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
                  className="block w-full pl-10 py-3 sm:text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Info size={14} className="mr-1" /> Valid price is required
                </p>
              )}
            </div>

            {/* Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 mr-2 text-indigo-500" />
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
                    className="block w-full pl-10 py-3 sm:text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Min threshold"
                  />
                </div>
                {errors.min_threshold && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <Info size={14} className="mr-1" /> Minimum threshold is required
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 mr-2 text-indigo-500" />
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
                    className="block w-full pl-10 py-3 sm:text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Max capacity per slot"
                  />
                </div>
                {errors.max_capacity_per_slot && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <Info size={14} className="mr-1" /> Maximum capacity per slot is required
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {editingRoute ? 'Save Changes' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 