import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, ArrowRight, MapPin, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Deal = {
  id: string;
  title: string;
  description: string;
  price: number;
  city?: string;
  image_url: string | null;
  location_name?: string;
  location_address?: string;
  deal_date?: string;
  status: string;
};

export function NightlifeDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section className="py-16 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
          alt="Nightlife background" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block bg-gold/20 p-2 rounded-full mb-4">
            <PartyPopper size={28} className="text-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nightlife Deals</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Exclusive promotions and packages for the ultimate night out experience
          </p>
        </div>

        {/* Deal cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : deals.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-400">No deals available at the moment. Check back soon!</p>
            </div>
          ) : (
            deals.map((deal) => (
              <div 
                key={deal.id} 
                className="bg-gray-800/80 rounded-xl overflow-hidden border border-gold/30 hover:border-gold/50 transition-all group hover:shadow-[0_0_15px_rgba(255,215,0,0.2)]"
              >
                {/* Deal Image */}
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10"></div>
                  <img 
                    src={deal.image_url || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
                    alt={deal.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 p-4 z-20">
                    <div className="flex items-center space-x-2">
                      <span className="bg-gold text-black text-sm font-bold px-3 py-1 rounded-full">
                        ${deal.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Deal Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
                    {deal.title}
                  </h3>
                  <p className="text-gray-400 mb-4 line-clamp-2">
                    {deal.description}
                  </p>
                  
                  {/* Deal Details */}
                  <div className="space-y-2 mb-6">
                    {deal.location_name && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gold mr-2 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{deal.location_name}</span>
                      </div>
                    )}
                    {deal.deal_date && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gold mr-2 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">
                          {formatDate(deal.deal_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* View All Button */}
        <div className="text-center">
          <button 
            onClick={() => navigate('/deals')}
            className="bg-transparent border border-gold text-gold hover:bg-gold/10 font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
          >
            View All Deals
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
} 