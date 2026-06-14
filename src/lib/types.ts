export interface Settings {
  id: string;
  company_name: string;
  owner_name: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  ust_id: string | null;
  tax_number: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  logo_url: string | null;
  default_payment_days: number | null;
  default_tax_rate: number | null;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
}

export interface Client {
  id: string;
  company: string | null;
  name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  ust_id: string | null;
  notes: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string;
  tax_rate: number | null;
  is_active: boolean | null;
}

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  due_date: string | null;
  performance_period_start: string | null;
  performance_period_end: string | null;
  status: InvoiceStatus;
  notes: string | null;
  total_net: number | null;
  total_tax: number | null;
  total_gross: number | null;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number | null;
  line_total: number | null;
}
