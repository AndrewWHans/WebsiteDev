import React from 'react';
import { X, MapPin, Calendar, DollarSign, ExternalLink, Users, Star, Minus, Plus, Wind, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type DealDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  deal: {
    id: string;
    title: string;
    description: string;
    price: number;
    city?: string;
    image_url: string | null;
    location_name?: string;
    location_address?: string;
    deal_date?: string;
  } | null;
  formatDate: (date: string) => string;
  user: any;
};

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  isOpen,
  onClose,
  deal,
  formatDate,
  user
}) => {
  const [quantity, setQuantity] = useState(1);
  const [milesBalance, setMilesBalance] = useState(0);
  const [milesValue, setMilesValue] = useState(0.02);
  const [milesAmount, setMilesAmount] = useState(0);
  const [milesDiscount, setMilesDiscount] = useState(0);
  const [milesApplied, setMilesApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Load user's miles balance and miles value
  useEffect(() => {
    if (user && deal) {
      loadUserMiles();
      loadMilesValue();
    }
  }, [user, deal]);

  // Calculate miles discount when miles amount changes
  useEffect(() => {
    const discount = milesAmount * milesValue;
    setMilesDiscount(discount);
  }, [milesAmount, milesValue]);

  const loadUserMiles = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_points')
        .select('points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setMilesBalance(data?.points || 0);
    } catch (err) {
      console.error('Error loading user miles:', err);
      setError('Failed to load miles balance. Please try again.');
    }
  };

  const loadMilesValue = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'point_value')
        .maybeSingle();
        
      if (error) throw error;
      if (!data) {
        console.warn('Point value not found in system settings');
        return; // Keep default value of 0.02
      }
      
      const value = parseFloat(data.value);
      if (!isNaN(value)) {
        setMilesValue(value);
      }
    } catch (err) {
      console.error('Error loading miles value:', err);
      // Keep using default value if there's an error
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
      
      // Reset miles if applied
      if (milesApplied) {
        setMilesApplied(false);
        setMilesAmount(0);
        setMilesDiscount(0);
      }
    }
  };

  const calculateTotal = () => {
    if (!deal) return 0;
    return deal.price * quantity;
  };

  const getDiscountedTotal = () => {
    const total = calculateTotal();
    return milesApplied ? Math.max(0, total - milesDiscount) : total;
  };

  const handleApplyMiles = async () => {
    if (!user || milesAmount <= 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate miles amount
      if (milesAmount > milesBalance) {
        throw new Error(`You only have ${milesBalance} miles available`);
      }
      
      // Calculate discount
      const discount = milesAmount * milesValue;
      
      // Calculate total
      const total = calculateTotal();
      
      // Check if discount approximately equals total (full payment)
      const isFullPayment = Math.abs(discount - total) < 0.001;
      
      // Modified validation for partial payments
      if (!isFullPayment) {
        const remainingAmount = total - discount;
        if (remainingAmount > 0 && remainingAmount < 0.50) {
          // Calculate the maximum miles that can be applied while keeping the total at least $0.50
          const maxAllowedDiscount = total - 0.50;
          const maxAllowedMiles = Math.floor(maxAllowedDiscount / milesValue);
          
          throw new Error(`For partial payment, please use ${maxAllowedMiles} miles or less to keep the card payment at least $0.50, or use enough miles to cover the full amount.`);
        }
      }
      
      // Set miles discount
      setMilesDiscount(discount);
      setMilesApplied(true);
    } catch (error: any) {
      console.error('Error applying miles:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMiles = () => {
    setMilesApplied(false);
    setMilesAmount(0);
    setMilesDiscount(0);
    setError(null);
  };

  const handleStripeCheckout = async () => {
    if (!user || !deal) return;
    
    setProcessingPayment(true);
    setError(null);
    
    try {
      // Call the Edge Function to create Stripe checkout session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-deal-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            dealId: deal.id,
            quantity: quantity,
            milesAmount: milesApplied ? milesAmount : 0,
            milesDiscount: milesApplied ? milesDiscount : 0
          }),
        }
      );

      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (!url) throw new Error('No checkout URL received');

      // Store state in sessionStorage before redirecting
      sessionStorage.setItem('dealPaymentInProgress', 'true');
      
      // Redirect to Stripe checkout
      window.location.href = url;

    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'An error occurred during checkout. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleMilesOnlyPayment = async () => {
    if (!user || !deal) return;
    
    setProcessingPayment(true);
    setError(null);
    
    try {
      // Validate miles amount
      if (milesAmount > milesBalance) {
        throw new Error(`You only have ${milesBalance} miles available`);
      }
      
      // Calculate total price
      const totalPrice = calculateTotal();
      
      // Ensure miles discount covers the total
      if (milesDiscount < totalPrice) {
        throw new Error(`Miles discount (${milesDiscount.toFixed(2)}) doesn't cover total (${totalPrice.toFixed(2)})`);
      }
      
      // Call the Edge Function to process miles-only payment
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-deal-miles-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            dealId: deal.id,
            quantity: quantity,
            milesAmount: milesAmount,
            milesValue: milesValue // Pass the miles value to ensure consistency
          }),
        }
      );

      const { success, error: responseError } = await response.json();

      if (responseError) throw new Error(responseError);
      if (!success) throw new Error('Failed to process miles payment');

      // Show success message and close modal
      alert('Deal purchased successfully with miles!');
      onClose();
      
    } catch (error: any) {
      console.error('Miles payment error:', error);
      setError(error.message || 'An error occurred during miles payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFreeDealClaim = async () => {
    if (!user || !deal) return;
    
    setProcessingPayment(true);
    setError(null);
    
    try {
      // Call the Edge Function to process free deal claim
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-free-deal-claim`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            dealId: deal.id,
            quantity: quantity
          }),
        }
      );

      const { success, error: responseError } = await response.json();

      if (responseError) throw new Error(responseError);
      if (!success) throw new Error('Failed to claim free deal');

      // Show success message and close modal
      alert('Free deal claimed successfully!');
      onClose();
      
    } catch (error: any) {
      console.error('Free deal claim error:', error);
      setError(error.message || 'An error occurred while claiming the free deal. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      alert('Please sign in to purchase this deal');
      return;
    }
    
    setShowBookingForm(true);
  };

  const handlePurchase = () => {
    // If deal is free, claim it directly without payment
    if (calculateTotal() === 0) {
      handleFreeDealClaim();
      return;
    }
    
    // If miles fully cover the total, process directly without Stripe
    if (milesApplied && milesDiscount >= calculateTotal()) {
      handleMilesOnlyPayment();
      return;
    }
    
    handleStripeCheckout();
  };

  if (!isOpen || !deal) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 rounded-xl max-w-2xl w-full border border-gold/30 overflow-hidden relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-20 p-1 bg-black/30 rounded-full"
        >
          <X size={20} />
        </button>

        {/* Deal Image */}
        <div className="relative h-48 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
          <img 
            src={deal.image_url || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
            alt={deal.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 p-6 z-20">
            <h2 className="text-3xl font-bold text-white">{deal.title}</h2>
          </div>
        </div>
        
        {/* Deal Content */}
        <div className="p-6 relative z-10 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {/* Price Tag */}
          <div className="absolute -top-10 right-6 bg-gold text-black text-xl font-bold px-4 py-2 rounded-lg shadow-lg">
            {deal.price === 0 ? 'FREE' : `$${deal.price.toFixed(2)}`}
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-white mb-2">About This Deal</h3>
            <p className="text-gray-300 whitespace-pre-line">
              {deal.description}
            </p>
          </div>
          
          {/* Details */}
          <div className="bg-black/30 rounded-xl p-3 mb-4 border border-gold/20">
            <h3 className="text-base font-semibold text-white mb-2">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deal.location_name && (
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-gold mr-2 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">{deal.location_name}</p>
                    {deal.location_address && (
                      <p className="text-gray-400 text-xs">{deal.location_address}</p>
                    )}
                  </div>
                </div>
              )}
              
              {deal.deal_date && (
                <div className="flex items-start">
                  <Calendar className="w-4 h-4 text-gold mr-2 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Date</p>
                    <p className="text-gray-400 text-xs">{formatDate(deal.deal_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <DollarSign className="w-4 h-4 text-gold mr-2 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">Price</p>
                  <p className="text-gray-400 text-xs">{deal.price === 0 ? 'Free' : `$${deal.price.toFixed(2)}`}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white mb-2">What's Included</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start">
                <Star className="w-4 h-4 text-gold mr-2 mt-1" />
                <span className="text-gray-300 text-sm">Skip the line entry</span>
              </li>
              <li className="flex items-start">
                <Star className="w-4 h-4 text-gold mr-2 mt-1" />
                <span className="text-gray-300 text-sm">Special ULimo customer perks</span>
              </li>
              <li className="flex items-start">
                <Star className="w-4 h-4 text-gold mr-2 mt-1" />
                <span className="text-gray-300 text-sm">Exclusive access to VIP areas</span>
              </li>
              <li className="flex items-start">
                <Users className="w-4 h-4 text-gold mr-2 mt-1" />
                <span className="text-gray-300 text-sm">Valid for one person</span>
              </li>
            </ul>
          </div>
          
          {/* Booking Form */}
          {showBookingForm ? (
            <div>
              <div className="mb-3">
                <label className="block text-gray-300 text-xs font-medium mb-1">
                  Quantity
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || processingPayment}
                    className="w-10 h-10 rounded-l-lg bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="h-10 px-4 bg-gray-800 flex items-center justify-center text-white font-medium border-x border-gray-700">
                    {quantity}
                  </div>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={processingPayment}
                    className="w-10 h-10 rounded-r-lg bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {/* Miles Redemption Section - Hidden for free deals */}
              {deal.price > 0 && (
                <div className="mb-4 bg-gray-800/80 rounded-lg p-3 border border-gold/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="bg-gold/20 p-1.5 rounded-full mr-2">
                        <Wind className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">ULimo Miles</p>
                        <p className="text-xs text-gray-400">
                          Balance: <span className="text-gold">{milesBalance}</span> miles
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {milesApplied ? (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300 text-sm">Miles applied:</span>
                        <span className="text-gold text-sm font-medium">{milesAmount.toLocaleString()} miles</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300 text-sm">Discount:</span>
                        <span className="text-emerald-400 text-sm font-medium">
                          -${milesDiscount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleRemoveMiles}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors"
                      >
                        Remove Miles
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="number"
                          min="0"
                          max={milesBalance}
                          value={milesAmount || ''}
                          onChange={(e) => setMilesAmount(parseInt(e.target.value) || 0)}
                          className="block w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-gold focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="Enter miles amount"
                        />
                        <button
                          onClick={() => {
                            // Calculate the maximum miles that can be applied based on the total price
                            const totalPrice = calculateTotal();
                            const maxApplicableMiles = Math.floor(totalPrice / milesValue);
                            
                            // If partial payment would result in less than $0.50 remaining, adjust the max miles
                            const minRemainingForStripe = 0.50;
                            let adjustedMaxMiles = maxApplicableMiles;
                            
                            // If applying all miles would leave less than $0.50 but not cover the full amount
                            const remainingAfterMaxMiles = totalPrice - (maxApplicableMiles * milesValue);
                            if (remainingAfterMaxMiles > 0 && remainingAfterMaxMiles < minRemainingForStripe) {
                              // Either use enough miles to make it free, or keep at least $0.50 for Stripe
                              if (milesBalance >= Math.ceil(totalPrice / milesValue)) {
                                // User has enough miles to cover the full amount
                                adjustedMaxMiles = Math.ceil(totalPrice / milesValue);
                              } else {
                                // Adjust to keep at least $0.50 for Stripe
                                adjustedMaxMiles = Math.floor((totalPrice - minRemainingForStripe) / milesValue);
                              }
                            }
                            
                            // Use the smaller of user's miles balance or adjusted max applicable miles
                            const maxMiles = Math.min(milesBalance, adjustedMaxMiles);
                            setMilesAmount(maxMiles);
                          }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                        >
                          Max
                        </button>
                      </div>
                      
                      {milesAmount > 0 && (
                        <div className="text-sm text-gray-400 mb-3">
                          {milesAmount} miles = ${(milesAmount * milesValue).toFixed(2)} discount
                        </div>
                      )}
                      
                      {/* Add warning message for invalid miles amount */}
                      {milesAmount > 0 && 
                       calculateTotal() - (milesAmount * milesValue) > 0 && 
                       calculateTotal() - (milesAmount * milesValue) < 0.50 && (
                        <div className="text-xs text-amber-400 mb-3 flex items-start">
                          <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                          <span>Discounted total must be at least $0.50 or cover the full amount</span>
                        </div>
                      )}
                      
                      <button
                        onClick={handleApplyMiles}
                        disabled={
                          milesAmount <= 0 || 
                          milesAmount > milesBalance || 
                          loading ||
                          (Math.abs(milesAmount * milesValue - calculateTotal()) > 0.001 &&
                           calculateTotal() - (milesAmount * milesValue) > 0 && 
                           calculateTotal() - (milesAmount * milesValue) < 0.50)
                        }
                        className="w-full bg-gold hover:bg-yellow-400 text-black py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          'Apply Miles'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Price summary */}
              <div className="p-3 bg-gray-800/50 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300 text-sm">Price per ticket</span>
                  <span className="text-white text-sm">${deal.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300 text-sm">Quantity</span>
                  <span className="text-white text-sm">x {quantity}</span>
                </div>
                {milesApplied && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 text-sm">Miles Discount</span>
                    <span className="text-emerald-400 text-sm">-${milesDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold mt-3 pt-2 border-t border-gray-700">
                  <span className="text-white text-base">Total</span>
                  <span className="text-gold text-base">${getDiscountedTotal().toFixed(2)}</span>
                </div>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="mb-3 p-2 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePurchase}
                  disabled={processingPayment}
                  className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : calculateTotal() === 0 ? (
                    'Claim Free Deal'
                  ) : milesApplied && milesDiscount >= calculateTotal() ? (
                    'Pay with Miles'
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>
                
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="w-full border border-gray-600 text-gray-300 hover:bg-gray-800 font-medium py-2 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                className="flex-1 bg-gold hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center"
                onClick={handleBookNow}
              >
                Get This Deal
                <ArrowRight size={18} className="ml-2" />
              </button>
              
              {deal.location_address && (
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(deal.location_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-transparent border border-gold text-gold hover:bg-gold/10 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm"
                >
                  View on Map
                  <ExternalLink size={16} className="ml-2" />
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};