import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Award, 
  Copy, 
  Share2, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Loader2,
  Gift,
  Sparkles,
  UserPlus,
  Bus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';

export const ReferralPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [referralReward, setReferralReward] = useState(300); // Default value
  const [signupBonus, setSignupBonus] = useState(50); // Default value

  // Parse referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      setReferralCode(code);
      fetchReferrerInfo(code);
    }
    
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });
    
    // Load reward amounts
    loadRewardAmounts();
  }, [location]);

  const loadRewardAmounts = async () => {
    try {
      // Get referral reward amount
      const { data: referralData, error: referralError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_reward')
        .maybeSingle();
        
      if (!referralError && referralData?.value) {
        setReferralReward(parseInt(referralData.value));
      }
      
      // Get signup bonus amount
      const { data: signupData, error: signupError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'registration_miles_bonus')
        .maybeSingle();
        
      if (!signupError && signupData?.value) {
        setSignupBonus(parseInt(signupData.value));
      }
    } catch (err) {
      console.error('Error loading reward amounts:', err);
      // Keep using default values if there's an error
    }
  };

  const fetchReferrerInfo = async (code: string) => {
    try {
      setLoading(true);
      
      // Get referrer ID from referral code
      const { data: referralData, error: referralError } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', code)
        .maybeSingle();
        
      if (referralError) throw referralError;
      
      if (referralData) {
        // Get referrer name
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('first_name, last_name, name')
          .eq('id', referralData.user_id)
          .maybeSingle();
          
        if (userError) throw userError;
        
        if (userData) {
          const displayName = userData.first_name && userData.last_name
            ? `${userData.first_name} ${userData.last_name}`
            : userData.name;
            
          setReferrerName(displayName);
        }
      }
    } catch (err) {
      console.error('Error fetching referrer info:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const url = `${window.location.origin}/refer?code=${referralCode}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const handleSignUp = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (newUser: any) => {
    setUser(newUser);
    
    // If there was a referral code, navigate to home page
    if (referralCode) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
            alt="Friends enjoying a night out" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            {referralCode && referrerName ? (
              <>
                <div className="inline-flex items-center space-x-2 bg-gold/20 rounded-full px-4 py-2 mb-6">
                  <Gift className="w-5 h-5 text-gold" />
                  <span className="text-gold font-medium">Special Invitation</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
                  {referrerName} Invited You to ULimo!
                </h1>
                <p className="text-xl text-gray-300 mb-8">
                  Join ULimo today and get <span className="text-gold font-bold">{signupBonus} miles</span> to use toward your first ride!
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center space-x-2 bg-gold/20 rounded-full px-4 py-2 mb-6">
                  <Award className="w-5 h-5 text-gold" />
                  <span className="text-gold font-medium">Refer & Earn</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
                  Share ULimo, Earn Miles
                </h1>
                <p className="text-xl text-gray-300 mb-8">
                  Invite friends to join ULimo and earn <span className="text-gold font-bold">{referralReward} miles</span> for each friend who signs up and takes their first ride!
                </p>
              </>
            )}
            
            {!user && (
              <button 
                onClick={handleSignUp}
                className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full text-lg transition-colors"
              >
                {referralCode ? 'Accept Invitation' : 'Sign Up Now'}
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900/50 to-black relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gold">How It Works</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Referring friends is easy and rewarding
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Share2 className="w-8 h-8 text-gold" />,
                  title: "Share Your Code",
                  description: "Send your unique referral code to friends via text, email, or social media"
                },
                {
                  icon: <UserPlus className="w-8 h-8 text-gold" />,
                  title: "Friends Sign Up",
                  description: "Your friends create an account using your referral code"
                },
                {
                  icon: <Award className="w-8 h-8 text-gold" />,
                  title: "Earn Miles",
                  description: `Get ${referralReward} miles when they take their first ride with ULimo`
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="bg-gray-900 rounded-xl p-6 border border-gold/30 hover:border-gold/50 transition-all"
                >
                  <div className="bg-gold/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-6 text-gold">Why Join ULimo?</h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              ULimo is revolutionizing how college students experience nightlife transportation
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Affordable Luxury",
                  description: "Premium party bus experience at student-friendly prices",
                  icon: <Bus className="w-6 h-6 text-gold" />
                },
                {
                  title: "Social Experience",
                  description: "Meet new people and travel with friends",
                  icon: <Users className="w-6 h-6 text-gold" />
                },
                {
                  title: "Miles Program",
                  description: "Earn miles with every ride and redeem for discounts",
                  icon: <Award className="w-6 h-6 text-gold" />
                },
                {
                  title: "Exclusive Perks",
                  description: "Skip the line at partner venues and access special deals",
                  icon: <Sparkles className="w-6 h-6 text-gold" />
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900 rounded-xl p-6 border border-gold/30 hover:border-gold/50 transition-all"
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-gold/10 p-3 rounded-full mr-4">
                      {benefit.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">{benefit.title}</h3>
                  </div>
                  <p className="text-gray-400">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900/50 to-black relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            {user ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-6">Share Your Referral Code</h2>
                <p className="text-xl text-gray-300 mb-8">
                  Invite friends to join ULimo and earn {referralReward} miles for each successful referral!
                </p>
                
                <div className="bg-gray-900 rounded-xl border border-gold/30 p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-white mb-4">Your Referral Code</h3>
                  <div className="relative mb-6">
                    <input
                      type="text"
                      value={referralCode || 'Loading...'}
                      readOnly
                      className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-3 px-4 text-center font-mono text-xl text-white"
                    />
                    <button
                      onClick={copyReferralLink}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 rounded-md py-2 px-3 flex items-center transition-colors"
                    >
                      {copySuccess ? (
                        <span className="text-green-400 text-sm font-medium">Copied!</span>
                      ) : (
                        <>
                          <Copy size={16} className="mr-2 text-gray-300" />
                          <span className="text-gray-300 text-sm font-medium">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <button 
                    className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                    onClick={() => {
                      const url = `${window.location.origin}/refer?code=${referralCode}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'Join me on ULimo!',
                          text: `Use my referral code ${referralCode} to sign up for ULimo and get ${signupBonus} miles!`,
                          url: url
                        }).catch(err => {
                          console.error('Error sharing:', err);
                          navigator.clipboard.writeText(url);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        });
                      } else {
                        navigator.clipboard.writeText(url);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }
                    }}
                  >
                    <Share2 size={20} className="mr-2" />
                    Share Your Link
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-6">Ready to Join ULimo?</h2>
                <p className="text-xl text-gray-300 mb-8">
                  Sign up now and start earning miles with every ride!
                </p>
                <button 
                  onClick={handleSignUp}
                  className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full transition-colors inline-flex items-center"
                >
                  Sign Up Now <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          referralCode={referralCode}
        />
      )}
    </div>
  );
};