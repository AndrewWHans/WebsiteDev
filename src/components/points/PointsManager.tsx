import React, { useState, useEffect } from 'react';
import { 
  Award, 
  DollarSign, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Info,
  RefreshCw,
  Users,
  Plane,
  UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type PointsManagerProps = {
  pointValue: number;
};

export const PointsManager: React.FC<PointsManagerProps> = ({ pointValue: initialPointValue }) => {
  const [pointValue, setPointValue] = useState<number>(initialPointValue);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentRedemptions, setRecentRedemptions] = useState<any[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalUsers: 0,
    potentialValue: 0
  });
  const [registrationBonus, setRegistrationBonus] = useState<number>(50);
  const [savingBonus, setSavingBonus] = useState<boolean>(false);
  const [bonusSuccess, setBonusSuccess] = useState<string | null>(null);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [referralReward, setReferralReward] = useState<number>(300);
  const [savingReferralReward, setSavingReferralReward] = useState<boolean>(false);
  const [referralRewardSuccess, setReferralRewardSuccess] = useState<string | null>(null);
  const [referralRewardError, setReferralRewardError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadRecentRedemptions();
    loadRegistrationBonus();
    loadReferralReward();
  }, []);

  const loadReferralReward = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_reward')
        .maybeSingle();

      if (data) {
        setReferralReward(parseInt(data.value));
      }
    } catch (err) {
      console.error('Error loading referral reward:', err);
      // Keep using default value if there's an error
    }
  };

  const loadRegistrationBonus = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'registration_miles_bonus')
        .maybeSingle();

      if (data) {
        setRegistrationBonus(parseInt(data.value));
      }
    } catch (err) {
      console.error('Error loading registration bonus:', err);
      // Keep using default value if there's an error
    }
  };

  const loadStats = async () => {
    try {
      // Get total points in the system
      const { data: pointsData, error: pointsError } = await supabase
        .from('wallet_points')
        .select('points');

      if (pointsError) throw pointsError;

      const totalPoints = pointsData?.reduce((sum, item) => sum + item.points, 0) || 0;
      const totalUsers = pointsData?.length || 0;
      const potentialValue = totalPoints * pointValue;

      setStats({
        totalPoints,
        totalUsers,
        potentialValue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentRedemptions = async () => {
    setLoadingRedemptions(true);
    try {
      // Get recent point redemptions
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`
          id,
          user_id,
          points,
          description,
          type,
          created_at,
          user:profiles!point_transactions_user_id_fkey (
            email,
            first_name,
            last_name,
            name
          )
        `)
        .eq('type', 'redeem')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentRedemptions(data || []);
    } catch (error) {
      console.error('Error loading redemptions:', error);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      // Validate point value
      if (pointValue <= 0) {
        throw new Error('Point value must be greater than zero');
      }

      // Check if setting exists
      const { data: existingData, error: checkError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'point_value')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Update or insert the setting
      if (existingData) {
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ value: pointValue.toString() })
          .eq('key', 'point_value');

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert({ key: 'point_value', value: pointValue.toString() });

        if (insertError) throw insertError;
      }

      // Update stats with new point value
      await loadStats();
      
      setSuccess('Point value updated successfully');
    } catch (err: any) {
      console.error('Error saving point value:', err);
      setError(err.message || 'Failed to update point value');
    } finally {
      setSaving(false);
      
      // Clear success message after 3 seconds
      if (success) {
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  };

  const handleSaveBonus = async () => {
    setSavingBonus(true);
    setBonusSuccess(null);
    setBonusError(null);

    try {
      // Validate bonus amount
      if (registrationBonus < 0) {
        throw new Error('Bonus amount cannot be negative');
      }

      // Call the RPC function to update the bonus
      const { data, error } = await supabase.rpc('update_registration_miles_bonus', {
        p_miles_amount: registrationBonus
      });

      if (error) throw error;
      
      setBonusSuccess('Registration bonus updated successfully');
    } catch (err: any) {
      console.error('Error saving registration bonus:', err);
      setBonusError(err.message || 'Failed to update registration bonus');
    } finally {
      setSavingBonus(false);
      
      // Clear success message after 3 seconds
      if (bonusSuccess) {
        setTimeout(() => setBonusSuccess(null), 3000);
      }
    }
  };

  const handleSaveReferralReward = async () => {
    setSavingReferralReward(true);
    setReferralRewardSuccess(null);
    setReferralRewardError(null);

    try {
      // Validate reward amount
      if (referralReward < 0) {
        throw new Error('Reward amount cannot be negative');
      }

      // Call the RPC function to update the reward
      const { data, error } = await supabase.rpc('update_referral_reward', {
        p_reward_amount: referralReward
      });

      if (error) throw error;
      
      setReferralRewardSuccess('Referral reward updated successfully');
    } catch (err: any) {
      console.error('Error saving referral reward:', err);
      setReferralRewardError(err.message || 'Failed to update referral reward');
    } finally {
      setSavingReferralReward(false);
      
      // Clear success message after 3 seconds
      if (referralRewardSuccess) {
        setTimeout(() => setReferralRewardSuccess(null), 3000);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Miles Manager</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure mile values and manage the miles system
          </p>
        </div>
      </div>

      {/* Point Value Configuration */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Mile Value Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set the monetary value of each mile for redemption purposes
          </p>
        </div>
        
        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-green-700">{success}</span>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label htmlFor="pointValue" className="block text-sm font-medium text-gray-700 mb-2">
                Mile Value (USD)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="pointValue"
                  id="pointValue"
                  step="0.01"
                  min="0.01"
                  value={pointValue}
                  onChange={(e) => setPointValue(parseFloat(e.target.value) || 0)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">per mile</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This value determines how much each mile is worth in dollars when redeemed
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start">
            <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Example Conversions:</p>
              <ul className="mt-1 list-disc list-inside pl-2">
                <li>100 miles = ${(100 * pointValue).toFixed(2)}</li>
                <li>500 miles = ${(500 * pointValue).toFixed(2)}</li>
                <li>1000 miles = ${(1000 * pointValue).toFixed(2)}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Registration Bonus Configuration */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">New User Registration Bonus</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set the number of miles granted to new users when they register
          </p>
        </div>
        
        <div className="p-6">
          {bonusSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-green-700">{bonusSuccess}</span>
            </div>
          )}
          
          {bonusError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
              <span className="text-red-700">{bonusError}</span>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label htmlFor="registrationBonus" className="block text-sm font-medium text-gray-700 mb-2">
                Miles Granted on Registration
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Plane className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="registrationBonus"
                  id="registrationBonus"
                  step="1"
                  min="0"
                  value={registrationBonus}
                  onChange={(e) => setRegistrationBonus(parseInt(e.target.value) || 0)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">miles</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This is the number of miles that will be automatically granted to new users when they register
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleSaveBonus}
                disabled={savingBonus}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {savingBonus ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start">
            <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p>Setting this to 0 will disable the registration bonus.</p>
              <p className="mt-1">The bonus is applied automatically when a new user creates an account.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Referral Reward Configuration */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Referral Reward Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set the number of miles granted to users when they successfully refer a new user
          </p>
        </div>
        
        <div className="p-6">
          {referralRewardSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-green-700">{referralRewardSuccess}</span>
            </div>
          )}
          
          {referralRewardError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
              <span className="text-red-700">{referralRewardError}</span>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label htmlFor="referralReward" className="block text-sm font-medium text-gray-700 mb-2">
                Miles Granted for Successful Referral
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="referralReward"
                  id="referralReward"
                  step="1"
                  min="0"
                  value={referralReward}
                  onChange={(e) => setReferralReward(parseInt(e.target.value) || 0)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">miles</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This is the number of miles that will be granted to users when someone they referred completes their first ride
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleSaveReferralReward}
                disabled={savingReferralReward}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {savingReferralReward ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start">
            <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p>Setting this to 0 will disable referral rewards.</p>
              <p className="mt-1">The reward is applied when a referred user completes their first ride.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Points System Stats */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <Award className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Miles in System
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalPoints.toLocaleString()}
                    </div>
                   <div className="ml-2 flex items-center text-sm text-gray-500">
                     <span className="sr-only">Current registration bonus:</span>
                     <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
                       +{registrationBonus} signup | +{referralReward} referral
                     </span>
                   </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Miles Redemption Value
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ${stats.potentialValue.toFixed(2)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Users with Miles
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalUsers.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Redemptions */}
      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Recent Mile Redemptions</h2>
            <p className="mt-1 text-sm text-gray-500">
              History of miles redeemed by users
            </p>
          </div>
          <button 
            onClick={loadRecentRedemptions}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {loadingRedemptions ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : recentRedemptions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No mile redemptions found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miles
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRedemptions.map((redemption) => (
                  <tr key={redemption.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {redemption.user.first_name && redemption.user.last_name
                          ? `${redemption.user.first_name} ${redemption.user.last_name}`
                          : redemption.user.name}
                      </div>
                      <div className="text-sm text-gray-500">{redemption.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-600 font-medium">
                        {Math.abs(redemption.points)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${(Math.abs(redemption.points) * pointValue).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{redemption.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(redemption.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};