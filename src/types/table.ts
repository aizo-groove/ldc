export type TableShape  = "square" | "round" | "rect";
export type TableStatus = "libre" | "occupe" | "addition";

export interface Room {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

export interface RestaurantTable {
  id: string;
  room_id: string | null;
  name: string;
  seats: number;
  shape: TableShape;
  status: TableStatus;
  pos_x: number;
  pos_y: number;
  sort_order: number;
}
