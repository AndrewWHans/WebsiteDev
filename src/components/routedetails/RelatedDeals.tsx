import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DealCard } from '../deals/DealCard';
import { DealDetailModal } from '../deals/DealDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface RelatedDealsProps {
  city?: string;
  routeId?: string;
  routeId?: string;
  user?: any;
}

export const RelatedDeals: React.FC<RelatedDealsProps> = ({ city, routeId, user }) => {
  const [relatedDeals, setRelatedDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [hasMoreDeals, setHasMoreDeals] = useState(false);
  const [page, setPage] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const pageSize = 5;

  useEffect(() => {
    if (!city && !routeId) {
      setRelatedDeals([]);
      setHasMoreDeals(false);
      setTotalDeals(0);
      return;
    }
    setLoading(true);
    setPage(0);
    setIsLooping(false);
    loadDeals(0);
    
    // Get total count of deals for this city
    const getTotalCount = async () => {
      try {
        let query = supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        let query = supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        if (city) {
          query = query.eq('city', city);
        }
        
        const { count, error } = await query;
          
        if (error) throw error;
        setTotalDeals(count || 0);
        setHasMoreDeals(count > pageSize);
      } catch (err) {
        console.error('Error getting deal count:', err);
      }
    };
    
    getTotalCount();
  }, [city, routeId]);

  const loadDeals = async (pageToLoad: number) => {
    if (!city && !routeId) return;
    
    if (pageToLoad === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      // Calculate offset based on page number
      const offset = pageToLoad * pageSize;
      
      // If we're looping back to the beginning
      if (isLooping && pageToLoad === 0) {
        setIsLooping(false);
      }
      
      let query = supabase
        .from('deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      // If we have a routeId, prioritize tagged deals for this route
      if (routeId) {
        // First try to get deals tagged to this route
        const { data: taggedDeals, error: taggedError } = await supabase
          .from('deal_route_tags')
          .select('deal_id')
          .eq('route_id', routeId);
        
        if (!taggedError && taggedDeals && taggedDeals.length > 0) {
          // Get the tagged deals first
          const taggedDealIds = taggedDeals.map(tag => tag.deal_id);
          
          const { data: priorityDeals, error: priorityError } = await supabase
            .from('deals')
            .select('*')
            .eq('status', 'active')
            .in('id', taggedDealIds)
            .order('created_at', { ascending: false })
            .limit(pageSize);
          
          if (!priorityError && priorityDeals && priorityDeals.length > 0) {
            // If we have tagged deals, use them
            if (pageToLoad === 0) {
              setRelatedDeals(priorityDeals);
              setHasMoreDeals(priorityDeals.length === pageSize);
            } else {
              setRelatedDeals(prev => [...prev, ...priorityDeals]);
              setHasMoreDeals(priorityDeals.length === pageSize);
            }
            
            setLoading(false);
            setLoadingMore(false);
            return;
          }
        }
        
        // If no tagged deals or error, fall back to city-based filtering
        if (city) {
          query = query.eq('city', city);
        }
      } else if (city) {
      let query = supabase
        .from('deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      // If we have a routeId, prioritize tagged deals for this route
      if (routeId) {
        // First try to get deals tagged to this route
        const { data: taggedDeals, error: taggedError } = await supabase
          .from('deal_route_tags')
          .select('deal_id')
          .eq('route_id', routeId);
        
        if (!taggedError && taggedDeals && taggedDeals.length > 0) {
          // Get the tagged deals first
          const taggedDealIds = taggedDeals.map(tag => tag.deal_id);
          
          const { data: priorityDeals, error: priorityError } = await supabase
            .from('deals')
            .select('*')
            .eq('status', 'active')
            .in('id', taggedDealIds)
            .order('created_at', { ascending: false })
            .limit(pageSize);
          
          if (!priorityError && priorityDeals && priorityDeals.length > 0) {
            // If we have tagged deals, use them
            if (pageToLoad === 0) {
              setRelatedDeals(priorityDeals);
              setHasMoreDeals(priorityDeals.length === pageSize);
            } else {
              setRelatedDeals(prev => [...prev, ...priorityDeals]);
              setHasMoreDeals(priorityDeals.length === pageSize);
            }
            
            setLoading(false);
            setLoadingMore(false);
            return;
          }
        }
        
        // If no tagged deals or error, fall back to city-based filtering
        if (city) {
          query = query.eq('city', city);
        }
      } else if (city) {
        // If no routeId but we have city, filter by city
        query = query.eq('city', city);
      }
      
      // Apply pagination
      query = query.range(offset, offset + pageSize - 1).limit(pageSize);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // If we got fewer results than requested, there are no more deals
      if (!data || data.length < pageSize) {
        setHasMoreDeals(false);
      }
      
      if (pageToLoad === 0) {
        // First page, replace existing deals
        setRelatedDeals(data || []);
        // If we have exactly pageSize deals, there might be more
        setHasMoreDeals(data?.length === pageSize);
      } else {
        // Subsequent pages, append to existing deals
        setRelatedDeals(prev => [...prev, ...(data || [])]);
        
        // If we got fewer results than requested, we've reached the end
        if (!data || data.length < pageSize) {
          setHasMoreDeals(false);
        }
      }
    } catch (err) {
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreDeals = () => {
    if (loadingMore || !hasMoreDeals) return;
    const nextPage = page + 1;
    
    // Check if we need to loop back to the beginning
    const totalPages = Math.ceil(totalDeals / pageSize);
    if (nextPage >= totalPages) {
      setPage(0);
      setIsLooping(true);
      loadDeals(0);
      return;
    }
    
    setPage(nextPage);
    loadDeals(nextPage);
  };

  // Set up event handlers for the swiper
  useEffect(() => {
    if (swiperInstance) {
      // When we reach the end of the carousel
      swiperInstance.on('reachEnd', () => {
        if (hasMoreDeals && !loadingMore) {
          loadMoreDeals();
        }
      });
      
      // When we reach the beginning of the carousel
      swiperInstance.on('reachBeginning', () => {
        // If we're looping, we might want to load the last page
        if (isLooping) {
          const totalPages = Math.ceil(totalDeals / pageSize);
          setPage(totalPages - 1);
          loadDeals(totalPages - 1);
        }
      });
      
      return () => {
        swiperInstance.off('reachEnd');
        swiperInstance.off('reachBeginning');
      };
    }
  }, [swiperInstance, hasMoreDeals, loadingMore, isLooping, totalDeals]);

  const formatDealDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDealSelect = (dealId: string) => {
    const deal = relatedDeals.find((d) => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      setShowDealModal(true);
    }
  };

  if (loading || !city) return null;
  if (relatedDeals.length === 0) return null;

  // Function to handle when we reach the end of the carousel
  const handleReachEnd = () => {
    if (hasMoreDeals && !loadingMore) {
      loadMoreDeals();
    } else if (!hasMoreDeals && totalDeals > pageSize) {
      // If we've loaded all deals but there are more than one page,
      // loop back to the beginning
      setPage(0);
      setIsLooping(true);
      loadDeals(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="relative overflow-visible mt-2 mb-4"
    >
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <motion.h3
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="text-sm sm:text-base font-bold text-white flex items-center gap-2"
        >
          <span>Related Deals</span>
          <span className="bg-gold/80 text-black text-[8px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full">Exclusive</span>
        </motion.h3>
        
        {/* Custom Navigation Buttons */}
        <div className="flex space-x-2">
          <button 
            onClick={() => swiperInstance?.slidePrev()} 
            className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-white border border-gray-700 hover:border-gold/50 transition-colors z-10"
            aria-label="Previous deal"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={() => swiperInstance?.slideNext()} 
            className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-white border border-gray-700 hover:border-gold/50 transition-colors z-10"
            aria-label="Next deal"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      {/* Swiper Carousel */}
      <Swiper
        onSwiper={setSwiperInstance}
        modules={[Navigation, Pagination, Autoplay, A11y]}
        spaceBetween={10}
        slidesPerView={1.2}
        centeredSlides={true}
        loop={!loadingMore && relatedDeals.length > 2}
        autoplay={{
          delay: 6000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        effect="coverflow"
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: false,
        }}
        pagination={{ 
          clickable: true,
          el: '.deals-pagination',
          bulletClass: 'inline-block w-2 h-2 rounded-full bg-gray-600 mx-1 cursor-pointer transition-all',
          bulletActiveClass: '!bg-gold w-3 h-3'
        }}
        breakpoints={{
          // When window width is >= 640px
          640: {
            slidesPerView: 1.8,
            spaceBetween: 12
          },
          // When window width is >= 1024px
          1024: {
            slidesPerView: 2.2,
            spaceBetween: 16
          }
        }}
        className="deals-swiper"
        onReachEnd={() => {
          handleReachEnd();
        }}
        onSlideChange={(swiper) => {
          // If we're at the last slide and there are more deals to load
          if (swiper.isEnd && hasMoreDeals && !loadingMore) {
            loadMoreDeals();
          }
          
          // If we're at the first slide and we've looped back
          if (swiper.isBeginning && isLooping) {
            setIsLooping(false);
          }
        }}
      >
        <AnimatePresence>
          {relatedDeals.map((deal, index) => (
            <SwiperSlide key={deal.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 + (Math.min(index, 3) * 0.05) }}
                className="h-full px-1 py-1"
              >
                <DealCard
                  deal={deal}
                  formatDate={formatDealDate}
                  onSelect={handleDealSelect}
                />
              </motion.div>
            </SwiperSlide>
          ))}
          
          {/* Loading indicator slide */}
          {loadingMore && hasMoreDeals && (
            <SwiperSlide key="loading">
              <div className="h-full flex items-center justify-center py-2 px-1">
                <div className="bg-gray-900/50 rounded-xl border border-gold/20 h-full w-full flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                </div>
              </div>
            </SwiperSlide>
          )}
        </AnimatePresence>
      </Swiper>
      
      {/* Custom Pagination - only show if we have multiple deals */}
      {relatedDeals.length > 1 && (
        <div className="deals-pagination flex justify-center mt-1 sm:mt-2"></div>
      )}
      
      {showDealModal && selectedDeal && (
        <DealDetailModal
          isOpen={showDealModal}
          onClose={() => setShowDealModal(false)}
          deal={selectedDeal}
          formatDate={formatDealDate}
          user={user}
        />
      )}
    </motion.div>
  );
};