import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, X, Eye, EyeOff, Phone, ChevronDown, Check, User } from 'lucide-react';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { supabase, ensureProfile } from '../lib/supabase';
import { LegalModal } from './LegalModal';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: any) => void;
  referralCode?: string;
};

type SignInFormData = {
  email: string;
  password: string;
};

type SignUpFormData = {
  email: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  referralCode?: string;
};

const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, referralCode: propReferralCode }) => {
  const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(POPULAR_COUNTRIES[0]);
  const [referralCode, setReferralCode] = useState(propReferralCode || '');
  const [showReferralInput, setShowReferralInput] = useState(!!propReferralCode);

  const signInForm = useForm<SignInFormData>();
  const signUpForm = useForm<SignUpFormData>({
    defaultValues: {
      countryCode: POPULAR_COUNTRIES[0].code,
      phone: '',
      referralCode: propReferralCode || ''
    }
  });
  
  const phone = signUpForm.watch('phone');
  
  const validatePhoneNumber = (value: string) => {
    if (!value) return 'Phone number is required';
    
    // Clean the phone number to only contain digits
    const cleanedValue = value.replace(/[^\d]/g, '');
    const fullNumber = `${selectedCountry.dial}${cleanedValue}`;
    
    try {
      // For Mexico, we'll be extra forgiving
      if (selectedCountry.code === 'MX') {
        // Just check if there's a reasonable number of digits (7-15)
        if (cleanedValue.length >= 7 && cleanedValue.length <= 15) {
          return true;
        }
        return 'Please enter a valid Mexican phone number';
      }
      
      // For other countries, use the library validation
      try {
        if (!isValidPhoneNumber(fullNumber, selectedCountry.code as CountryCode)) {
          return 'Invalid phone number format';
        }
        
        const phoneNumber = parsePhoneNumber(fullNumber, selectedCountry.code as CountryCode);
        if (!phoneNumber.isValid()) {
          return 'Invalid phone number';
        }
        
        // Some countries may not correctly identify mobile vs landline, so we'll make this check optional
        const phoneType = phoneNumber.getType();
        if (phoneType && phoneType !== 'MOBILE' && phoneType !== 'FIXED_LINE_OR_MOBILE') {
          return 'Please enter a valid mobile number';
        }
        
        return true;
      } catch (err) {
        // If library validation fails, fall back to basic length check
        if (cleanedValue.length >= 7 && cleanedValue.length <= 15) {
          return true;
        }
        return 'Invalid phone number format';
      }
    } catch (err) {
      console.error('Phone validation error:', err);
      // Be very forgiving if all else fails
      if (cleanedValue.length >= 7) {
        return true;
      }
      return 'Please enter a valid phone number';
    }
  };

  const handleSubmitSignIn = async (data: SignInFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Ensure profile exists
      if (signInData.user) {
        await ensureProfile(signInData.user.id, signInData.user.email || '');
        
        // Call the onAuthSuccess callback with the user data
        if (onAuthSuccess) {
          onAuthSuccess(signInData.user);
        }
      }
      
      onClose();
    } catch (err: any) {
      console.error('Sign in error:', {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      });
      
      // Set a more user-friendly error message
      if (err.message?.toLowerCase().includes('invalid login')) {
        setError('Invalid email or password');
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError('An error occurred during sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check if passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Format phone number
      const fullNumber = `${selectedCountry.dial}${data.phone.replace(/[^\d]/g, '')}`;
      const phoneNumber = parsePhoneNumber(fullNumber, selectedCountry.code as CountryCode);
      const formattedPhone = phoneNumber.format('E.164');
      
      // Prepare user metadata with phone and referral code if provided
      const metadata: any = {
        phone_number: formattedPhone,
        first_name: data.firstName,
        last_name: data.lastName
      };
      
      // Add referral code to metadata if provided
      if (referralCode) {
        metadata.referral_code = referralCode;
      }
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: metadata
        }
      });
      
      if (signUpError) {
        throw signUpError;
      }
      
      // If the user was created successfully and we have a user object
      if (signUpData?.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              phone_number: formattedPhone,
              first_name: data.firstName,
              last_name: data.lastName
            })
            .eq('id', signUpData.user.id);
            
          if (profileError) {
            console.error('Error updating profile with name and phone:', profileError);
          }
      
          // Call the onAuthSuccess callback with the user data
          if (onAuthSuccess) {
            onAuthSuccess(signUpData.user);
          }
          
          // Close the modal since the user is now signed in
          onClose();
          return;
        } catch (err) {
          console.error('Error updating profile with phone number:', err);
        }
      }
      
      // If we didn't return early (user wasn't created or callback failed)
      setSuccess('Account created successfully! You can now sign in.');
      setActiveTab('signIn');
      signUpForm.reset();
    } catch (err: any) {
      console.error('Sign up error:', {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      });
      
      // Set a more user-friendly error message
      if (err.message?.toLowerCase().includes('passwords do not match')) {
        setError('Passwords do not match');
      } else if (err.message?.toLowerCase().includes('phone')) {
        setError('Please enter a valid phone number');
      } else if (err.message?.toLowerCase().includes('email')) {
        setError('Please enter a valid email address');
      } else if (err.message?.toLowerCase().includes('password')) {
        setError('Password must be at least 8 characters long');
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        setError('Too many signup attempts. Please try again later.');
      } else {
        setError('An error occurred during sign up. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openLegalModal = (type: 'terms' | 'privacy') => {
    setLegalModalType(type);
  };

  const closeLegalModal = () => {
    setLegalModalType(null);
  };

  // Add this function to get the appropriate placeholder based on country
  const getPhonePlaceholder = () => {
    switch (selectedCountry.code) {
      case 'MX':
        return "55 1234 5678"; // Format for Mexico (area code + number)
      case 'US':
      case 'CA':
        return "(555) 555-5555"; // Format for US/Canada
      case 'GB':
        return "07700 900123"; // Format for UK
      default:
        return "Phone number";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-gray-900 rounded-xl max-w-md w-full relative overflow-hidden border border-gold/30">
          {/* Background design element */}
          <div className="absolute inset-0 overflow-hidden z-0 opacity-20">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gold/30 blur-2xl"></div>
            <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-gold/20 blur-2xl"></div>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-white z-50 p-1"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          
          {/* Header */}
          <div className="py-6 px-8 text-center relative z-10">
            <h2 className="text-2xl font-bold text-gold">Welcome to ULimo</h2>
            <p className="text-gray-400 mt-1">The ultimate party bus experience</p>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800 relative z-10">
            <button
              className={`flex-1 py-3 font-medium transition-colors ${
                activeTab === 'signIn' 
                  ? 'text-gold border-b-2 border-gold' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('signIn')}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-3 font-medium transition-colors ${
                activeTab === 'signUp' 
                  ? 'text-gold border-b-2 border-gold' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('signUp')}
            >
              Sign Up
            </button>
          </div>
          
          {/* Form container */}
          <div className="p-6 relative z-10">
            {/* Error messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
            
            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-200 text-sm">
                {success}
              </div>
            )}
            
            {/* Sign In Form */}
            {activeTab === 'signIn' && (
              <form onSubmit={signInForm.handleSubmit(handleSubmitSignIn)}>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="signInEmail">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail size={16} className="text-gold/70" />
                    </div>
                    <input
                      id="signInEmail"
                      type="email"
                      {...signInForm.register('email', { required: true })}
                      className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="your@email.com"
                    />
                  </div>
                  {signInForm.formState.errors.email && (
                    <p className="mt-1 text-red-400 text-xs">Email is required</p>
                  )}
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="signInPassword">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock size={16} className="text-gold/70" />
                    </div>
                    <input
                      id="signInPassword"
                      type={showPasswords ? "text" : "password"}
                      {...signInForm.register('password', { required: true })}
                      className="w-full bg-gray-800 text-white py-2 pl-10 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="mt-1 text-red-400 text-xs">Password is required</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}
            
            {/* Sign Up Form */}
            {activeTab === 'signUp' && (
              <form onSubmit={signUpForm.handleSubmit(handleSubmitSignUp)}>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="signUpEmail">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail size={16} className="text-gold/70" />
                    </div>
                    <input
                      id="signUpEmail"
                      type="email"
                      {...signUpForm.register('email', { required: true })}
                      className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="your@email.com"
                    />
                  </div>
                  {signUpForm.formState.errors.email && (
                    <p className="mt-1 text-red-400 text-xs">Email is required</p>
                  )}
                </div>

                {/* First and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 mb-1 text-sm" htmlFor="firstName">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={16} className="text-gold/70" />
                      </div>
                      <input
                        id="firstName"
                        type="text"
                        {...signUpForm.register('firstName', { required: 'First name is required' })}
                        className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                        placeholder="John"
                      />
                    </div>
                    {signUpForm.formState.errors.firstName && (
                      <p className="mt-1 text-red-400 text-xs">{signUpForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1 text-sm" htmlFor="lastName">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={16} className="text-gold/70" />
                      </div>
                      <input
                        id="lastName"
                        type="text"
                        {...signUpForm.register('lastName', { required: 'Last name is required' })}
                        className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                        placeholder="Doe"
                      />
                    </div>
                    {signUpForm.formState.errors.lastName && (
                      <p className="mt-1 text-red-400 text-xs">{signUpForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Phone Number */}
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="signUpPhone">
                    Phone Number
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
                                  signUpForm.setValue('countryCode', country.code);
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
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Phone size={16} className="text-gold/70" />
                      </div>
                      <input
                        id="signUpPhone"
                        type="tel"
                        {...signUpForm.register('phone', { validate: validatePhoneNumber })}
                        className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                        placeholder={getPhonePlaceholder()}
                      />
                    </div>
                  </div>
                  {signUpForm.formState.errors.phone && (
                    <p className="mt-1 text-red-400 text-xs">{signUpForm.formState.errors.phone.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="signUpPassword">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock size={16} className="text-gold/70" />
                    </div>
                    <input
                      id="signUpPassword"
                      type={showPasswords ? "text" : "password"}
                      {...signUpForm.register('password', { 
                        required: true,
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        }
                      })}
                      className="w-full bg-gray-800 text-white py-2 pl-10 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <p className="mt-1 text-red-400 text-xs">
                      {signUpForm.formState.errors.password.message || 'Password is required'}
                    </p>
                  )}
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-300 mb-1 text-sm" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock size={16} className="text-gold/70" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showPasswords ? "text" : "password"}
                      {...signUpForm.register('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: value => value === signUpForm.getValues('password') || 'Passwords do not match'
                      })}
                      className="w-full bg-gray-800 text-white py-2 pl-10 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-red-400 text-xs">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                
                {/* Referral Code */}
                {propReferralCode && (
                  <div className="mb-6">
                    <label className="block text-gray-300 mb-1 text-sm">
                      Referral Code
                    </label>
                    <div className="bg-gray-800/50 border border-gold/30 rounded-lg p-3 flex items-center">
                      <span className="text-gold font-mono">{propReferralCode}</span>
                      <Check className="ml-auto text-green-400" size={16} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      You were referred by a friend
                    </p>
                  </div>
                )}
                
                {/* Add Terms and Privacy Policy Agreement */}
                <div className="mb-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        {...signUpForm.register('agreeToTerms', { 
                          required: 'You must agree to the Terms and Privacy Policy'
                        })}
                        className="w-4 h-4 border border-gray-700 rounded bg-gray-800 focus:ring-1 focus:ring-gold"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="terms" className="text-sm text-gray-300">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => openLegalModal('terms')}
                          className="text-gold hover:text-yellow-400 underline"
                        >
                          Terms of Use
                        </button>
                        {' '}and{' '}
                        <button
                          type="button"
                          onClick={() => openLegalModal('privacy')}
                          className="text-gold hover:text-yellow-400 underline"
                        >
                          Privacy Policy
                        </button>
                      </label>
                      {signUpForm.formState.errors.agreeToTerms && (
                        <p className="mt-1 text-red-400 text-xs">
                          {signUpForm.formState.errors.agreeToTerms.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Legal Modal */}
      {legalModalType && (
        <LegalModal 
          isOpen={true}
          onClose={closeLegalModal}
          type={legalModalType}
        />
      )}
    </>
  );
};