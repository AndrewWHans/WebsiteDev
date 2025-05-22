import React from 'react';

type TimeSlotHeatmapProps = {
  data: any[];
};

export const TimeSlotHeatmap: React.FC<TimeSlotHeatmapProps> = ({ data }) => {
  // For now, we'll show a placeholder message
  return (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-500">Time slot analytics coming soon</p>
    </div>
  );
};