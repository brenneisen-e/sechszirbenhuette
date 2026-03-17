/**
 * Guest CRUD and related operations
 * ES2024 optimized
 */

const API_BASE = '/api/admin';

function createHeaders(adminPassword: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-admin-password': adminPassword,
  };
}

// ============================================
// Guest Operations
// ============================================

export async function fetchGuests(adminPassword: string) {
  const response = await fetch(`${API_BASE}/guests`, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

export async function createGuest(adminPassword: string, guestData: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/guests`, {
    method: 'POST',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(guestData),
  });
  return response.json();
}

export async function updateGuest(adminPassword: string, guestData: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/guests`, {
    method: 'PUT',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(guestData),
  });
  return response.json();
}

export async function deleteGuest(adminPassword: string, guestId: number) {
  const response = await fetch(`${API_BASE}/guests?id=${guestId}`, {
    method: 'DELETE',
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Booking Operations
// ============================================

export async function fetchBookings(adminPassword: string, guestId: number) {
  const response = await fetch(`${API_BASE}/bookings?guest_id=${guestId}`, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

export async function createBooking(adminPassword: string, bookingData: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(bookingData),
  });
  return response.json();
}

export async function deleteBooking(adminPassword: string, bookingId: number) {
  const response = await fetch(`${API_BASE}/bookings?id=${bookingId}`, {
    method: 'DELETE',
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Task Operations
// ============================================

export async function fetchTasks(adminPassword: string, guestId: number) {
  const response = await fetch(`${API_BASE}/tasks?guest_id=${guestId}`, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

export async function createTask(
  adminPassword: string,
  taskData: { guest_id: number; title: string; description?: string; assignee?: string; due_date?: string },
) {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(taskData),
  });
  return response.json();
}

export async function updateTask(adminPassword: string, taskData: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'PUT',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(taskData),
  });
  return response.json();
}

export async function deleteTask(adminPassword: string, taskId: number) {
  const response = await fetch(`${API_BASE}/tasks?id=${taskId}`, {
    method: 'DELETE',
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Cost Operations
// ============================================

export async function fetchGuestCosts(adminPassword: string, guestId: number) {
  const response = await fetch(`${API_BASE}/costs?guest_id=${guestId}`, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

export async function createCost(adminPassword: string, costData: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/costs`, {
    method: 'POST',
    headers: createHeaders(adminPassword),
    body: JSON.stringify(costData),
  });
  return response.json();
}

export async function deleteCost(adminPassword: string, costId: number) {
  const response = await fetch(`${API_BASE}/costs?id=${costId}`, {
    method: 'DELETE',
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Document Operations
// ============================================

export async function fetchDocuments(adminPassword: string, guestId: number) {
  const response = await fetch(`${API_BASE}/guest-documents?guestId=${guestId}`, {
    headers: { 'x-admin-password': adminPassword },
  });
  return response.json();
}

export async function uploadDocument(
  adminPassword: string,
  guestId: number,
  file: File,
  documentType?: string,
  description?: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('guestId', guestId.toString());
  if (documentType) formData.append('documentType', documentType);
  if (description) formData.append('description', description);

  const response = await fetch(`${API_BASE}/guest-documents`, {
    method: 'POST',
    headers: { 'x-admin-password': adminPassword },
    body: formData,
  });
  return response.json();
}

export async function deleteDocument(adminPassword: string, documentId: number) {
  const response = await fetch(`${API_BASE}/guest-documents?id=${documentId}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  return response.json();
}

// ============================================
// Bank Transactions Operations
// ============================================

export async function fetchBankPayments(adminPassword: string, guestId?: number) {
  const url = guestId
    ? `${API_BASE}/bank-transactions?guest_id=${guestId}`
    : `${API_BASE}/bank-transactions`;
  const response = await fetch(url, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Setup Operations
// ============================================

export async function checkSetupStatus(adminPassword: string) {
  const response = await fetch(`${API_BASE}/setup`, {
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

export async function runSetupAction(adminPassword: string, action: string) {
  const response = await fetch(`${API_BASE}/setup?action=${action}`, {
    method: 'POST',
    headers: createHeaders(adminPassword),
  });
  return response.json();
}

// ============================================
// Analyze Booking Operations
// ============================================

export async function analyzeBookingFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/analyze-booking`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}
