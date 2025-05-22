import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type RoutePerformanceTableProps = {
  routes: any[];
};

export const RoutePerformanceTable: React.FC<RoutePerformanceTableProps> = ({ routes }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Route
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Threshold
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sold
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fill Rate
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Revenue
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {routes.map((route) => (
            <tr key={route.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {route.route}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(route.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {route.capacity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {route.threshold}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {route.sold}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                    <div 
                      className={`h-2 rounded-full ${
                        route.fillRate >= 90 
                          ? 'bg-green-500'
                          : route.fillRate >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, route.fillRate)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">
                    {Math.round(route.fillRate)}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${route.revenue.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  route.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : route.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {route.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {route.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                  {route.status === 'active' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};