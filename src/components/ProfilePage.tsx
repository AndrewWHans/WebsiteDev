import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, Loader2, User, Phone, School, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ProfilePageProps = {
  onBack: () => void;
};

type ProfileFormData = {
  first_name: string;
  last_name: string;
  phone_number?: string;
  college?: string;
  greek_life?: string;
};

const GREEK_ORGANIZATIONS = [
  'Alpha Chi Omega', 'Alpha Delta Pi', 'Alpha Phi', 'Chi Omega',
  'Delta Delta Delta', 'Delta Gamma', 'Gamma Phi Beta',
  'Kappa Alpha Theta', 'Kappa Kappa Gamma', 'Pi Beta Phi',
  'Sigma Kappa', 'Zeta Tau Alpha', 'Alpha Tau Omega',
  'Beta Theta Pi', 'Delta Tau Delta', 'Kappa Sigma',
  'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta',
  'Phi Kappa Psi', 'Pi Kappa Alpha', 'Sigma Alpha Epsilon',
  'Sigma Chi', 'Sigma Nu', 'Sigma Phi Epsilon', 'Theta Chi'
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [greekSuggestions, setGreekSuggestions] = useState<string[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProfileFormData>();

  const watchGreekLife = watch('greek_life', '');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (watchGreekLife) {
      const filtered = GREEK_ORGANIZATIONS.filter(org => 
        org.toLowerCase().includes(watchGreekLife.toLowerCase())
      );
      setGreekSuggestions(filtered);
    } else {
      setGreekSuggestions([]);
    }
  }, [watchGreekLife]);

  useEffect(() => {
    // Cleanup preview URL when component unmounts
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData(profile);
      setValue('first_name', profile.first_name || '');
      setValue('last_name', profile.last_name || '');
      setValue('phone_number', profile.phone_number || '');
      setValue('college', profile.college || '');
      setValue('greek_life', profile.greek_life || '');
      
      if (profile.profile_picture_url) {
        setPreviewUrl(profile.profile_picture_url);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      setProfilePicture(file);
      
      // Clear previous blob URL if it exists
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadProfilePicture = async (userId: string, file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const safeFileExt = fileExt?.toLowerCase() || 'jpg';
      const filePath = `${userId}/profile-picture.${safeFileExt}`;

      console.log('Uploading file to path:', filePath);

      const { error: uploadError, data } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          upsert: true,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            console.log(`Upload progress: ${percentage.toFixed(2)}%`);
            setUploadProgress(percentage);
          }
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, getting public URL');

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadProfilePicture:', error);
      return null;
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let profilePictureUrl = profileData?.profile_picture_url;
      
      // Only upload if there's a new profile picture
      if (profilePicture) {
        console.log('Starting profile picture upload');
        profilePictureUrl = await uploadProfilePicture(user.id, profilePicture);
        
        if (!profilePictureUrl) {
          throw new Error('Failed to upload profile picture');
        }
      }

      console.log('Updating profile with picture URL:', profilePictureUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number || null,
          college: data.college || null,
          greek_life: data.greek_life || null,
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setSuccess('Profile updated successfully!');
      // Update the profileData state to reflect changes
      setProfileData(prev => ({
        ...prev,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number || null,
        college: data.college || null,
        greek_life: data.greek_life || null,
        profile_picture_url: profilePictureUrl
      }));
      
      // Clear the profilePicture state since it's been uploaded
      setProfilePicture(null);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <div className="flex items-center mb-8">
            <button 
              onClick={onBack}
              className="flex items-center mr-4 text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gold">Your Profile</h1>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gold/30">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-200 text-sm">
                  {success}
                </div>
              )}

              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-800 rounded-full overflow-hidden mb-4 relative group">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <User size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingImage ? (
                      <Loader2 size={24} className="text-white animate-spin" />
                    ) : (
                      <Upload size={24} className="text-white" />
                    )}
                  </div>
                  
                  {/* Upload progress indicator */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div 
                        className="h-full bg-gold" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer text-gold hover:text-gold/80 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? 'Uploading...' : 'Change Photo'}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, GIF or WEBP (max 5MB)
                </p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">
                    First Name
                  </label>
                  <input
                    {...register('first_name')}
                    className="w-full bg-gray-800 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 text-sm">
                    Last Name
                  </label>
                  <input
                    {...register('last_name')}
                    className="w-full bg-gray-800 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-300 mb-1 text-sm">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Phone size={16} className="text-gold/70" />
                  </div>
                  <input
                    {...register('phone_number')}
                    type="tel"
                    className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="+1 (555) 555-5555"
                  />
                </div>
              </div>

              {/* College */}
              <div>
                <label className="block text-gray-300 mb-1 text-sm">
                  College
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <School size={16} className="text-gold/70" />
                  </div>
                  <input
                    {...register('college')}
                    className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="University of Example"
                  />
                </div>
              </div>

              {/* Greek Life */}
              <div className="relative">
                <label className="block text-gray-300 mb-1 text-sm">
                  Greek Life
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Users size={16} className="text-gold/70" />
                  </div>
                  <input
                    {...register('greek_life')}
                    className="w-full bg-gray-800 text-white py-2 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="Start typing to search..."
                    autoComplete="off"
                  />
                </div>
                {greekSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {greekSuggestions.map((org, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-gray-300 text-sm"
                        onClick={() => {
                          setValue('greek_life', org);
                          setGreekSuggestions([]);
                        }}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex justify-center items-center"
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};