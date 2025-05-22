import React, { useState, useEffect } from 'react';
import { ArrowLeft, Award, Copy, ExternalLink, Plane, Calendar, Clock, Loader2, Gift, Share2, Ticket, Users, CheckCircle, XCircle, Bus, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type WalletPageProps = {
  onBack: () => void;
};

type CreditTransaction = {
  id: string;
  amount: number;
  description: string;
  type: string;
  created_at: string;
};

type PointTransaction = {
  id: string;
  points: number;
  description: string;
  type: string;
  created_at: string;
};

type TicketBooking = {
  id: string;
  route_id: string;
  time_slot: string;
  quantity: number;
  total_price: number;
  status: string;
  booking_date: string;
  route: {
    date: string;
    price: number;
    pickup: { name: string };
    dropoff: { name: string };
  };
};

export const WalletPage: React.FC<WalletPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [milesBalance, setMilesBalance] = useState(0);
  const [milesTier, setMilesTier] = useState('Bronze');
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [mileTransactions, setMileTransactions] = useState<PointTransaction[]>([]);
  const [ticketBookings, setTicketBookings] = useState<TicketBooking[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [activeTab, setActiveTab] = useState<'referral'|'miles'|'tickets'>('tickets');
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralReward, setReferralReward] = useState(300);
  const [referralMilesEarned, setReferralMilesEarned] = useState(0);
  const [showRefunded, setShowRefunded] = useState(true);
  
  // Define tier thresholds and rewards
  const tierThresholds = {
    Bronze: 0,
    Silver: 500,
    Gold: 1000,
    Platinum: 2000,
    Diamond: 5000
  };
  
  const tierRewards = {
    Bronze: ['5% off rides'],
    Silver: ['10% off rides', 'Skip-the-line (1x per month)'],
    Gold: ['15% off rides', 'Skip-the-line (2x per month)', 'Free seat upgrade'],
    Platinum: ['20% off rides', 'Skip-the-line (unlimited)', 'Free seat upgrade', 'VIP access'],
    Diamond: ['25% off rides', 'Skip-the-line (unlimited)', 'Free seat upgrade', 'VIP access', 'Priority booking']
  };

  // Calculate progress to next tier
  const calculateNextTier = () => {
    if (milesTier === 'Diamond') return { nextTier: null, progress: 100, milesNeeded: 0 };
    
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const currentIndex = tiers.indexOf(milesTier);
    const nextTier = tiers[currentIndex + 1];
    const nextThreshold = tierThresholds[nextTier as keyof typeof tierThresholds];
    const currentThreshold = tierThresholds[milesTier as keyof typeof tierThresholds];
    
    const milesNeeded = nextThreshold - milesBalance;
    const progress = Math.min(100, Math.round(((milesBalance - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
    
    return { nextTier, progress, milesNeeded };
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      // Load point balance
      const { data: milesData, error: milesError } = await supabase
        .from('wallet_points')
        .select('points, tier')
        .eq('user_id', user.id)
        .single();

      if (milesError && milesError.code !== 'PGRST116') {
        throw milesError;
      }

      // Load credit transactions
      const { data: creditTransactions, error: transactionError } = await supabase
        .from('credit_transactions')
        .select('id, amount, description, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionError) {
        throw transactionError;
      }

      // Load point transactions
      const { data: mileTransactions, error: mileTransactionError } = await supabase
        .from('point_transactions')
        .select('id, points, description, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (mileTransactionError) {
        throw mileTransactionError;
      }

      // Calculate actual referral miles earned from transactions
      let totalReferralMiles = 0;
      if (mileTransactions) {
        totalReferralMiles = mileTransactions
          .filter(tx => tx.description.includes('Referral reward for new user signup') && tx.points > 0)
          .reduce((sum, tx) => sum + tx.points, 0);
      }
      setReferralMilesEarned(totalReferralMiles);

      // Load ticket bookings
      const { data: ticketBookingsData, error: ticketBookingsError } = await supabase
        .from('ticket_bookings')
        .select(`
          id,
          route_id,
          time_slot,
          quantity,
          total_price,
          status,
          booking_date,
          route:routes (
            date,
            price,
            pickup:locations!routes_pickup_location_fkey (name),
            dropoff:locations!routes_dropoff_location_fkey (name)
          )
        `)
        .eq('user_id', user.id)
        .or(`status.eq.confirmed,status.eq.completed,status.eq.refunded,status.eq.cancelled`) // Include all ticket statuses for history
        .order('booking_date', { ascending: false });

      if (ticketBookingsError) {
        throw ticketBookingsError;
      }

      // Load referral code
      const { data: referralData, error: referralError } = await supabase
        .from('referral_codes')
        .select('code, uses')
        .eq('user_id', user.id)
        .single();

      if (referralError && referralError.code !== 'PGRST116') {
        throw referralError;
      }
      
      // Get referral count
      if (referralData) {
        setReferralCode(referralData.code);
        setReferralCount(referralData.uses || 0);
      }
      
      // Get referral reward amount
      const { data: rewardData, error: rewardError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_reward')
        .single();
        
      if (!rewardError && rewardData) {
        setReferralReward(parseInt(rewardData.value));
      }

      // Set state with loaded data
      setMilesBalance(milesData?.points || 0);
      setMilesTier(milesData?.tier || 'Bronze');
      setCreditTransactions(creditTransactions || []);
      setMileTransactions(mileTransactions || []);
      setTicketBookings(ticketBookingsData || []);
      setReferralCode(referralData?.code || '');

    } catch (err: any) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900/60 text-green-400';
      case 'completed':
        return 'bg-blue-900/60 text-blue-400';
      case 'cancelled':
        return 'bg-red-900/60 text-red-400';
      case 'refunded':
        return 'bg-purple-900/60 text-purple-400';
      default:
        return 'bg-gray-900/60 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      case 'refunded':
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatTimeSlot = (timeSlot: string) => {
    try {
      return new Date(`1970-01-01T${timeSlot}`).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return timeSlot;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'text-amber-600';
      case 'Silver': return 'text-gray-300';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-cyan-300';
      case 'Diamond': return 'text-blue-300';
      default: return 'text-gold';
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const { nextTier, progress, milesNeeded } = calculateNextTier();

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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button 
              onClick={onBack}
              className="flex items-center mr-4 text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gold">Your Wallet</h1>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points Section */}
            <div className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden lg:col-span-2">
              {/* Header */}
              <div className="bg-gray-800 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="bg-gold rounded-full p-2 mr-3">
                      <Award size={24} className="text-black" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Miles</h2>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Points Info */}
                  <div>
                    <div className="mb-3">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-white mr-2">{milesBalance.toLocaleString()}</span>
                        <span className="text-lg text-gray-300">miles</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className={`mr-2 font-semibold text-lg ${getTierColor(milesTier)}`}>{milesTier} Tier</span>
                        {nextTier && (
                          <span className="text-sm text-gray-300">
                            {milesNeeded.toLocaleString()} miles to {nextTier}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    {nextTier && (
                      <div className="mb-4">
                        <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-gold h-full rounded-full" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Tier Benefits */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-white">{milesTier} Benefits</h4>
                        <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full font-medium">Active</span>
                      </div>
                      <ul className="text-sm text-gray-200 space-y-2">
                        {tierRewards[milesTier as keyof typeof tierRewards].map((reward, index) => (
                          <li key={index} className="flex items-center">
                            <div className="w-2 h-2 bg-gold rounded-full mr-2"></div>
                            {reward}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Right Column - Referral */}
                  <div>
                    <h3 className="font-semibold text-white text-lg mb-2">Refer Friends, Earn {referralReward} Miles</h3>
                    <p className="text-gray-300 mb-4">
                      For each friend who signs up and takes their first ride, you'll earn {referralReward} miles.
                    </p>
                    
                    {/* Referral Code - Removed display and copy button */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <button 
                          className="flex items-center justify-center w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-4 rounded-lg transition-colors"
                          onClick={() => {
                            // Create the referral URL
                            const url = `${window.location.origin}/refer?code=${referralCode}`;
                            
                            // Try to use the Web Share API if available
                            if (navigator.share) {
                              navigator.share({
                                title: 'Join ULimo with my referral code',
                                text: `Use my referral code to get a discount on your first ULimo ride!`,
                                url: url
                              }).catch(err => {
                                console.error('Error sharing:', err);
                                // Fallback to clipboard if sharing fails
                                navigator.clipboard.writeText(url);
                                setCopySuccess(true);
                                setTimeout(() => setCopySuccess(false), 2000);
                              });
                            } else {
                              // Fallback for browsers that don't support Web Share API
                              navigator.clipboard.writeText(url);
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2000);
                            }
                          }}
                        >
                          <Share2 size={18} className="mr-2" />
                          {copySuccess ? 'Link Copied!' : 'Share & Earn Miles'}
                        </button>
                      </div>
                      
                      <div className="mt-4 bg-gray-800/50 rounded-lg p-4 border border-gold/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <UserPlus className="w-4 h-4 text-gold mr-2" />
                            <span className="text-gray-300 text-sm">Successful Referrals</span>
                          </div>
                          <span className="text-gold font-bold">{referralCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">Miles Earned</span>
                          <span className="text-gold font-bold">{referralMilesEarned}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Point History or Tickets Section */}
              <div className="p-6">
                {/* Section Tabs */}
                <div className="flex border-b border-gray-800 mb-6">
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex-1 py-3 font-medium ${
                      activeTab === 'tickets' 
                        ? 'text-gold border-b-2 border-gold' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    My Tickets
                  </button>
                  <button
                    onClick={() => setActiveTab('miles')}
                    className={`flex-1 py-3 font-medium ${
                      activeTab === 'miles' 
                        ? 'text-gold border-b-2 border-gold' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Mile History
                  </button>
                </div>
                
                {/* Point History */}
                {activeTab === 'miles' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-white text-lg">Recent Miles Activity</h3>
                      {mileTransactions.length > 0 && (
                        <button className="text-gold text-sm font-medium hover:underline">
                          View All
                        </button>
                      )}
                    </div>
                    
                    {mileTransactions.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 bg-gray-800/50 rounded-lg">
                        No mile transactions yet
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-800 bg-gray-800/40 rounded-lg overflow-hidden">
                        {mileTransactions.map((transaction) => (
                          <div key={transaction.id} className="p-4 flex justify-between items-center hover:bg-gray-800 transition-colors">
                            <div className="flex items-start">
                              <div className={`rounded-full p-2 mr-3 ${transaction.points >= 0 ? 'bg-green-900 text-green-400' : 'bg-purple-900 text-purple-400'}`}>
                                {transaction.points >= 0 ? (
                                  <Plane size={16} />
                                ) : (
                                  <Gift size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-white">{transaction.description}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDate(transaction.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold text-lg ${transaction.points >= 0 ? 'text-green-400' : 'text-purple-400'}`}>
                              {Math.abs(transaction.points)} {transaction.points >= 0 ? 'miles earned' : 'miles redeemed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tickets */}
                {activeTab === 'tickets' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-white text-lg">Your Tickets</h3>
                      {ticketBookings.length > 0 && (
                        <button className="text-gold text-sm font-medium hover:underline">
                          View All
                        </button>
                      )}
                    </div>
                    
                    {ticketBookings.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 bg-gray-800/50 rounded-lg">
                        <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p>No tickets purchased yet</p>
                        <button className="mt-3 text-gold hover:underline">
                          Browse available routes
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {ticketBookings.map((booking) => {
                          // Skip refunded tickets if showRefunded is false
                          if (!showRefunded && booking.status === 'refunded') return null;
                          
                          return (
                          <div key={booking.id} className={`bg-gray-800/60 rounded-lg overflow-hidden border ${
                            booking.status === 'refunded'
                              ? 'border-purple-700/40 opacity-70'
                              : 'border-gray-700 hover:border-gold/30'
                          } transition-all`}>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className={`p-2 rounded-full mr-3 ${
                                    booking.status === 'refunded'
                                      ? 'bg-purple-900/20 text-purple-400'
                                      : 'bg-gold/20 text-gold'
                                  }`}>
                                    <Bus className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {booking.route?.pickup?.name} to {booking.route?.dropoff?.name}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                      {formatDate(booking.route?.date)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-gray-300 text-sm mb-1">
                                    Time: {formatTimeSlot(booking.time_slot)}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${getStatusColor(booking.status)}`}>
                                    {getStatusIcon(booking.status)}
                                    <span className="ml-1">
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-sm text-gray-300">
                                    {booking.quantity} {booking.quantity === 1 ? 'seat' : 'seats'}
                                  </span>
                                </div>
                                <span className="text-gold font-semibold">
                                  ${booking.total_price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                    
                    {/* Filter toggle for refunded tickets */}
                    {ticketBookings.some(booking => booking.status === 'refunded') && (
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {showRefunded ? 'Showing all tickets' : 'Hiding refunded tickets'}
                        </span>
                        <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showRefunded}
                            onChange={() => setShowRefunded(!showRefunded)}
                            className="mr-2 h-4 w-4 rounded border-gray-700 bg-gray-800 text-gold focus:ring-gold"
                          />
                          Show refunded tickets
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/*  How to Earn More Points Section */}
            <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gold/30 p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center">
                <Award size={20} className="text-gold mr-2" />
                Ways to Earn More Miles
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-5 hover:shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-shadow">
                  <h4 className="font-medium text-white mb-2 text-lg">Take a Ride</h4>
                  <p className="text-gray-300 mb-3">
                    Earn miles for every ride you take with ULimo.
                  </p>
                  <span className="text-gold font-medium">+50 miles</span>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-5 hover:shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-shadow">
                  <h4 className="font-medium text-white mb-2 text-lg">Refer Friends</h4>
                  <p className="text-gray-300 mb-3">
                    Earn {referralReward} miles when a friend uses your code and takes their first ride.
                  </p>
                  <span className="text-gold font-medium">+{referralReward} miles per referral</span>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-5 hover:shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-shadow">
                  <h4 className="font-medium text-white mb-2 text-lg">Social Media</h4>
                  <p className="text-gray-300 mb-3">
                    Share your ULimo experience on social media and tag us to earn miles.
                  </p>
                  <span className="text-gold font-medium">+100 miles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};