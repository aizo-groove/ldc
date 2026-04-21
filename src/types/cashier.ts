export interface Cashier {
  id: string;
  name: string;
  pin: string | null;
  role: "cashier" | "manager";
  active: number;
  created_at: string;
}
