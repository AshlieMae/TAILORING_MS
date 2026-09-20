// services/frontDeskApi.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authToken = (): string => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
};

export const handleResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status} ${response.statusText}).`);
  }
  if (data === null) throw new Error('The server returned an invalid response.');
  return data;
};

export interface Customer {
  customer_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  full_name: string;
  email: string;
  contact_number: string;
  address: string;
  date_of_birth: string;
  gender: string;
  civil_status: string;
  occupation: string;
  status: 'Active' | 'Pending approval' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  measurement_id: string;
  customer_id: string;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  sleeve: number | null;
  inseam: number | null;
  shoulder: number | null;
  neck: number | null;
  measurement_date: string;
  notes: string;
  is_snapshot: boolean;
  order_id: string | null;
  created_at: string;
}

export interface Order {
  order_id: string;
  job_card_id: string;
  customer_id: string;
  customer_name: string;
  garment_type: string;
  uniform_category: string;
  style_design: string;
  fabric: string;
  fabric_quantity: number;
  quantity: number;
  reference_image: string;
  special_instructions: string;
  target_completion_date: string;
  assigned_tailor_id: string;
  assigned_tailor_name: string;
  pickup_status: 'Not Ready' | 'Ready for Pickup' | 'Released';
  sent_to_production_at: string;
  labor_cost: number;
  fabric_cost: number;
  additional_charges: number;
  discount: number;
  total_amount: number;
  deposit_required: number;
  deposit_paid: number;
  remaining_balance: number;
  payment_status: 'No Payment' | 'Deposit Paid' | 'Partial' | 'Fully Paid';
  production_status: 'Draft' | 'Measuring' | 'Pattern Cutting' | 'Initial Assembly' | 'First Fitting' | 'Final Alterations' | 'Quality Review' | 'Completed' | 'Ready for Pickup' | 'Released';
  measurement_snapshot_id: string;
  order_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  payment_id: string;
  order_id: string;
  job_card_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_type: 'Deposit' | 'Final Payment' | 'Partial';
  payment_method: 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other';
  reference_number?: string | null;
  voided_at?: string | null;
  receipt_number: string;
  payment_date: string;
  recorded_by: string;
  recorded_by_name: string;
  notes: string;
}

export type AppointmentStatus =
  | 'Suggested'
  | 'Approved'
  | 'Rescheduled'
  | 'Completed'
  | 'Cancelled'
  // Legacy values retained for historical rows (migrated to 'Approved').
  | 'Scheduled'
  | 'Confirmed';

/** Production-driven visit types. Consultation is never bookable (counter intake). */
export type AppointmentType = 'First Fitting' | 'Second Fitting' | 'Final Fitting' | 'Pickup';

export interface Appointment {
  appointment_id: string;
  appointment_number?: string;
  customer_id: string;
  customer_name: string;
  order_id: string;
  job_card_id: string;
  garment?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: AppointmentType | string;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
  // Walk-in workflow: the system suggests, the Front Desk decides.
  suggested_reason?: string | null;
  suggested_at?: string | null;
  generated_from_stage?: string | null;
  appointment_origin?: 'production' | 'manual_exception';
  approved_at?: string | null;
  approved_by_user_id?: number | string | null;
  rescheduled_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  assigned_tailor_id?: string;
  assigned_tailor_name?: string;
  history?: { from_status: string | null; to_status: string; notes: string | null; created_at: string; actor_name: string | null }[];
}

export interface DailySummary {
  date: string;
  total_deposits: number;
  deposit_count: number;
  total_final_payments: number;
  final_payment_count: number;
  total_additional_charges: number;
  total_collected: number;
  total_expected: number;
  transactions: Payment[];
}

export interface PriceCalculation {
  laborCost: number;
  fabricCost: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  depositRequired: number;
  remainingBalance: number;
}

const frontDeskApi = {
  // Customer endpoints
  searchCustomers: async (query: string): Promise<Customer[]> => {
    const response = await fetch(`${API_URL}/customers/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    const response = await fetch(`${API_URL}/customers/${id}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  registerCustomer: async (data: {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    email: string;
    contactNumber: string;
    address: string;
    dateOfBirth: string;
    gender: string;
    civilStatus: string;
    occupation: string;
    password: string;
  }): Promise<Customer> => {
    const response = await fetch(`${API_URL}/auth/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update / edit an existing customer's personal details (Front Desk + Admin).
  updateCustomer: async (id: string, data: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    contact?: string;
    dateOfBirth?: string;
    gender?: string;
    civilStatus?: string;
    occupation?: string;
    address?: string;
  }): Promise<Customer> => {
    const response = await fetch(`${API_URL}/customers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Measurement endpoints
  getCustomerMeasurements: async (customerId: string): Promise<Measurement[]> => {
    const response = await fetch(`${API_URL}/measurements/customer/${customerId}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getLatestMeasurement: async (customerId: string): Promise<Measurement | null> => {
    const response = await fetch(`${API_URL}/measurements/customer/${customerId}/latest`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    if (response.status === 404) return null;
    return handleResponse(response);
  },

  createMeasurement: async (data: {
    customerId: string;
    chest: number | null;
    waist: number | null;
    hip: number | null;
    sleeve: number | null;
    inseam: number | null;
    shoulder: number | null;
    neck: number | null;
    measurementDate: string;
    notes: string;
    orderId?: string;
    isSnapshot?: boolean;
  }): Promise<Measurement> => {
    const response = await fetch(`${API_URL}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateMeasurement: async (id: string, data: Partial<Measurement>): Promise<Measurement> => {
    const response = await fetch(`${API_URL}/measurements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Order endpoints
  createOrder: async (data: {
    customerId: string;
    garmentType: string;
    uniformCategory?: string;
    styleDesign: string;
    fabric: string;
    fabricQuantity: number;
    quantity: number;
    referenceImage: string;
    specialInstructions: string;
    targetCompletionDate: string;
    assignedTailorId: string;
    measurementSnapshotId: string;
    orderNotes: string;
  }): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getOrderByJobCard: async (jobCardId: string): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders/job-card/${jobCardId}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getCustomerOrders: async (customerId: string): Promise<Order[]> => {
    const response = await fetch(`${API_URL}/orders/customer/${customerId}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getAllOrders: async (): Promise<Order[]> => {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getOrdersByStatus: async (status: string): Promise<Order[]> => {
    const response = await fetch(`${API_URL}/orders/status/${status}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  updateOrderStatus: async (orderId: string, status: string): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  updateOrderPayment: async (orderId: string, data: {
    depositPaid?: number;
    remainingBalance?: number;
    paymentStatus?: string;
  }): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders/${orderId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Payment endpoints
  recordPayment: async (data: {
    orderId: string;
    amount: number;
    paymentType: 'Deposit' | 'Final Payment' | 'Partial';
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other';
    referenceNumber?: string;
    notes: string;
  }): Promise<Payment> => {
    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getOrderPayments: async (orderId: string): Promise<Payment[]> => {
    const response = await fetch(`${API_URL}/payments/order/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getAllPayments: async (): Promise<Payment[]> => {
    const response = await fetch(`${API_URL}/payments`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  voidPayment: async (paymentId: string, reason: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/payments/${paymentId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  // Appointment endpoints (walk-in, production-driven).
  // The system SUGGESTS a visit when production reaches a milestone; the Front
  // Desk decides. Tailors and customers can never create or change a visit.
  getPendingAppointments: async (): Promise<Appointment[]> => {
    const response = await fetch(`${API_URL}/appointments/pending`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  // Pending Appointment Approvals -> Approve. Customer, job card, type and
  // tailor stay exactly as the production record derived them.
  approveAppointment: async (appointmentId: string, notes = ''): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ notes }),
    });
    return handleResponse(response);
  },

  // MANUAL EXCEPTION APPOINTMENT — special follow-ups only. An existing job
  // card is required; its customer and assigned tailor are derived server-side.
  createExceptionAppointment: async (data: {
    jobCardNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    notes?: string;
  }): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAppointments: async (): Promise<Appointment[]> => {
    const response = await fetch(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  // View Details — the appointment plus its append-only decision history.
  getAppointmentDetails: async (appointmentId: string): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/details`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  cancelAppointment: async (appointmentId: string, notes = ''): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ notes }),
    });
    return handleResponse(response);
  },

  // Mark the visit completed once the customer attends the fitting or pickup.
  completeAppointment: async (appointmentId: string, notes = ''): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ notes }),
    });
    return handleResponse(response);
  },

  // Reschedule an EXISTING visit (Suggested/Approved). ONLY the date, time and
  // notes may change: customer, job card, appointment type and assigned tailor
  // come from the job card and stay locked.
  rescheduleAppointment: async (appointmentId: string, data: {
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  }): Promise<Appointment> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Dashboard endpoints
  getDashboardStats: async (): Promise<{
    todayCustomers: number;
    todayOrders: number;
    pendingPayments: number;
    upcomingFittings: number;
    readyForPickup: number;
    todayCollected: number;
  }> => {
    const response = await fetch(`${API_URL}/frontdesk/dashboard`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getRecentActivity: async (): Promise<any[]> => {
    const response = await fetch(`${API_URL}/frontdesk/recent-activity`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  getDailySummary: async (date: string): Promise<DailySummary> => {
    const response = await fetch(`${API_URL}/frontdesk/daily-summary?date=${date}`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  // Price calculation
  calculatePrice: async (data: {
    garmentType: string;
    uniformCategory?: string;
    fabric: string;
    fabricQuantity: number;
    quantity: number;
    additionalCharges: number;
    discount: number;
  }): Promise<PriceCalculation> => {
    const response = await fetch(`${API_URL}/orders/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

    // Release order
  releaseOrder: async (orderId: string, release: { releasedToName: string; releasedToRelation?: string; releaseReference?: string; releaseAcknowledged: boolean }): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders/${orderId}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(release),
    });
    return handleResponse(response);
  },

  // Send a job card to production (Front Desk → Master Tailor handoff).
  // Validates customer, measurements, garment, fabric, quantity, deadline,
  // tailor assignment, and the initial-deposit requirement server-side, then
  // sets the production status to 'Measuring' and notifies the assigned tailor.
  // This is the single backend record the Master Tailor reads from their dashboard.
  sendToProduction: async (orderId: string, assignedTailorId?: string): Promise<Order> => {
    const response = await fetch(`${API_URL}/orders/${orderId}/send-to-production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify(assignedTailorId ? { assignedTailorId } : {}),
    });
    return handleResponse(response);
  },

  // Add a production note / instruction for the Master Tailor on a job card.
  addOrderInstruction: async (orderId: string, note: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/orders/${orderId}/instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ note }),
    });
    return handleResponse(response);
  },

  // Generate receipt
  generateReceipt: async (paymentId: string): Promise<{
    receiptNumber: string;
    receiptData: any;
  }> => {
    const response = await fetch(`${API_URL}/payments/${paymentId}/receipt`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  // Get ready for pickup orders
  getReadyForPickup: async (): Promise<Order[]> => {
    const response = await fetch(`${API_URL}/orders/ready-for-pickup`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },

  // Get upcoming fittings
  getUpcomingFittings: async (): Promise<Appointment[]> => {
    const response = await fetch(`${API_URL}/appointments/upcoming`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },
  getFabricCatalog: async (): Promise<{ fabrics: { id: number; fabricName: string; tone: string; unit: string }[] }> => {
    const response = await fetch(`${API_URL}/auth/catalog/fabrics`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    return handleResponse(response);
  },
  getTailors: async (): Promise<{ id: number; full_name: string; position: string; employee_id: string }[]> => {
    const response = await fetch(`${API_URL}/frontdesk/tailors`, {
      headers: { Authorization: `Bearer ${authToken()}` },
    });
    const data = await handleResponse<{ tailors: { id: number; full_name: string; position: string; employee_id: string }[] }>(response);
    return data.tailors || [];
  },

};

export default frontDeskApi;
