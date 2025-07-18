import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Edit, 
  Plus, 
  Minus, 
  UserCog, 
  Download, 
  Trophy, 
  Wallet,
  ArrowUp,
  ArrowDown,
  Loader2,
  Eye,
  Mail,
  Calendar,
  DollarSign,
  ShieldAlert,
  X,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  credit_balance: number;
  point_balance: number;
  total_spent: number;
  total_points_earned: number;
};

type SortKey = 'email' | 'role' | 'created_at' | 'credit_balance' | 'point_balance' | 'total_spent' | 'total_points_earned';

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creditsAmount, setCreditsAmount] = useState<number>(0);
  const [pointsAmount, setPointsAmount] = useState<number>(0);
  
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters and sort whenever data or filter settings change
    let result = [...users];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply role filter
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // For date fields, convert to Date objects
      if (sortBy === 'created_at') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter, sortBy, sortDirection]);

  const fetchUsers = async () => {
    setLoading(true);
    
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) throw profilesError;
      
      // Fetch wallet credits
      const { data: credits, error: creditsError } = await supabase
        .from('wallet_credits')
        .select('user_id, balance');
        
      if (creditsError) throw creditsError;
      
      // Fetch wallet points
      const { data: points, error: pointsError } = await supabase
        .from('wallet_points')
        .select('user_id, points');
        
      if (pointsError) throw pointsError;

      // Fetch credit transactions (for total spent)
      const { data: creditTxs, error: creditTxsError } = await supabase
        .from('credit_transactions')
        .select('user_id, amount, type');
        
      if (creditTxsError) throw creditTxsError;
      
      // Fetch point transactions (for total earned)
      const { data: pointTxs, error: pointTxsError } = await supabase
        .from('point_transactions')
        .select('user_id, points, type');
        
      if (pointTxsError) throw pointTxsError;
      
      // Process data into a unified format
      const userMap: Record<string, User> = {};
      
      // Initialize with profile data
      profiles?.forEach(profile => {
        userMap[profile.id] = {
          id: profile.id,
          email: profile.email,
          name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
          role: profile.role,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
          credit_balance: 0,
          point_balance: 0,
          total_spent: 0,
          total_points_earned: 0
        };
      });
      
      // Add credit balances
      credits?.forEach(credit => {
        if (userMap[credit.user_id]) {
          userMap[credit.user_id].credit_balance = parseFloat(credit.balance);
        }
      });
      
      // Add point balances
      points?.forEach(point => {
        if (userMap[point.user_id]) {
          userMap[point.user_id].point_balance = point.points;
        }
      });
      
      // Calculate total spent (negative credit transactions)
      creditTxs?.forEach(tx => {
        if (userMap[tx.user_id] && tx.amount < 0 && tx.type === 'purchase') {
          userMap[tx.user_id].total_spent += Math.abs(parseFloat(tx.amount));
        }
      });
      
      // Calculate total points earned (positive point transactions)
      pointTxs?.forEach(tx => {
        if (userMap[tx.user_id] && tx.points > 0) {
          userMap[tx.user_id].total_points_earned += tx.points;
        }
      });
      
      // Convert to array and set state
      const userArray = Object.values(userMap);
      setUsers(userArray);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      // Toggle direction if already sorting by this key
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort key and reset direction to ascending
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter(null);
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setNewRole(user.role);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || selectedUser.role === newRole) return;

    setActionError(null);
    setActionSuccess(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      
      setSelectedUser({ ...selectedUser, role: newRole });
      setEditingRole(false);
      setActionSuccess('User role updated successfully');
      
      // Refresh after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setActionError(err.message || 'Failed to update user role');
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || creditsAmount <= 0) return;

    setActionError(null);
    setActionSuccess(null);
    
    try {
      // Call the add_credits function
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: selectedUser.id,
        p_amount: creditsAmount,
        p_description: 'Admin adjustment',
        p_type: 'adjustment',
        p_reference_id: null
      });
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, credit_balance: u.credit_balance + creditsAmount } : u
      ));
      
      setSelectedUser({ ...selectedUser, credit_balance: selectedUser.credit_balance + creditsAmount });
      setCreditsAmount(0);
      setActionSuccess(`$${creditsAmount} credits added successfully`);
      
      // Refresh after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (err: any) {
      console.error('Error adding credits:', err);
      setActionError(err.message || 'Failed to add credits');
    }
  };

  const handleAddPoints = async () => {
    if (!selectedUser || pointsAmount <= 0) return;

    setActionError(null);
    setActionSuccess(null);
    
    try {
      // Call the add_points function
      const { error } = await supabase.rpc('add_points', {
        p_user_id: selectedUser.id,
        p_points: pointsAmount,
        p_description: 'Admin adjustment',
        p_type: 'adjustment',
        p_reference_id: null
      });
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { 
          ...u, 
          point_balance: u.point_balance + pointsAmount,
          total_points_earned: u.total_points_earned + pointsAmount 
        } : u
      ));
      
      setSelectedUser({ 
        ...selectedUser, 
        point_balance: selectedUser.point_balance + pointsAmount,
        total_points_earned: selectedUser.total_points_earned + pointsAmount
      });
      setPointsAmount(0);
      setActionSuccess(`${pointsAmount} points added successfully`);
      
      // Refresh after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (err: any) {
      console.error('Error adding points:', err);
      setActionError(err.message || 'Failed to add points');
    }
  };

  const exportUserData = () => {
    const csv = [
      // CSV Header
      ['Email', 'Name', 'Role', 'Joined Date', 'Credit Balance', 'Point Balance', 'Total Spent', 'Total Points Earned'].join(','),
      // CSV Rows
      ...filteredUsers.map(user => [
        user.email,
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name,
        user.role,
        new Date(user.created_at).toLocaleDateString(),
        user.credit_balance,
        user.point_balance,
        user.total_spent,
        user.total_points_earned
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ulimo-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Driver': return 'bg-blue-100 text-blue-800';
      case 'Promoter': return 'bg-purple-100 text-purple-800';
      case 'Employee': return 'bg-green-100 text-green-800';
      case 'Rider': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportUserData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by email, name..."
            />
          </div>

          <div className="flex md:flex-row flex-col gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`ml-1 h-4 w-4 transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {roleFilter && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear Filters
                <X className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
              <select
                value={roleFilter || ''}
                onChange={(e) => setRoleFilter(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Roles</option>
                <option value="Rider">Rider</option>
                <option value="Driver">Driver</option>
                <option value="Promoter">Promoter</option>
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <UserCog className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    User Info
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      Role
                      {sortBy === 'role' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3 ml-1" /> 
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Joined
                      {sortBy === 'created_at' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3 ml-1" /> 
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total_spent')}
                  >
                    <div className="flex items-center">
                      Spent
                      {sortBy === 'total_spent' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3 ml-1" /> 
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('credit_balance')}
                  >
                    <div className="flex items-center">
                      Credits
                      {sortBy === 'credit_balance' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3 ml-1" /> 
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('point_balance')}
                  >
                    <div className="flex items-center">
                      Points
                      {sortBy === 'point_balance' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3 ml-1" /> 
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="font-medium text-gray-600">
                            {user.first_name ? user.first_name.charAt(0) : 
                             user.name ? user.name.charAt(0) : 
                             user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}` 
                              : user.name}
                          </div>
                          <div className="text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${user.total_spent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${user.credit_balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.point_balance} <span className="text-gray-500">/ {user.total_points_earned}</span>
                      {user.role === 'Promoter' && (
                        <button
                          onClick={() => window.open(`/promoter-dashboard?userId=${user.id}`, '_blank')}
                          className="mt-2 text-indigo-600 hover:text-indigo-900 inline-flex items-center text-xs bg-indigo-50 px-2 py-1 rounded-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          View Promoter Portal
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination -- Simplified for now */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
        <div className="flex-1 flex justify-between sm:hidden">
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Previous
          </button>
          <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredUsers.length}</span> users
            </p>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden shadow-xl relative">
            {/* Modal Header */}
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">User Details</h3>
              <button 
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setEditingRole(false);
                  setActionSuccess(null);
                  setActionError(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Success/Error Messages */}
              {actionSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-start">
                  <Check className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              
              {actionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
                  <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              
              {/* User profile section */}
              <div className="flex items-center mb-6">
                <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-lg font-bold text-indigo-600">
                  {selectedUser.first_name ? selectedUser.first_name.charAt(0) : 
                   selectedUser.name ? selectedUser.name.charAt(0) : 
                   selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold">
                    {selectedUser.first_name && selectedUser.last_name 
                      ? `${selectedUser.first_name} ${selectedUser.last_name}` 
                      : selectedUser.name}
                  </h4>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              
              {/* User details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-xs uppercase font-semibold">Email</span>
                  </div>
                  <div className="text-sm font-medium">{selectedUser.email}</div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-xs uppercase font-semibold">Joined</span>
                  </div>
                  <div className="text-sm font-medium">{formatDate(selectedUser.created_at)}</div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center text-gray-500 mb-1">
                    <UserCog className="h-4 w-4 mr-2" />
                    <span className="text-xs uppercase font-semibold">Role</span>
                  </div>
                  {editingRole ? (
                    <div className="flex items-center">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mr-2"
                      >
                        <option value="Rider">Rider</option>
                        <option value="Driver">Driver</option>
                        <option value="Promoter">Promoter</option>
                        <option value="Employee">Employee</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button 
                        onClick={handleRoleChange}
                        className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                      <button 
                        onClick={() => setEditingRole(true)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center text-gray-500 mb-1">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="text-xs uppercase font-semibold">Total Spent</span>
                  </div>
                  <div className="text-sm font-medium">${selectedUser.total_spent.toFixed(2)}</div>
                </div>
              </div>
              
              {/* Wallet Section */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-indigo-600" />
                  User Wallet
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Credits */}
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 text-sm">Credit Balance</span>
                      <span className="text-lg font-semibold text-green-600">${selectedUser.credit_balance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={creditsAmount || ''}
                        onChange={(e) => setCreditsAmount(parseFloat(e.target.value) || 0)}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mr-2"
                        placeholder="Amount"
                      />
                      <button 
                        onClick={handleAddCredits}
                        disabled={creditsAmount <= 0}
                        className="bg-green-600 text-white p-1 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Points */}
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 text-sm">Point Balance</span>
                      <div>
                        <span className="text-lg font-semibold text-blue-600">{selectedUser.point_balance}</span>
                        <span className="text-xs text-gray-500 ml-1">/ {selectedUser.total_points_earned} earned</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={pointsAmount || ''}
                        onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mr-2"
                        placeholder="Amount"
                      />
                      <button 
                        onClick={handleAddPoints}
                        disabled={pointsAmount <= 0}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {selectedUser.role === 'Promoter' && (
                      <button
                        onClick={() => window.open(`/promoter-dashboard?userId=${selectedUser.id}`, '_blank')}
                        className="mt-2 text-indigo-600 hover:text-indigo-900 inline-flex items-center text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        View Promoter Portal
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Point Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Point Tier Progress</span>
                    <div className="flex items-center">
                      <Trophy className="h-3 w-3 text-yellow-500 mr-1" />
                      <span>{selectedUser.point_balance} points</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, (selectedUser.point_balance / 5000) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Bronze</span>
                    <span>Silver</span>
                    <span>Gold</span>
                    <span>Platinum</span>
                    <span>Diamond</span>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                    setEditingRole(false);
                    setActionSuccess(null);
                    setActionError(null);
                  }}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};