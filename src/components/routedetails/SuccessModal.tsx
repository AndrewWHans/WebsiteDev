import React from 'react';
import { X, Sparkles, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SuccessModalProps = {
  showSuccessModal: boolean;
  setShowSuccessModal: (show: boolean) => void;
  bookingDetails: {
    id: string;
    route: string;
    date: string;
    time: string;
    quantity: number;
    price: number;
    total: number;
    paymentMethod?: 'card' | 'wallet' | 'miles';
  } | null;
};

export const SuccessModal: React.FC<SuccessModalProps> = ({
  showSuccessModal,
  setShowSuccessModal,
  bookingDetails
}) => {
  const navigate = useNavigate();
  
  if (!showSuccessModal || !bookingDetails) return null;
  
  const formatDate = (dateString: string) => {
    try {
      // For date-only strings (YYYY-MM-DD), add time component to avoid timezone shifts
      const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
      const date = new Date(dateWithTime);
      
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return dateString;
    }
  };
  
  const handleDoneClick = () => {
    setShowSuccessModal(false);
    
    // If the payment was made with miles, redirect to the My Tickets page
    if (bookingDetails.paymentMethod === 'miles') {
      navigate('/tickets');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gold/30 overflow-hidden">
        <div className="flex justify-end p-2">
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-slow"></div>
            <Sparkles className="w-full h-full text-gold animate-pulse p-4" />
          </div>
          <h2 className="text-2xl font-bold text-gold mb-4">Tickets Booked!</h2>
          <p className="text-gray-300 mb-6">
            Your tickets have been confirmed for the following ride:
          </p>
          
          <div className="bg-black/40 rounded-lg p-4 mb-6 text-left space-y-3 border border-gold/20">
            <div className="flex justify-between">
              <span className="text-gray-400">Route</span>
              <span className="text-white font-semibold">{bookingDetails.route}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-white">{formatDate(bookingDetails.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time</span>
              <span className="text-white">{bookingDetails.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tickets</span>
              <span className="text-white">{bookingDetails.quantity}</span>
            </div>
            {bookingDetails.paymentMethod === 'miles' ? (
              <div className="flex justify-between pt-2 border-t border-gray-800">
                <span className="text-gray-300">Payment</span>
                <span className="text-emerald-400 font-bold">Paid with Miles</span>
              </div>
            ) : (
            <div className="flex justify-between pt-2 border-t border-gray-800">
              <span className="text-gray-300">Total</span>
              <span className="text-gold font-bold">${bookingDetails.total.toFixed(2)}</span>
            </div>
            )}
          </div>
          
          <div className="flex items-center justify-center mb-6">
            <Ticket className="text-green-400 mr-2" size={20} />
            <span className="text-green-400">
              Tickets are now in your wallet
            </span>
          </div>
          
          <button 
            onClick={handleDoneClick}
            className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-lg transition-colors"
          >
            {bookingDetails.paymentMethod === 'miles' ? 'View My Tickets' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}; 