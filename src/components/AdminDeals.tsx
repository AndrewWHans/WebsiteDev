import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  DollarSign, 
  Tag, 
  Loader2,
  Eye,
  ShoppingBag,
  Calendar,
  MapPin,
  Image,
  Link,
  Bus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Deal = {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  purchases: number;
  views: number;
  status: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  location_name?: string;
  location_address?: string;
  deal_date?: string;
  city?: string;
  tagged_routes?: number;
};

type DealFormData = {
  title: string;
  description: string;
  price: number;
  image_url: string;
  location_name: string;
  location_address: string;
  deal_date: string;
  city: string;
};

export const AdminDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [taggedRoutes, setTaggedRoutes] = useState<string[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DealFormData>();
  
  const watchImageUrl = watch('image_url');

  useEffect(() => {
    loadDeals();
  }, []);
  
  useEffect(() => {
    if (deals.length > 0) {
      loadTaggedRoutesCount();
    }
  }, [deals]);

  useEffect(() => {
    if (editingDeal) {
      setValue('title', editingDeal.title);
      setValue('description', editingDeal.description);
      setValue('price', editingDeal.price);
      setValue('image_url', editingDeal.image_url || '');
      setValue('location_name', editingDeal.location_name || '');
      setValue('location_address', editingDeal.location_address || '');
      setValue('city', editingDeal.city || 'Miami');
      
      if (editingDeal.deal_date) {
        const dateWithTime = new Date(editingDeal.deal_date + 'T12:00:00');
        setSelectedDate(dateWithTime);
      }
      
      setImagePreview(editingDeal.image_url);
    }
  }, [editingDeal, setValue]);

  useEffect(() => {
    if (watchImageUrl && watchImageUrl.trim() !== '') {
      setImagePreview(watchImageUrl);
    } else {
      setImagePreview(null);
    }
  }, [watchImageUrl]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setError('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTaggedRoutesCount = async () => {
    try {
      const dealIds = deals.map(deal => deal.id);
      
      const { data, error } = await supabase
        .from('deal_route_tags')
        .select('deal_id, count(*)', { count: 'exact' })
        .in('deal_id', dealIds)
        .group('deal_id');
      
      if (error) throw error;
      
      const countMap = (data || []).reduce((acc: Record<string, number>, item: { deal_id: string; count: string }) => {
        acc[item.deal_id] = parseInt(item.count);
        return acc;
      }, {});
      
      setDeals(deals.map(deal => ({
        ...deal,
        tagged_routes: countMap[deal.id] || 0
      })));
    } catch (err) {
      console.error('Error loading tagged routes count:', err);
    }
  };
  
  const loadRoutesForDeal = async (dealId: string) => {
    setLoadingRoutes(true);
    try {
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          city,
          pickup:locations!routes_pickup_location_fkey (name),
          dropoff:locations!routes_dropoff_location_fkey (name)
        `)
        .eq('status', 'active')
        .order('date', { ascending: true });
      
      if (routesError) throw routesError;
      
      const { data: tags, error: tagsError } = await supabase
        .from('deal_route_tags')
        .select('route_id')
        .eq('deal_id', dealId);
      
      if (tagsError) throw tagsError;
      
      setAvailableRoutes(routes || []);
      setTaggedRoutes((tags || []).map(tag => tag.route_id));
    } catch (err) {
      console.error('Error loading routes for deal:', err);
      setError('Failed to load routes');
    } finally {
      setLoadingRoutes(false);
    }
  };
  
  const handleToggleRouteTag = (routeId: string) => {
    setTaggedRoutes(prev => {
      if (prev.includes(routeId)) {
        return prev.filter(id => id !== routeId);
      } else {
        return [...prev, routeId];
      }
    });
  };
  
  const handleSaveTags = async () => {
    if (!selectedDeal) return;
    
    setSavingTags(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Get current tags
      const { data: currentTags, error: currentTagsError } = await supabase
        .from('deal_route_tags')
        .select('route_id')
        .eq('deal_id', selectedDeal.id);
      
      if (currentTagsError) throw currentTagsError;
      
      const currentTaggedRouteIds = (currentTags || []).map(tag => tag.route_id);
      
      // Routes to add (in taggedRoutes but not in currentTaggedRouteIds)
      const routesToAdd = taggedRoutes.filter(id => !currentTaggedRouteIds.includes(id));
      
      // Routes to remove (in currentTaggedRouteIds but not in taggedRoutes)
      const routesToRemove = currentTaggedRouteIds.filter(id => !taggedRoutes.includes(id));
      
      // Add new tags
      if (routesToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('deal_route_tags')
          .insert(routesToAdd.map(routeId => ({
            deal_id: selectedDeal.id,
            route_id: routeId,
            created_by: currentUser?.id
          })));
        
        if (addError) throw addError;
      }
      
      // Remove tags
      if (routesToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('deal_route_tags')
          .delete()
          .eq('deal_id', selectedDeal.id)
          .in('route_id', routesToRemove);
        
        if (removeError) throw removeError;
      }
      
      setSuccess('Route tags updated successfully');
      setShowTagModal(false);
      
      // Refresh deals to update tagged_routes count
      loadDeals();
    } catch (err: any) {
      console.error('Error saving tags:', err);
      setError(err.message || 'Failed to save tags');
    } finally {
      setSavingTags(false);
    }
  };
  
  const openTagModal = (deal: Deal) => {
    setSelectedDeal(deal);
    loadRoutesForDeal(deal.id);
    setShowTagModal(true);
  };

  const onSubmit = async (data: DealFormData) => {
    try {
      setError(null);
      
      const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : null;
      
      const dealData = {
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: data.image_url || null,
        location_name: data.location_name,
        location_address: data.location_address,
        deal_date: formattedDate,
        city: data.city,
        status: 'active'
      };

      if (editingDeal) {
        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', editingDeal.id);

        if (error) throw error;
        setSuccess('Deal updated successfully');
      } else {
        const { error } = await supabase
          .from('deals')
          .insert([dealData]);

        if (error) throw error;
        setSuccess('Deal created successfully');
      }

      await loadDeals();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving deal:', err);
      setError(err.message || 'Failed to save deal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadDeals();
      setSuccess('Deal deleted successfully');
    } catch (err: any) {
      console.error('Error deleting deal:', err);
      setError(err.message || 'Failed to delete deal');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setDeals(deals.map(deal => 
        deal.id === id ? { ...deal, status: newStatus } : deal
      ));
      
      setSuccess(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      console.error('Error updating deal status:', err);
      setError(err.message || 'Failed to update deal status');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDeal(null);
    setSelectedDate(null);
    setImagePreview(null);
    reset();
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Nightlife Deals</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage exclusive deals and promotions for ULimo users
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Deal
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Deal
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Location
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      City
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Metrics
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {deals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        <Tag className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p>No deals found. Create your first deal to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    deals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                              {deal.image_url ? (
                                <img src={deal.image_url} alt={deal.title} className="h-10 w-10 object-cover" />
                              ) : (
                                <Tag className="h-10 w-10 p-2 text-gray-400" />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{deal.title}</div>
                              <div className="text-gray-500 max-w-xs truncate">{deal.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                              <span>{deal.location_name}</span>
                            </div>
                            {deal.deal_date && (
                              <div className="flex items-center mt-1">
                                <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                <span>{formatDate(deal.deal_date)}</span>
                              </div>
                            )}
                            <div className="flex items-center mt-1">
                              <Link className="w-4 h-4 text-gray-400 mr-1" />
                              <span>{deal.tagged_routes || 0} tagged routes</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {deal.city || 'Not specified'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          ${deal.price.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1 text-gray-400" />
                              <span>{deal.views} views</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <ShoppingBag className="w-4 h-4 mr-1 text-gray-400" />
                              <span>{deal.purchases} purchases</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            deal.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {deal.status}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                           <button
                             onClick={() => openTagModal(deal)}
                             className="text-indigo-600 hover:text-indigo-900 mr-4"
                           >
                             <Link className="w-4 h-4" />
                           </button>
                          <button
                            onClick={() => handleToggleStatus(deal.id, deal.status)}
                            className={`text-${deal.status === 'active' ? 'yellow' : 'green'}-600 hover:text-${deal.status === 'active' ? 'yellow' : 'green'}-900 mr-4`}
                          >
                            {deal.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDeal(deal);
                              setShowModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(deal.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium">
                {editingDeal ? 'Edit Deal' : 'Add New Deal'}
              </h3>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deal Title
                  </label>
                  <input
                    type="text"
                    {...register('title', { required: 'Title is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., VIP Club Entry"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    {...register('description', { required: 'Description is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Describe the deal details..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('price', { 
                        required: 'Price is required',
                        min: { value: 0.01, message: 'Price must be greater than 0' }
                      })}
                      className="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">USD</span>
                    </div>
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('location_name', { required: 'Location name is required' })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Club Prana"
                    />
                  </div>
                  {errors.location_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.location_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('location_address', { required: 'Address is required' })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Full address"
                    />
                  </div>
                  {errors.location_address && (
                    <p className="mt-1 text-sm text-red-600">{errors.location_address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <div className="mt-1">
                    <select
                      {...register('city', { required: 'City is required' })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select city</option>
                      <option value="Miami">Miami</option>
                      <option value="Orlando">Orlando</option>
                      <option value="Tampa">Tampa</option>
                      <option value="St. Petersburg">St. Petersburg</option>
                      <option value="Oaxaca">Oaxaca</option>
                      <option value="Jersey Shore">Jersey Shore</option>
                      <option value="Austin">Austin</option>
                      <option value="Nashville">Nashville</option>
                    </select>
                  </div>
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      {...register('deal_date')}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(e.target.value + 'T12:00:00');
                          setSelectedDate(newDate);
                          setValue('deal_date', e.target.value);
                        } else {
                          setSelectedDate(null);
                          setValue('deal_date', '');
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Image URL
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Image className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('image_url')}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 object-cover rounded-md"
                        onError={() => setImagePreview(null)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {editingDeal ? 'Update Deal' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Routes Modal */}
      {showTagModal && selectedDeal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium">
                Tag Routes for {selectedDeal.title}
              </h3>
              <button onClick={() => setShowTagModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {loadingRoutes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : availableRoutes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bus className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p>No active routes available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">
                          {route.pickup.name} → {route.dropoff.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center mt-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(route.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {route.city}
                          </div>
                        </div>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          checked={taggedRoutes.includes(route.id)}
                          onChange={() => handleToggleRouteTag(route.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end items-center gap-3 p-6 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                disabled={savingTags}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {savingTags ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};