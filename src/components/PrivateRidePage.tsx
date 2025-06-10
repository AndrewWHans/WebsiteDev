import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  Calendar,
  Clock,
  Repeat,
  ArrowRight,
  MapPin,
  Users,
  Phone,
  FileText,
  ArrowLeft,
  CheckCircle,
  Loader2,
  ChevronDown,
  Check,
  Mail,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type FormData = {
  countryCode: string;
  phone: string;
  tripType: 'one-way' | 'round-trip';
  pickupLocation: string;
  dropoffLocation: string;
  passengers: number;
  notes: string;
  // Fields for anonymous users
  firstName: string;
  lastName: string;
  email: string;
};

const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
];
export const PrivateRidePage = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedReturnDate, setSelectedReturnDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [selectedReturnTime, setSelectedReturnTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(POPULAR_COUNTRIES[0]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: {
      tripType: 'one-way',
      countryCode: POPULAR_COUNTRIES[0].code,
      phone: '',
      firstName: '',
      lastName: '',
      email: ''
    }
  });

  // Fetch user profile when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setIsAuthenticated(true);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('phone_number, first_name, last_name, email')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          setUserProfile(profile);
          
          // Pre-fill form with user data
          if (profile?.first_name) setValue('firstName', profile.first_name);
          if (profile?.last_name) setValue('lastName', profile.last_name);
          if (user.email) setValue('email', user.email);
          
          // If user has a phone number, parse and set it in the form
          if (profile?.phone_number) {
            try {
              // Extract the numeric part from the stored phone number
              const cleanPhone = profile.phone_number.replace(/[^\d]/g, '');
              
              // Try to determine the country from the phone number format
              if (profile.phone_number.startsWith('+52')) {
                const mexicoCountry = POPULAR_COUNTRIES.find(c => c.code === 'MX');
                if (mexicoCountry) {
                  setSelectedCountry(mexicoCountry);
                  setValue('countryCode', mexicoCountry.code);
                }
                // Remove the +52 prefix for display
                setValue('phone', cleanPhone.replace(/^52/, ''));
              } else if (profile.phone_number.startsWith('+1')) {
                const usCountry = POPULAR_COUNTRIES.find(c => c.code === 'US');
                if (usCountry) {
                  setSelectedCountry(usCountry);
                  setValue('countryCode', usCountry.code);
                }
                // Remove the +1 prefix for display
                setValue('phone', cleanPhone.replace(/^1/, ''));
              } else if (profile.phone_number.startsWith('+44')) {
                const ukCountry = POPULAR_COUNTRIES.find(c => c.code === 'GB');
                if (ukCountry) {
                  setSelectedCountry(ukCountry);
                  setValue('countryCode', ukCountry.code);
                }
                // Remove the +44 prefix for display
                setValue('phone', cleanPhone.replace(/^44/, ''));
              } else {
                // Default to showing the full number if we can't parse it
                setValue('phone', cleanPhone);
              }
            } catch (err) {
              console.error('Error parsing phone number:', err);
              // Just set the phone number as-is if parsing fails
              setValue('phone', profile.phone_number.replace(/[^\d]/g, ''));
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setIsAuthenticated(false);
      }
    };

    fetchUserProfile();
  }, [setValue]);

  const phone = watch('phone');
  const tripType = watch('tripType');

  const validatePhoneNumber = (value: string) => {
    if (!value) return 'Phone number is required';
    
    // Only check that the value contains digits
    const cleanedValue = value.replace(/[^\d]/g, '');
    
    if (cleanedValue.length < 7) {
      return 'Phone number must be at least 7 digits';
    }
    
    return true;
  };
  const onSubmit = async (data: FormData) => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    if (data.tripType === 'round-trip' && !selectedReturnTime) {
      setError('Please select return time for round trip');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Format date and time
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const formattedTime = selectedTime.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Format return date and time if round trip
      let formattedReturnDate = formattedDate; // Use same date for return
      let formattedReturnTime = null;
      
      if (data.tripType === 'round-trip' && selectedReturnTime) {
        formattedReturnTime = selectedReturnTime.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Format phone number - just combine country code with cleaned digits
      const cleanedPhone = data.phone.replace(/[^\d]/g, '');
      const fullNumber = `${selectedCountry.dial}${cleanedPhone}`;

      // Prepare the request data
      const requestData: any = {
        phone_number: fullNumber,
        pickup_date: formattedDate,
        pickup_time: formattedTime,
        return_date: formattedReturnDate,
        return_time: formattedReturnTime,
        trip_type: data.tripType,
        pickup_location: data.pickupLocation,
        dropoff_location: data.dropoffLocation,
        passengers: data.passengers,
        notes: data.notes,
        status: 'pending'
      };

      // Add user-specific or anonymous-specific fields
      if (user) {
        requestData.user_id = user.id;
      } else {
        requestData.first_name = data.firstName;
        requestData.last_name = data.lastName;
        requestData.email = data.email;
      }

      // Submit booking request
      const { error: submitError } = await supabase
        .from('private_ride_requests')
        .insert([requestData]);

      if (submitError) throw submitError;

      setSuccess(true);
      
      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      console.error('Error submitting booking:', err);
      setError(err.message || 'Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center mr-4 text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gold">Private Ride Booking</h1>
          </div>

          {/* Info Banner for Anonymous Users */}
          {!isAuthenticated && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-200">
                    Booking as Guest
                  </h3>
                  <div className="mt-1 text-sm text-blue-300">
                    <p>You're submitting a request as a guest. We'll contact you via the provided email and phone number with booking details.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 text-center mb-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Booking Request Submitted!</h3>
              <p className="text-gray-300">
                We'll review your request and contact you shortly to confirm the details.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-8 text-red-200">
              {error}
            </div>
          )}

          {/* Booking Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Contact Information Section */}
              <div className="border-b border-gray-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                
                {/* Name Fields (for anonymous users or editable for authenticated users) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-white mb-2 font-medium">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        {...register('firstName', { required: 'First name is required' })}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                        placeholder="Enter your first name"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-red-400 text-sm">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white mb-2 font-medium">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        {...register('lastName', { required: 'Last name is required' })}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                        placeholder="Enter your last name"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-red-400 text-sm">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="mb-4">
                  <label className="block text-white mb-2 font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                      placeholder="Enter your email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-red-400 text-sm">{errors.email.message}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-white mb-2 font-medium">
                    Contact Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountrySelector(!showCountrySelector)}
                        className="h-full px-3 bg-gray-800 border border-gray-700 rounded-lg text-white flex items-center gap-2 hover:bg-gray-700 transition-colors min-w-[100px]"
                      >
                        <span>{selectedCountry.dial}</span>
                        <ChevronDown size={16} className={`transition-transform ${showCountrySelector ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showCountrySelector && (
                        <div className="absolute z-50 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                          <div className="py-1 max-h-48 overflow-y-auto">
                            {POPULAR_COUNTRIES.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center justify-between"
                                onClick={() => {
                                  setSelectedCountry(country);
                                  setValue('countryCode', country.code);
                                  setShowCountrySelector(false);
                                }}
                              >
                                <span>{country.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">{country.dial}</span>
                                  {selectedCountry.code === country.code && (
                                    <Check size={16} className="text-gold" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        {...register('phone', { validate: validatePhoneNumber })}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-red-400 text-sm">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Trip Details Section */}
              <div className="border-b border-gray-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Trip Details</h3>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-white mb-2 font-medium">
                      Pickup Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        minDate={new Date()}
                        dateFormat="MM/dd/yyyy"
                        className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                        placeholderText="Select date"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white mb-2 font-medium">
                      Pickup Time
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <DatePicker
                        selected={selectedTime}
                        onChange={(time) => setSelectedTime(time)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                        placeholderText="Select time"
                      />
                    </div>
                  </div>
                </div>

                {/* Trip Type Selection */}
                <div className="mb-6">
                  <label className="block text-white mb-2 font-medium">
                    Trip Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        tripType === 'one-way' 
                          ? 'bg-gold/20 border-gold text-white' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        value="one-way"
                        {...register('tripType')}
                        className="sr-only"
                      />
                      <ArrowRight className="w-5 h-5 mr-2" />
                      <span>One Way</span>
                    </label>
                    
                    <label 
                      className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        tripType === 'round-trip' 
                          ? 'bg-gold/20 border-gold text-white' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        value="round-trip"
                        {...register('tripType')}
                        className="sr-only"
                      />
                      <Repeat className="w-5 h-5 mr-2" />
                      <span>Round Trip</span>
                    </label>
                  </div>
                </div>

                {/* Return Date and Time (only for round trip) */}
                {tripType === 'round-trip' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 p-4 bg-gold/5 rounded-lg border border-gold/20 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-white mb-2 font-medium">
                        Return Time
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <DatePicker
                          selected={selectedReturnTime}
                          onChange={(time) => setSelectedReturnTime(time)}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={30}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                          placeholderText="Select return time"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup Location */}
                <div className="mb-4">
                  <label className="block text-white mb-2 font-medium">
                    Pickup Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('pickupLocation', { required: 'Pickup location is required' })}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                      placeholder="Enter pickup address"
                    />
                  </div>
                  {errors.pickupLocation && (
                    <p className="mt-1 text-red-400 text-sm">{errors.pickupLocation.message}</p>
                  )}
                </div>

                {/* Destination */}
                <div className="mb-4">
                  <label className="block text-white mb-2 font-medium">
                    Destination
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('dropoffLocation', { required: 'Destination is required' })}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                      placeholder="Enter destination address"
                    />
                  </div>
                  {errors.dropoffLocation && (
                    <p className="mt-1 text-red-400 text-sm">{errors.dropoffLocation.message}</p>
                  )}
                </div>

                {/* Number of Passengers */}
                <div>
                  <label className="block text-white mb-2 font-medium">
                    Number of Passengers
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      {...register('passengers', { 
                        required: 'Number of passengers is required',
                        min: {
                          value: 1,
                          message: 'Minimum 1 passenger required'
                        }
                      })}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                      placeholder="Enter number of passengers"
                    />
                  </div>
                  {errors.passengers && (
                    <p className="mt-1 text-red-400 text-sm">{errors.passengers.message}</p>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-white mb-2 font-medium">
                  Additional Notes
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                    placeholder="Special requests or requirements..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Submit Booking Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};