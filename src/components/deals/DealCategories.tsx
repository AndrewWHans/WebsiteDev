import React from 'react';
import { motion } from 'framer-motion';
import { Wine, Music, Ticket, Users, Star, DollarSign } from 'lucide-react';

type CategoryProps = {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
};

export const DealCategories: React.FC<CategoryProps> = ({ 
  selectedCategory, 
  onSelectCategory 
}) => {
  const categories = [
    { id: 'all', name: 'All Deals', icon: <Star className="w-5 h-5" /> },
    { id: 'VIP Service', name: 'VIP Service', icon: <Wine className="w-5 h-5" /> },
    { id: 'Club Entry', name: 'Club Entry', icon: <Ticket className="w-5 h-5" /> },
    { id: 'Drink Specials', name: 'Drink Specials', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'Events', name: 'Events', icon: <Music className="w-5 h-5" /> },
    { id: 'Group Deals', name: 'Group Deals', icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex space-x-3 min-w-max">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCategory(category.id === 'all' ? null : category.id)}
            className={`flex items-center px-4 py-2 rounded-full transition-colors ${
              (category.id === 'all' && selectedCategory === null) || 
              category.id === selectedCategory
                ? 'bg-gold text-black font-bold'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            <span>{category.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};