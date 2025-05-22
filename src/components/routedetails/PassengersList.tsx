import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

type PassengersListProps = {
  passengerProfiles: any[];
  totalPassengers: number;
};

export const PassengersList: React.FC<PassengersListProps> = ({ 
  passengerProfiles, 
  totalPassengers 
}) => {
  const [showPassengerInfo, setShowPassengerInfo] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gold/30"
    >
      <button 
        className="w-full flex justify-between items-center py-1"
        onClick={() => setShowPassengerInfo(!showPassengerInfo)}
      >
        <h2 className="text-lg sm:text-xl font-bold text-white">Who's Going</h2>
        {showPassengerInfo ? (
          <ChevronUp className="text-gold" size={20} />
        ) : (
          <ChevronDown className="text-gold" size={20} />
        )}
      </button>
      
      {showPassengerInfo && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="mt-3 sm:mt-4 overflow-hidden"
        >
          {passengerProfiles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {passengerProfiles.map((profile) => (
                <div 
                  key={profile.id} 
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${profile.color} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm`}
                  title="Fellow passenger"
                >
                  {profile.initial}
                </div>
              ))}
              {totalPassengers > passengerProfiles.length && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  +{totalPassengers - passengerProfiles.length}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm sm:text-base">Be the first to book this route!</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}; 