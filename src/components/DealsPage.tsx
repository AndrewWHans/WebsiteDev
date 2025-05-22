import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PartyPopper, 
  Ticket, 
  Zap, 
  Wine, 
  Users, 
  Clock, 
  ArrowRight, 
  Star, 
  DollarSign, 
  Instagram,
  Bell,
  ExternalLink,
  MapPin,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DealDetailModal } from './deals/DealDetailModal';
import { DealCategories } from './deals/DealCategories';
import { DealCard } from './deals/DealCard';
import { FeaturedDeal } from './deals/FeaturedDeal';
import { AuthModal } from './AuthModal';

type Deal = {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  location_name?: string;
  location_address?: string;
  deal_date?: string;
  deal_time?: string;
  status: string;
  city?: string;
};

const CITIES = [
  { name: "Tampa", defaultSrc: "tampa.png", grayscaleSrc: "tampabw.png" },
  { name: "St. Petersburg", defaultSrc: "stpete.png", grayscaleSrc: "stpetebw.png" },
  { name: "Oaxaca", defaultSrc: "oaxaca.png", grayscaleSrc: "oaxacabw.png" },
  { name: "Orlando", defaultSrc: "orlando.png", grayscaleSrc: "orlandobw.png" },
  { name: "Miami", defaultSrc: "miami.png", grayscaleSrc: "miamibw.png" },
  { name: "Nashville", defaultSrc: "nashville.png", grayscaleSrc: "nashvillebw.png" },
  { name: "Austin", defaultSrc: "austin.png", grayscaleSrc: "austinbw.png" },
  { name: "Jersey Shore", defaultSrc: "jerseyshore.png", grayscaleSrc: "jerseyshorebw.png" },
];

export const DealsPage = () => {
  const navigate = useNavigate();
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [featuredDeal, setFeaturedDeal] = useState<Deal | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });
    
    loadDeals();
  }, [selectedCity]);
  
  // Filter deals when search term or filters change
  useEffect(() => {
    if (!deals.length) return;
    
    let filtered = [...deals];
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(search) || 
        deal.description.toLowerCase().includes(search) ||
        (deal.location_name && deal.location_name.toLowerCase().includes(search))
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(deal => deal.category === selectedCategory);
    }
    
    // Apply price range filter
    if (selectedPriceRange) {
      const [min, max] = selectedPriceRange.split('-').map(Number);
      filtered = filtered.filter(deal => {
        if (max) {
          return deal.price >= min && deal.price <= max;
        } else {
          return deal.price >= min;
        }
      });
    }
    
    setFilteredDeals(filtered);
  }, [deals, searchTerm, selectedCategory, selectedPriceRange]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('deals')
        .select('*')
        .eq('status', 'active');

      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Set all deals
      setDeals(data || []);
      setFilteredDeals(data || []);
      
      // Set featured deal (first deal or random)
      if (data && data.length > 0) {
        // Choose a random deal to feature
        const randomIndex = Math.floor(Math.random() * Math.min(3, data.length));
        setFeaturedDeal(data[randomIndex]);
      }
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setError('Failed to load deals');
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

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };
  
  // Reset all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedPriceRange(null);
    setSelectedCity(null);
  };
  
  const handleDealSelect = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      setShowDealModal(true);
    }
  };

  const handleCityClick = (city: string) => {
    const newCity = selectedCity === city ? null : city;
    setSelectedCity(newCity);
    const dealsSection = document.getElementById('deals-section');
    if (dealsSection) {
      dealsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1545128485-c400ce7b6892?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
            alt="Nightclub atmosphere" 
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
            <div className="inline-flex items-center space-x-2 bg-gold/20 rounded-full px-4 py-2 mb-6">
              <PartyPopper className="w-5 h-5 text-gold" />
              <span className="text-gold font-medium">Coming Soon</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
              Nightlife Deals
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Perks. Power. Party Access. <br />
              You've got the ride — now get the hookup.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Available Deals Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Available Deals</h2>
                <p className="text-gray-400">Exclusive offers for ULimo riders</p>
              </div>
              
              {/* Search and Filter */}
              <div className="mt-4 md:mt-0 w-full md:w-auto flex flex-col md:flex-row gap-3">
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-gold focus:border-gold"
                    placeholder="Search deals..."
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Filter size={18} />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            
            {/* City Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {CITIES.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleCityClick(city.name)}
                  className={`relative h-48 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedCity === city.name ? 'ring-2 ring-gold scale-[1.02]' : 'ring-1 ring-gray-800'
                  }`}
                >
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/40 z-10" />

                  <img
                    src={`https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/picture/${
                      selectedCity && selectedCity !== city.name ? city.grayscaleSrc : city.defaultSrc
                    }`}
                    alt={city.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  {/* Label */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className={`px-6 py-2 rounded-full ${
                      selectedCity === city.name 
                        ? 'bg-gold text-black' 
                        : 'bg-black/50 text-white'
                    } font-bold text-xl transition-colors duration-300`}>
                      {city.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Filters Panel */}
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 rounded-xl p-6 border border-gold/30 mb-8"
              >
                {/* Deal Categories */}
                <DealCategories 
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
                
                {/* Price Ranges */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Price Range</h3>
                  <div className="flex flex-wrap gap-2">
                    {['0-25', '25-50', '50-100', '100-'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setSelectedPriceRange(range === selectedPriceRange ? null : range)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          range === selectedPriceRange
                            ? 'bg-gold text-black font-medium'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {range.includes('-') 
                          ? range.endsWith('-') 
                            ? `$${range.split('-')[0]}+` 
                            : `$${range.replace('-', ' - $')}`
                          : `$${range}`}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                {(selectedCategory || selectedPriceRange || searchTerm || selectedCity) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-gold hover:text-yellow-400 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
            
            {/* Featured Deal */}
            {featuredDeal && !searchTerm && !selectedCategory && !selectedPriceRange && !selectedCity && (
              <FeaturedDeal 
                deal={featuredDeal}
                formatDate={formatDate}
                formatTime={formatTime}
                onSelect={handleDealSelect}
              />
            )}
            
            {/* Deals Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gold/30 p-10 text-center">
                <ShoppingBag className="w-16 h-16 text-gold/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Deals Found</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-6">
                  {searchTerm || selectedCategory || selectedPriceRange || selectedCity
                    ? "We couldn't find any deals matching your filters. Try adjusting your search criteria."
                    : "We're currently working on exciting new deals. Check back soon!"}
                </p>
                {(searchTerm || selectedCategory || selectedPriceRange || selectedCity) && (
                  <button
                    onClick={clearFilters}
                    className="bg-gold hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-colors inline-flex items-center"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDeals.map((deal) => (
                  <DealCard 
                    key={deal.id}
                    deal={deal}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onSelect={handleDealSelect}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Skip the Line Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-gold/20 to-transparent rounded-2xl transform rotate-3"></div>
                  <img
                    src="https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                    alt="People waiting in line outside club" 
                    className="rounded-2xl relative z-10 shadow-xl"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-black p-4 rounded-xl border border-gold/30 shadow-lg z-20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-500" />
                      <div className="text-sm">
                        <span className="text-red-500 font-bold line-through">45 min wait</span>
                        <span className="text-green-400 font-bold ml-2">Skip the line</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/2">
                <div className="inline-flex items-center space-x-2 bg-red-900/30 text-red-400 rounded-full px-3 py-1 text-sm font-medium mb-4">
                  <Zap className="w-4 h-4" />
                  <span>Most Popular</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Skip the Line</h2>
                <p className="text-gray-300 mb-6">
                  No waiting in freezing cold or sweating in line. ULimo riders get priority entry at partner clubs & bars.
                </p>
                <ul className="space-y-3 mb-6">
                  {['First in', 'First drink', 'First on the dance floor'].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-gold/20 rounded-full p-1 mr-3 mt-1">
                        <Star className="w-4 h-4 text-gold" />
                      </div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-gray-900/50 border border-gold/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 italic">
                    "I saved almost an hour of waiting in line at Club Prana last weekend with ULimo's skip-the-line perk. Totally worth it!" 
                    <span className="block mt-2 text-gold">— Jessica, USF Student</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottle Service Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900/50 to-black relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="md:w-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-bl from-gold/20 to-transparent rounded-2xl transform -rotate-3"></div>
                  <img
                    src="https://images.unsplash.com/photo-1527271982979-83fea3eb3582?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                    alt="VIP bottle service" 
                    className="rounded-2xl relative z-10 shadow-xl"
                  />
                  <div className="absolute -bottom-4 -left-4 bg-black p-4 rounded-xl border border-gold/30 shadow-lg z-20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <div className="text-sm">
                        <span className="text-red-500 font-bold line-through">$500+</span>
                        <span className="text-green-400 font-bold ml-2">Student deals</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/2">
                <div className="inline-flex items-center space-x-2 bg-purple-900/30 text-purple-400 rounded-full px-3 py-1 text-sm font-medium mb-4">
                  <Wine className="w-4 h-4" />
                  <span>VIP Experience</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Bottle Service Packages</h2>
                <p className="text-gray-300 mb-6">
                  Level up your night with premium bottle service at student-friendly prices. Book directly through ULimo and get the VIP treatment.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 border border-gold/20 rounded-lg p-4">
                    <h3 className="font-bold text-gold mb-2">Reserved Tables</h3>
                    <p className="text-sm text-gray-300">Prime spots with the best views of the dance floor and DJ</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gold/20 rounded-lg p-4">
                    <h3 className="font-bold text-gold mb-2">Bottles on Deck</h3>
                    <p className="text-sm text-gray-300">Premium spirits with mixers and dedicated service</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gold/20 rounded-lg p-4">
                    <h3 className="font-bold text-gold mb-2">VIP Treatment</h3>
                    <p className="text-sm text-gray-300">Dedicated host and expedited entry</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gold/20 rounded-lg p-4">
                    <h3 className="font-bold text-gold mb-2">Student Pricing</h3>
                    <p className="text-sm text-gray-300">Special rates for college students with valid ID</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Group Deals Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-blue-900/30 text-blue-400 rounded-full px-3 py-1 text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                <span>Group Savings</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Exclusive Promos & Group Deals</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Going out with the crew? We're locking in deals that make your night out even better.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Buy 4, Get 1 Free",
                  description: "Book 4 seats on any ULimo route and get a 5th seat completely free",
                  image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  title: "Free Cover for ULimo Riders",
                  description: "Skip the cover charge at select partner venues when you arrive on ULimo",
                  image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  title: "Discounted Drink Packages",
                  description: "Exclusive drink specials and packages only available to ULimo riders",
                  image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                }
              ].map((deal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="relative h-60 mb-4 overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10"></div>
                    <img 
                      src={deal.image} 
                      alt={deal.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute bottom-0 left-0 p-4 z-20">
                      <h3 className="text-xl font-bold text-white">{deal.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-300">{deal.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Partner Venues Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900/50 to-black relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">ULimo Partner Spots</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                We're teaming up with the best venues in Tampa. From popular hotspots to hidden gems you're about to discover.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  name: "Club Prana",
                  image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "The Ritz Ybor",
                  image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "Tangra Nightclub",
                  image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "The Kennedy",
                  image: "https://images.unsplash.com/photo-1571204829887-3b8d69e23af5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "Ciro's Speakeasy",
                  image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "MacDinton's",
                  image: "https://images.unsplash.com/photo-1578736641330-3155e606cd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "Gaspar's Grotto",
                  image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                  name: "Franklin Manor",
                  image: "https://images.unsplash.com/photo-1556035511-3168381ea4d4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                }
              ].map((venue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative h-40 rounded-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
                  <img 
                    src={venue.image} 
                    alt={venue.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-0 left-0 p-3 z-20">
                    <h3 className="text-sm font-bold text-white">{venue.name}</h3>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-green-400">Coming Soon</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-black via-gray-900/20 to-black">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Getting access to the best nightlife deals is simple with ULimo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  step: "01",
                  title: "Browse Deals",
                  description: "Check out available deals before your ride or directly in the app",
                  icon: <Ticket className="w-6 h-6 text-gold" />
                },
                {
                  step: "02",
                  title: "Add to Booking",
                  description: "Select the deal you want when booking your ULimo ride",
                  icon: <PartyPopper className="w-6 h-6 text-gold" />
                },
                {
                  step: "03",
                  title: "Show Your Ticket",
                  description: "Present your ULimo ticket at the venue entrance",
                  icon: <Zap className="w-6 h-6 text-gold" />
                },
                {
                  step: "04",
                  title: "Enjoy VIP Treatment",
                  description: "Skip the line and enjoy your exclusive perks",
                  icon: <Star className="w-6 h-6 text-gold" />
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900 rounded-xl p-6 border border-gold/20 hover:border-gold/40 transition-all"
                >
                  <div className="flex items-start gap-4 relative">
                    <div className="relative">
                      <div className="absolute -top-3 -left-3 text-4xl font-bold text-gold/10">{item.step}</div>
                      <div className="bg-gold/10 rounded-full p-3 relative z-10">
                        {item.icon}
                      </div>
                      <div className="absolute -inset-2 bg-gold/5 rounded-full blur-md"></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stay Tuned Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900/50 to-black relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-6">Stay Tuned</h2>
            <p className="text-gray-300 mb-8 text-lg">
              We're launching ULimo Deals in Tampa soon. Want your favorite bar or club on here? Let us know!
            </p>
            
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Follow Us for Updates</h3>
              <div className="flex justify-center">
                <div className="relative">
                  <button 
                    onClick={() => setShowInstagramOptions(!showInstagramOptions)}
                    className="bg-gray-900 hover:bg-gray-800 p-4 rounded-full border border-gold/30 transition-colors"
                    aria-label="Instagram accounts"
                  >
                    <Instagram className={`w-6 h-6 text-gold transition-transform duration-300 ${showInstagramOptions ? 'rotate-12' : ''}`} />
                  </button>
                  
                  {showInstagramOptions && (
                    <div className="absolute bottom-full right-0 mb-3 bg-gradient-to-br from-gray-900 to-black border border-gold/20 rounded-lg shadow-xl p-3 z-10 w-64 animate-fadeIn">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 pl-2">Our Instagram Accounts</div>
                      
                      <a 
                        href="https://instagram.com/ulimoinc" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-3 text-gray-300 hover:text-gold hover:bg-gray-800/50 rounded-md transition-all duration-200 mb-1 group"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center mr-3">
                            <Instagram size={16} className="text-white" />
                          </div>
                          <div>
                            <div className="font-medium">@ulimoinc</div>
                            <div className="text-xs text-gray-500">Main Account</div>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-gray-500 group-hover:text-gold transition-colors" />
                      </a>
                      
                      <a 
                        href="https://instagram.com/universitylimo" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-3 text-gray-300 hover:text-gold hover:bg-gray-800/50 rounded-md transition-all duration-200 group"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center mr-3">
                            <Instagram size={16} className="text-white" />
                          </div>
                          <div>
                            <div className="font-medium">@universitylimo</div>
                            <div className="text-xs text-gray-500">University Events</div>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-gray-500 group-hover:text-gold transition-colors" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-gray-400 mt-4">
                We'll be dropping live deal announcements, flash perks, and pop-up ULimo events.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
            alt="Tampa nightlife" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">Ready to Experience Nightlife Like Never Before?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Book your ULimo ride today and be the first to access exclusive nightlife deals when they launch.
            </p>
            <button 
              onClick={() => window.location.href = '/shuttles'}
              className="bg-gold hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full transition-colors inline-flex items-center shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
            >
              Book a Shuttle <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Deal Detail Modal */}
      <DealDetailModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        deal={selectedDeal}
        formatDate={formatDate}
        user={user}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(user) => {
          setUser(user);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
};