import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bus, 
  PartyPopper, 
  Users, 
  Sparkles, 
  Rocket, 
  Target, 
  MapPin,
  Trophy,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

export const AboutPage = () => {
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black z-10"></div>
          <video 
            src="https://ypiymgwdgqauxuzauqlf.supabase.co/storage/v1/object/public/media/landingpage/video/LimoHeader.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-30"
          ></video>
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
              <span className="text-gold font-medium">The Party Starts Here</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
              About ULimo
            </h1>
            <p className="text-xl text-gray-300">
              We're not just a ride—we're the party before the party. A ride-sharing platform built for college towns, 
              nightlife lovers, and anyone who wants to arrive in style with their crew.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gold">What We Do</h2>
              <p className="text-gray-400">ULimo offers affordable, scheduled luxury rides with a social twist.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: <Bus className="w-8 h-8 text-gold" />,
                  title: "Direct Party Routes",
                  description: "Book rides on scheduled routes to the hottest spots"
                },
                {
                  icon: <Users className="w-8 h-8 text-gold" />,
                  title: "Group Bookings",
                  description: "Reserve spots for your entire crew"
                },
                {
                  icon: <Sparkles className="w-8 h-8 text-gold" />,
                  title: "Exclusive Deals",
                  description: "Get access to special nightlife perks and offers"
                },
                {
                  icon: <Trophy className="w-8 h-8 text-gold" />,
                  title: "Miles Program",
                  description: "Earn miles for free rides and VIP upgrades"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="bg-gray-900 rounded-xl p-6 border border-gold/30 hover:border-gold/50 transition-all"
                >
                  <div className="bg-gold/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why ULimo Section */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900 to-black relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4 text-gold">Why ULimo Exists</h2>
            <p className="text-gray-400">
              College students don't want to Uber solo or pay for overpriced rides.
              We created ULimo to give students the freedom to move, party safely, and ride together.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <Users className="w-6 h-6 text-gold" />,
                title: "Social Rides",
                description: "Travel with friends, make new ones"
              },
              {
                icon: <Sparkles className="w-6 h-6 text-gold" />,
                title: "Affordable Luxury",
                description: "Premium experience, student-friendly prices"
              },
              {
                icon: <Target className="w-6 h-6 text-gold" />,
                title: "Student-First",
                description: "Built for your lifestyle"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="bg-gold/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">How It Works</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">Four simple steps to elevate your night out experience</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <MapPin className="w-8 h-8" />,
                  step: "01",
                  title: "Browse Routes",
                  description: "See what direct party rides are scheduled in your area"
                },
                {
                  icon: <Users className="w-8 h-8" />,
                  step: "02",
                  title: "Book a Spot",
                  description: "Choose your time slot, select your seat(s), and pay with credits"
                },
                {
                  icon: <Target className="w-8 h-8" />,
                  step: "03",
                  title: "Meet the Threshold",
                  description: "Once enough seats are booked, the ride is confirmed"
                },
                {
                  icon: <Bus className="w-8 h-8" />,
                  step: "04",
                  title: "Scan & Ride",
                  description: "Just show up, scan your ticket, and let the party roll"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-gold/20 hover:border-gold/40 transition-all group hover:-translate-y-2 duration-300"
                >
                  <div className="relative mb-6">
                    <div className="absolute -top-4 -left-4 text-5xl font-bold text-gold/10 group-hover:text-gold/20 transition-colors">
                      {item.step}
                    </div>
                    <div className="bg-gold/10 group-hover:bg-gold/20 transition-colors rounded-full w-16 h-16 flex items-center justify-center text-gold">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 bg-gradient-to-b from-black via-gray-900/50 to-black relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-64 h-64 rounded-full bg-gold/10 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">Our Vision</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                We're building the future of social transportation, one ride at a time
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: <Rocket className="w-10 h-10" />,
                  title: "Ride Share Pools",
                  description: "Connect with other riders heading to the same destination for affordable, fun transportation"
                },
                {
                  icon: <Sparkles className="w-10 h-10" />,
                  title: "Private Limo Bookings",
                  description: "Exclusive luxury experiences for special occasions with your closest friends"
                },
                {
                  icon: <MapPin className="w-10 h-10" />,
                  title: "Expanded Routes",
                  description: "Growing our network across cities and campuses to connect more nightlife hotspots"
                },
                {
                  icon: <Users className="w-10 h-10" />,
                  title: "Event Integrations",
                  description: "Partnering with venues, promoters and influencers to create seamless nightlife experiences"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="bg-gradient-to-br from-gray-900 to-black/60 backdrop-blur-sm rounded-2xl p-8 border border-gold/20 hover:border-gold/40 transition-all group"
                >
                  <div className="flex items-start gap-6">
                    <div className="bg-gold/10 group-hover:bg-gold/20 transition-colors rounded-xl p-4 text-gold">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-16 text-center"
            >
              <div className="inline-block bg-gradient-to-r from-gold/20 to-gold/10 rounded-full px-8 py-4 border border-gold/30">
                <p className="text-gold font-medium">
                  Join us as we revolutionize how students and young professionals experience nightlife
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-8 text-gold">Connect With Us</h2>
            <p className="text-gray-300 mb-8">
              Whether you're a driver, promoter, or part of a venue—we're building the ultimate 
              nightlife transportation ecosystem. Let's ride together.
            </p>
            
            <div className="flex flex-col items-center mt-6">
              <a 
                href="/feedback" 
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/feedback');
                }}
                className="flex items-center space-x-3 text-gold hover:text-yellow-400 transition-colors mb-6"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Share Feedback & Suggestions</span>
              </a>
            </div>
            
            <div className="flex flex-col items-center">
              <a 
                href="mailto:contact@ulimo.co" 
                className="flex items-center space-x-3 text-gray-300 hover:text-gold transition-colors mb-6"
              >
                <Mail className="w-5 h-5" />
                <span>contact@ulimo.co</span>
              </a>
              
              <div className="relative inline-block">
                <button 
                  onClick={() => setShowInstagramOptions(!showInstagramOptions)}
                  className="group flex items-center space-x-2 text-gray-400 hover:text-gold transition-colors duration-300"
                  aria-label="Instagram accounts"
                >
                  <Instagram 
                    size={22} 
                    className={`transition-transform duration-300 ${showInstagramOptions ? 'text-gold rotate-12' : ''}`} 
                  />
                  <span className="text-sm font-medium">Follow Us on Instagram</span>
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
          </motion.div>
        </div>
      </section>
    </div>
  );
};