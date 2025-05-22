import React from 'react';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type Deal = {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  location_name?: string;
  location_address?: string;
  deal_date?: string;
  status: string;
  city?: string;
};

type DealCardProps = {
  deal: {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url: string | null;
    location_name?: string;
    location_address?: string;
    deal_date?: string;
    city?: string;
  };
  formatDate: (date: string) => string;
  onSelect: (dealId: string) => void;
};

export const DealCard: React.FC<DealCardProps> = ({ 
  deal, 
  formatDate, 
  onSelect 
}) => {
  return (
    <div 
      className="bg-gray-900 rounded-xl overflow-hidden border border-gold/30 hover:border-gold/50 transition-all group hover:shadow-[0_0_15px_rgba(255,215,0,0.2)] h-full cursor-pointer"
      onClick={() => onSelect(deal.id)}
    >
      {/* Deal Image */}
      <div className="relative h-28 sm:h-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
        <img 
          src={deal.image_url || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
          alt={deal.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute bottom-0 left-0 p-4 z-20">
          <div className="flex items-center space-x-2">
            <span className="bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
              ${deal.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Deal Content */}
      <div className="p-2 sm:p-3">
        <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 group-hover:text-gold transition-colors line-clamp-1">
          {deal.title}
        </h3>
        <p className="text-gray-400 text-[10px] sm:text-xs mb-1.5 line-clamp-2">
          {deal.description}
        </p>
        
        {/* Deal Details */}
        <div className="space-y-0.5 mb-2">
          {deal.location_name && (
            <div className="flex items-center text-[10px] sm:text-xs">
              <MapPin className="w-2.5 h-2.5 text-gold mr-1 flex-shrink-0" />
              <span className="text-gray-300 truncate">{deal.location_name}</span>
            </div>
          )}
          {deal.deal_date && (
            <div className="flex items-center text-[10px] sm:text-xs">
              <Calendar className="w-2.5 h-2.5 text-gold mr-1 flex-shrink-0" />
              <span className="text-gray-300">{formatDate(deal.deal_date)}</span>
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <button
          className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-1 sm:py-1.5 rounded-lg transition-colors flex items-center justify-center text-[10px] sm:text-xs"
        >
          Get This Deal
          <ArrowRight size={10} className="ml-1" />
        </button>
      </div>
    </div>
  );
};