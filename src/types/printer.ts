export interface Printer {
  id:           string;
  name:         string;
  printer_type: "thermal_tcp" | "screen";
  ip:           string | null;
  port:         number;
  paper_mm:     number;
  roles:        string;  // "receipt" | "kitchen" | "receipt,kitchen"
  sort_order:   number;
  created_at:   string;
}

export interface PrinterInput {
  name:         string;
  printer_type: "thermal_tcp" | "screen";
  ip:           string | null;
  port:         number;
  paper_mm:     number;
  roles:        string;
}

export function printerHasRole(p: Printer, role: "receipt" | "kitchen"): boolean {
  return p.roles.split(",").map((r) => r.trim()).includes(role);
}
