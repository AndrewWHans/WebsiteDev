import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navigation } from './components/layout/Navigation';
import { MobileMenu } from './components/layout/MobileMenu';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/home/HeroSection';
import { UpcomingRoutes } from './components/home/UpcomingRoutes';
import { NightlifeDeals } from './components/home/NightlifeDeals';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';
import { WalletPage } from './components/WalletPage';
import { RoutesPage } from './components/RoutesPage';
import { MyTicketsPage } from './components/MyTicketsPage';
import { RouteDetailPage } from './components/RouteDetailPage';
import { ReferralPage } from './components/ReferralPage';
import { AdminDashboard } from './components/AdminDashboard';
import { PrivateRidePage } from './components/PrivateRidePage';
import { VerifyTicketPage } from './components/VerifyTicketPage';
import { AboutPage } from './components/AboutPage';
import { DealsPage } from './components/DealsPage';
import { FeedbackPage } from './components/FeedbackPage';
import { PageTransition } from './components/shared/PageTransition';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { supabase } from './lib/supabase';

function App() {
  // Scroll to top on route change
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = window.location.pathname.startsWith('/admin-dashboard');

  // Handle base tag
  useEffect(() => {
    // Add base tag when not on admin routes
    if (!isAdminRoute) {
      const baseTag = document.createElement('base');
      baseTag.href = '/';
      document.head.appendChild(baseTag);
      return () => {
        document.head.removeChild(baseTag);
      };
    }
  }, [isAdminRoute]);

  // Handle page transitions
  useEffect(() => {
    // Set transitioning state to true when location changes
    setIsPageTransitioning(true);
    
    // Reset transitioning state after a short delay
    const timer = setTimeout(() => {
      setIsPageTransitioning(false);
    }, 300); // Match this with your transition duration
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Auth state management
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch user role when user is found
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (!error && profile) {
          setUserRole(profile.role);
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      
      // If user signed in, fetch their role
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserRole(data.role);
          });
      } else {
        setUserRole(null);
      }
      
      // Close auth modal if it's open and user is signed in
      if (session?.user && isAuthModalOpen) {
        setIsAuthModalOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthModalOpen]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setUser(null);
      setUserRole(null);
      setShowProfile(false);
      setShowWallet(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isRoutesPage = window.location.pathname === '/routes';
  const isRouteDetailPage = window.location.pathname.startsWith('/routes/');
  const isTicketsPage = window.location.pathname === '/tickets';

  if (showProfile && user) return <ProfilePage onBack={() => setShowProfile(false)} />;
  if (showWallet && user) return <WalletPage onBack={() => setShowWallet(false)} />;
  if (showTickets && user) return <MyTicketsPage />;
  if (isAdminRoute && user) return <AdminDashboard user={user} />;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-screen bg-black text-white font-sans ${isPageTransitioning ? 'opacity-0 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}`}>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      <Navigation 
        key="navigation"
        user={user}
        userRole={userRole}
        onSignIn={() => setIsAuthModalOpen(true)}
        onShowProfile={() => setShowProfile(true)}
        onShowWallet={() => setShowWallet(true)}
        onSignOut={handleSignOut}
        onShowMobileMenu={() => setShowMobileMenu(true)}
        showMobileMenu={showMobileMenu}
      />

      {showMobileMenu && (
        <MobileMenu 
          key="mobile-menu"
          user={user}
          userRole={userRole}
          onClose={() => setShowMobileMenu(false)}
          onSignIn={() => setIsAuthModalOpen(true)}
          onShowProfile={() => setShowProfile(true)}
          onShowWallet={() => setShowWallet(true)}
          onSignOut={handleSignOut}
        />
      )}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/shuttles" element={
            <PageTransition loading={isLoading}>
              <RoutesPage />
            </PageTransition>
          } />
          <Route path="/shuttles/:id" element={
            <PageTransition loading={isLoading}>
              <RouteDetailPage />
            </PageTransition>
          } />
          <Route path="/tickets" element={
            <PageTransition loading={isLoading}>
              <MyTicketsPage />
            </PageTransition>
          } />
          <Route path="/about" element={
            <PageTransition loading={isLoading}>
              <AboutPage />
            </PageTransition>
          } />
          <Route path="/refer" element={
            <PageTransition loading={isLoading}>
              <ReferralPage />
            </PageTransition>
          } />
          <Route path="/deals" element={
            <PageTransition loading={isLoading}>
              <DealsPage />
            </PageTransition>
          } />
          <Route path="/feedback" element={
            <PageTransition loading={isLoading}>
              <FeedbackPage />
            </PageTransition>
          } />
          <Route path="/verify/:ticketId/:ticketNumber" element={
            <PageTransition loading={isLoading}>
              <VerifyTicketPage />
            </PageTransition>
          } />
          <Route path="/private-ride" element={
            <PageTransition loading={isLoading}>
              <PrivateRidePage />
            </PageTransition>
          } />
          <Route path="/" element={
            <PageTransition loading={isLoading}>
              <>
                <HeroSection 
                  user={user} 
                  onSignIn={() => setIsAuthModalOpen(true)} 
                />
                <UpcomingRoutes />
                <NightlifeDeals />
                <Footer />
              </>
            </PageTransition>
          } />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;