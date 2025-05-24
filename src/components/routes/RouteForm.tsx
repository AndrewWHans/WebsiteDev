import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { X, Calendar, DollarSign, Users, Plus } from 'lucide-react';
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

const CITIES = ['Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Austin', 'Nashville', 'Jersey Shore', 'Oaxaca'] as const;

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

  const handleTimeChange = (time) => {
    if (time) {
      setSelectedTimes(prev => [...prev, time]);
      setTimeInputValue(''); // Clear input after selection
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
            {/* City Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <div className="mt-1">
                <select
                  {...register('city', { required: true })}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
                <p className="mt-1 text-sm text-red-600">City is required</p>
              )}
            </div>

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
                    onChange={handleTimeChange}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeFormat="h:mm aa"
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    autoComplete="off"
                    shouldCloseOnSelect={true}
                    onChangeRaw={handleTimeInputChange}
                    filterTime={filterTime}
                    value={timeInputValue}
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
                          {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
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
  );
}; 