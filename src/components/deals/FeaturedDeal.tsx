import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowRight, Star } from 'lucide-react';

type FeaturedDealProps = {
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
  };
  formatDate: (date: string) => string;
  onSelect: (dealId: string) => void;
};

export const FeaturedDeal: React.FC<FeaturedDealProps> = ({
  deal,
  formatDate,
  onSelect
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-gold/30 mb-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Image Section */}
        <div className="relative h-64 md:h-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black md:from-transparent md:to-transparent z-10"></div>
          <img 
            src={deal.image_url || "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
            alt={deal.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-gold text-black text-sm font-bold px-3 py-1 rounded-full flex items-center z-20">
            <Star className="w-4 h-4 mr-1" />
            Featured Deal
          </div>
        </div>
        
        {/* Content Section */}
        <div className="p-6 md:p-8 flex flex-col">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{deal.title}</h3>
          
          <div className="bg-black/30 text-gold text-2xl font-bold px-4 py-2 rounded-lg inline-flex items-center self-start mb-4">
            ${deal.price.toFixed(2)}
          </div>
          
          <p className="text-gray-300 mb-6">{deal.description}</p>
          
          <div className="space-y-3 mb-6">
            {deal.location_name && (
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gold mr-2 flex-shrink-0" />
                <span className="text-gray-300">{deal.location_name}</span>
              </div>
            )}
            {deal.deal_date && (
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gold mr-2 flex-shrink-0" />
                <span className="text-gray-300">
                  {formatDate(deal.deal_date)}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-auto">
            <button 
              className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
              onClick={() => onSelect(deal.id)}
            >
              Get This Deal
              <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};