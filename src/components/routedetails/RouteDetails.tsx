import React from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

type RouteDetailsProps = {
  pickup: { name: string; address: string; } | null;
  dropoff: { name: string; address: string; } | null;
};

export const RouteDetails: React.FC<RouteDetailsProps> = ({ pickup, dropoff }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gold/30"
    >
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Route Details</h2>
      
      {/* Pickup */}
      <div className="flex mb-4 sm:mb-6">
        <div className="mr-2 sm:mr-3 flex flex-col items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gold/20 rounded-full flex items-center justify-center">
            <MapPin className="text-gold" size={16} />
          </div>
          <div className="w-0.5 h-10 sm:h-12 bg-gray-700 my-1"></div>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base">Pickup</h3>
          <p className="text-base sm:text-lg text-white mb-1 leading-tight">{pickup?.name}</p>
          <p className="text-xs sm:text-sm text-gray-400 break-words">{pickup?.address}</p>
        </div>
      </div>
      
      {/* Dropoff */}
      <div className="flex">
        <div className="mr-2 sm:mr-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gold/20 rounded-full flex items-center justify-center">
            <MapPin className="text-gold" size={16} />
          </div>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base">Destination</h3>
          <p className="text-base sm:text-lg text-white mb-1 leading-tight">{dropoff?.name}</p>
          <p className="text-xs sm:text-sm text-gray-400 break-words">{dropoff?.address}</p>
        </div>
      </div>
    </motion.div>
  );
}; 