import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type RevenueChartProps = {
  data: any[];
  timeRange: string;
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, timeRange }) => {
  // Process data for chart
  const chartData = data.reduce((acc: any[], booking) => {
    const date = new Date(booking.created_at).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        existing.revenue += booking.total_price;
      }
    } else {
      acc.push({
        date,
        revenue: (booking.status === 'confirmed' || booking.status === 'completed') 
          ? booking.total_price 
          : 0
      });
    }
    
    return acc;
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip 
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#4F46E5"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};