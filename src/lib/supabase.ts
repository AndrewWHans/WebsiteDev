import { createClient } from '@supabase/supabase-js';

// Set timezone to EST/EDT
const timeZone = 'America/New_York';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log Supabase initialization
console.log('Initializing Supabase client with URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Function to format date to EST/EDT - fixing timezone issues
export const formatToEST = (date: Date | string) => {
  // Create a date object from the input
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use Intl.DateTimeFormat for more reliable timezone handling
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
};

// Function to format time to EST/EDT
export const formatTimeToEST = (timeString: string) => {
  // Ensure we have a valid time string
  if (!timeString) return '';
  
  try {
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error, timeString);
    return timeString; // Return original if parsing fails
  }
};

// Function to convert date to EST/EDT for database
export const toEST = (date: Date) => {
  // Create a new date object in the EST timezone
  const options = { timeZone };
  const estDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date);
  
  // Build date from parts to avoid timezone shifts
  const parts = Object.fromEntries(
    estDateParts.map(part => [part.type, part.value])
  );
  
  return new Date(
    `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}T` +
    `${parts.hour.padStart(2, '0')}:${parts.minute.padStart(2, '0')}:${parts.second.padStart(2, '0')}`
  );
};

// Function to ensure profile exists
export const ensureProfile = async (userId: string, email: string) => {
  try {
    // Get user metadata to check for first and last name
    const { data: userData } = await supabase.auth.getUser();
    const metadata = userData?.user?.user_metadata;
    
    // Call RPC function to create profile if it doesn't exist
    const { data, error } = await supabase.rpc('ensure_user_profile', {
      user_id: userId,
      user_email: email
    });

    if (error) {
      console.error('Error ensuring profile:', error);
      throw error;
    }
    
    // If we have first_name and last_name in metadata, update the profile
    if (metadata?.first_name && metadata?.last_name) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: metadata.first_name,
          last_name: metadata.last_name
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('Error updating profile with name:', updateError);
      }
    }
  } catch (error) {
    console.error('Error in ensureProfile:', error);
    throw error;
  }
};

// Add this new function to correctly parse and display dates from Supabase
export const parseAndFormatDate = (dateString: string) => {
  if (!dateString) return '';
  
  try {
    // Parse the date string - assuming it's in ISO format from Supabase
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return dateString;
    }
    
    // Add a day to compensate for potential timezone issues
    // This is a workaround - remove if it doesn't fix the issue
    // const adjustedDate = new Date(date);
    // adjustedDate.setDate(date.getDate());
    
    // Format with explicit timezone to ensure correct display
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error parsing date:', error, dateString);
    return dateString;
  }
};