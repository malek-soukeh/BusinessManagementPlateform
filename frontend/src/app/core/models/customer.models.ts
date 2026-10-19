export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  taxNumber: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/customers. */
export interface CustomerPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  taxNumber: string | null;
}

/** Body of PUT /api/customers/{id}: the status is optional and left unchanged when absent. */
export interface CustomerUpdatePayload extends CustomerPayload {
  status?: CustomerStatus;
}

export interface CustomerQuery {
  q: string;
  /** Empty string means every status. */
  status: CustomerStatus | '';
  page: number;
  size: number;
}

export function customerToPayload(customer: Customer): CustomerPayload {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    company: customer.company,
    taxNumber: customer.taxNumber
  };
}