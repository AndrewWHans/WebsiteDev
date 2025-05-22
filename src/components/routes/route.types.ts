export type Route = {
  id: string;
  pickup_location: string;
  pickup_location_id?: string;
  dropoff_location: string;
  dropoff_location_id?: string;
  date: string;
  time_slots: string[];
  price: number;
  max_capacity_per_slot: number;
  min_threshold: number;
  tickets_sold: number;
  status: string;
  city: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
};

export type RouteFormData = {
  pickup_location: string;
  dropoff_location: string;
  price: number;
  max_capacity_per_slot: number;
  min_threshold: number;
  city: string;
}; 