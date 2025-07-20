import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Users, 
  Search, 
  Filter, 
  ChevronDown, 
  RefreshCw, 
  User, 
  Mail, 
  Calendar, 
  ArrowUp, 
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Car,
  UserCheck,
  Megaphone,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type UserProfile = {
  id: string;
  email: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  role: 'Admin' | 'Driver' | 'Employee' | 'Promoter' | 'Rider' | 'Error';
  college: string | null;
  greek_life: string | null;
  created_at: string;
  updated_at: string;
  phone_number: string | null;
  profile_picture_url: string | null;
};

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'role' | 'name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter and sort users when data or filters change
    let filtered = [...users];
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(search) || 
        (user.name && user.name.toLowerCase().includes(search)) ||
        (user.first_name && user.first_name.toLowerCase().includes(search)) ||
        (user.last_name && user.last_name.toLowerCase().includes(search))
      );
    }
    
    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'email':
          valueA = a.email;
          valueB = b.email;
          break;
        case 'role':
          valueA = a.role;
          valueB = b.role;
          break;
        case 'name':
          valueA = getUserDisplayName(a);
          valueB = getUserDisplayName(b);
          break;
        case 'created_at':
        default:
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
          break;
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, sortBy, sortDirection]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map any null or undefined roles to 'Error'
      const usersWithValidRoles = (data || []).map(user => ({
        ...user,
        role: user.role || 'Error'
      }));
      
      setUsers(usersWithValidRoles);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    if (newRole === 'Error') {
      setError('Cannot manually set role to Error status');
      return;
    }

    setUpdatingRole(userId);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as any } : user
      ));
      
      setSuccess(`User role updated to ${newRole} successfully`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleSort = (field: 'created_at' | 'email' | 'role' | 'name') => {
    if (sortBy === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.name || user.email;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'Driver':
        return <Car className="w-4 h-4 text-blue-600" />;
      case 'Employee':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'Promoter':
        return <Megaphone className="w-4 h-4 text-orange-600" />;
      case 'Rider':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'Error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Driver':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Employee':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Promoter':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Rider':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvailableRoles = () => {
    return ['Admin', 'Driver', 'Employee', 'Promoter', 'Rider'];
  };

  const getRoleCount = (role: string) => {
    return users.filter(user => user.role === role).length;
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
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
          <button
            onClick={loadUsers}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Role Statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {['Admin', 'Driver', 'Employee', 'Promoter', 'Rider', 'Error'].map((role) => (
          <div key={role} className="bg-white rounded-lg shadow p-4 border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {getRoleIcon(role)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{role}</p>
                <p className="text-lg font-semibold text-gray-700">{getRoleCount(role)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mt-8 mb-6 bg-white shadow rounded-lg p-4">
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
              placeholder="Search by name or email..."
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
          </div>
        </div>

        {/* Expanded Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={roleFilter || ''}
                onChange={(e) => setRoleFilter(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Driver">Driver</option>
                <option value="Employee">Employee</option>
                <option value="Promoter">Promoter</option>
                <option value="Rider">Rider</option>
                <option value="Error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortBy(field as 'created_at' | 'email' | 'role' | 'name');
                  setSortDirection(direction as 'asc' | 'desc');
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="role-asc">Role (A-Z)</option>
                <option value="role-desc">Role (Z-A)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        <span>User</span>
                        {sortBy === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        <span>Email</span>
                        {sortBy === 'email' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center">
                        <span>Role</span>
                        {sortBy === 'role' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        <span>Joined</span>
                        {sortBy === 'created_at' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p>No users found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {user.profile_picture_url ? (
                                <img className="h-10 w-10 rounded-full" src={user.profile_picture_url} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {getUserDisplayName(user)}
                              </div>
                              {user.college && (
                                <div className="text-gray-500 text-xs">{user.college}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            {user.email}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex items-center">
                            {getRoleIcon(user.role)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </span>
                            {user.role === 'Promoter' && (
                              <button
                                onClick={() => window.open(`/promoter-dashboard?userId=${user.id}`, '_blank')}
                                className="ml-2 text-indigo-600 hover:text-indigo-900 inline-flex items-center text-xs bg-indigo-50 px-2 py-1 rounded-md"
                                title="View Promoter Portal"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Portal
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.phone_number && (
                            <div className="text-gray-500">{user.phone_number}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {user.role === 'Error' ? (
                            <div className="text-red-600 text-xs">
                              Role Error - Contact Support
                            </div>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                              disabled={updatingRole === user.id}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {getAvailableRoles().map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          )}
                          {updatingRole === user.id && (
                            <Loader2 className="w-4 h-4 animate-spin ml-2 inline" />
                          )}
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

      {/* Error Role Information */}
      {users.some(user => user.role === 'Error') && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Users with Role Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Some users have "Error" role status due to failed role fetching operations. 
                  This typically indicates database connectivity issues or missing profile data.
                </p>
                <p className="mt-1">
                  <strong>Recommended actions:</strong>
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check database connectivity and RLS policies</li>
                  <li>Verify user profiles exist in the profiles table</li>
                  <li>Manually assign roles to affected users</li>
                  <li>Contact technical support if issues persist</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};