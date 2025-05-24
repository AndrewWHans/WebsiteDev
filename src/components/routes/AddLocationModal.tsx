import React, { useEffect, useState } from 'react';
import { X, Edit, Trash2, Search, MapPin, Building, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Location = {
  id: string;
  name: string;
  address: string;
};

type AddLocationModalProps = {
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
  newLocationName: string;
  setNewLocationName: (name: string) => void;
  newLocationAddress: string;
  setNewLocationAddress: (address: string) => void;
  handleAddLocation: () => void;
};

export const AddLocationModal = ({
  showLocationModal,
  setShowLocationModal,
  newLocationName,
  setNewLocationName,
  newLocationAddress,
  setNewLocationAddress,
  handleAddLocation
}: AddLocationModalProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const locationsPerPage = 8;

  useEffect(() => {
    if (showLocationModal) {
      loadLocations();
    }
  }, [showLocationModal]);

  useEffect(() => {
    // Filter locations based on search term
    if (searchTerm.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      setFilteredLocations(
        locations.filter(
          loc => 
            loc.name.toLowerCase().includes(lowercaseSearch) || 
            loc.address.toLowerCase().includes(lowercaseSearch)
        )
      );
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, locations]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setLocations(data || []);
      setFilteredLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setNewLocationName(location.name);
    setNewLocationAddress(location.address);
    setError(null);
    setSuccess(null);
  };

  const handleDeleteLocation = async (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      try {
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Refresh the list
        loadLocations();
        setSuccess('Location deleted successfully');
      } catch (err) {
        console.error('Error deleting location:', err);
        alert('Failed to delete location. It may be in use by routes.');
      }
    }
  };

  const handleSave = async () => {
    if (editingLocation) {
      try {
        const { error } = await supabase
          .from('locations')
          .update({
            name: newLocationName,
            address: newLocationAddress
          })
          .eq('id', editingLocation.id);
        
        if (error) throw error;
        
        // Reset form and refresh list
        setEditingLocation(null);
        setNewLocationName('');
        setNewLocationAddress('');
        setSuccess('Location updated successfully');
        loadLocations();
      } catch (err) {
        console.error('Error updating location:', err);
      }
    } else {
      // Use the existing handleAddLocation for adding new locations
      handleAddLocation();
      setSuccess('Location added successfully');
      // Refresh the list after adding
      setTimeout(loadLocations, 500);
    }
  };

  // Calculate pagination
  const indexOfLastLocation = currentPage * locationsPerPage;
  const indexOfFirstLocation = indexOfLastLocation - locationsPerPage;
  const currentLocations = filteredLocations.slice(indexOfFirstLocation, indexOfLastLocation);
  const totalPages = Math.ceil(filteredLocations.length / locationsPerPage);

  // Page navigation
  const goToPage = (pageNumber: number) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };

  const handleCloseModal = () => {
    console.log("Attempting to close modal...");
    // Try multiple approaches to ensure closing works
    try {
      // Reset all state first
      setEditingLocation(null);
      setNewLocationName('');
      setNewLocationAddress('');
      setSearchTerm('');
      
      // Force any potential event handlers to complete
      setTimeout(() => {
        // Explicitly close the modal
        setShowLocationModal(false);
        console.log("Modal close command sent");
        
        // Remove any modal-related classes that might be on the body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }, 10);
    } catch (error) {
      console.error("Error closing modal:", error);
      // Fallback - force close by calling the prop directly
      setShowLocationModal(false);
    }
  };

  // Add an ESC key handler
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLocationModal) {
        console.log("Escape key pressed - closing modal");
        handleCloseModal();
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleEscapeKey);
    
    // Clean up
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showLocationModal]); // Re-run if showLocationModal changes

  // Add a click-outside handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showLocationModal) {
        // Find the modal content element
        const modalContent = document.querySelector(".modal-content");
        if (modalContent && !modalContent.contains(e.target as Node)) {
          console.log("Outside click detected - closing modal");
          handleCloseModal();
        }
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleOutsideClick);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showLocationModal]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col modal-content shadow-xl">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-indigo-600 to-indigo-700">
          <h3 className="text-lg font-medium">
            {editingLocation ? 'Edit Location' : 'Add New Location'}
          </h3>
          <button 
            type="button"
            onClick={handleCloseModal}
            aria-label="Close modal"
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start mb-4">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start mb-4">
              <Check size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
              <Building className="w-4 h-4 mr-2 text-indigo-500" />
              {editingLocation ? 'Update Location Details' : 'Location Details'}
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., Downtown Bus Stop"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Full address"
                  />
                </div>
              </div>

            {editingLocation && (
              <button
                type="button"
                onClick={() => {
                  setEditingLocation(null);
                  setNewLocationName('');
                  setNewLocationAddress('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingLocation(null);
                    setNewLocationName('');
                    setNewLocationAddress('');
                  }}
                  className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 ${!editingLocation ? 'hidden' : ''}`}
                >
                  Cancel Edit
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!newLocationName || !newLocationAddress}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
                >
                  {editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Locations - Optimized for many locations */}
        <div className="px-6 pb-6 flex-grow flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 mt-2">
            <h4 className="text-lg font-medium flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-indigo-500" />
              Existing Locations
            </h4>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-4 text-center text-gray-500">Loading locations...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              {searchTerm ? 'No locations match your search.' : 'No locations found.'}
            </div>
          ) : (
            <div className="flex-grow overflow-hidden flex flex-col">
              <div className="overflow-y-auto border rounded-md divide-y max-h-[300px]">
                {currentLocations.map(location => (
                  <div key={location.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                    <div className="truncate pr-4 flex items-center">
                      <p className="font-medium truncate">{location.name}</p>
                      <p className="text-sm text-gray-500 truncate">{location.address}</p>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit location"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete location"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3 mt-3 text-gray-700">
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstLocation + 1}-{Math.min(indexOfLastLocation, filteredLocations.length)} of {filteredLocations.length}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      let pageNum = currentPage;
                      if (currentPage < 3) {
                        pageNum = i + 1;
                      } else if (currentPage > totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-2 py-1 border rounded-md text-sm ${
                              currentPage === pageNum 
                                ? 'bg-indigo-600 text-white' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <span className="flex items-center">
              <X className="w-4 h-4 mr-2" /> Close
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}; 