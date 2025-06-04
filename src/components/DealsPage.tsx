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
  const [cities, setCities] = useState<Array<{name: string, defaultSrc: string, grayscaleSrc: string}>>([]);

  const loadCityOrder = async () => {
    try {
      // Get the custom city order from system settings
      const { data: orderData, error: orderError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'city_order')
        .single();

      // Default order if no custom order found
      let orderedCityNames = ['Tampa', 'St. Petersburg', 'Orlando', 'Miami', 'Nashville', 'Austin', 'Jersey Shore', 'Oaxaca', 'Mexico City'];
      
      // If we have a custom order, use it
      if (orderData && orderData.value) {
        try {
          const customOrder = JSON.parse(orderData.value);
          if (Array.isArray(customOrder)) {
            orderedCityNames = customOrder;
          }
        } catch (e) {
          console.error('Error parsing city order:', e);
        }
      }

      // Create city objects with image sources in the custom order
      const orderedCities = orderedCityNames.map(cityName => ({
        name: cityName,
        defaultSrc: cityName === "St. Petersburg" ? "stpete.png" : 
                    cityName === "Jersey Shore" ? "jerseyshore.png" : 
                    cityName === "Mexico City" ? "MexicoCity.png" :
                    `${cityName.toLowerCase()}.png`,
        grayscaleSrc: cityName === "St. Petersburg" ? "stpetebw.png" : 
                      cityName === "Jersey Shore" ? "jerseyshorebw.png" : 
                      cityName === "Mexico City" ? "MexicoCitybw.png" :
                      `${cityName.toLowerCase()}bw.png`
      }));

      setCities(orderedCities);
    } catch (err) {
      console.error('Error loading city order:', err);
      // Default cities if there's an error
      setCities([
        { name: "Tampa", defaultSrc: "tampa.png", grayscaleSrc: "tampabw.png" },
        { name: "St. Petersburg", defaultSrc: "stpete.png", grayscaleSrc: "stpetebw.png" },
        { name: "Orlando", defaultSrc: "orlando.png", grayscaleSrc: "orlandobw.png" },
        { name: "Miami", defaultSrc: "miami.png", grayscaleSrc: "miamibw.png" },
        { name: "Nashville", defaultSrc: "nashville.png", grayscaleSrc: "nashvillebw.png" },
        { name: "Austin", defaultSrc: "austin.png", grayscaleSrc: "austinbw.png" },
        { name: "Jersey Shore", defaultSrc: "jerseyshore.png", grayscaleSrc: "jerseyshorebw.png" },
        { name: "Oaxaca", defaultSrc: "oaxaca.png", grayscaleSrc: "oaxacabw.png" },
        { name: "Mexico City", defaultSrc: "MexicoCity.png", grayscaleSrc: "MexicoCitybw.png" },
      ]);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });
    
    loadCityOrder();
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
              {cities.map((city) => (
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