import React from 'react';
import { motion } from 'framer-motion';
import { LoadingScreen } from './LoadingScreen';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  loading?: boolean;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, loading }) => {
  const location = useLocation();
  
  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      key={location.pathname}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-black min-h-screen"
    >
      {children}
    </motion.div>
  );
};