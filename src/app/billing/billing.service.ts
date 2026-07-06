import { Injectable, signal, effect } from '@angular/core';
import { Invoice } from './billing.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private invoices = signal<Invoice[]>([]);

  constructor() {
    // Load invoices from localStorage on initialization
    const storedInvoices = localStorage.getItem('hms_invoices');
    if (storedInvoices) {
      this.invoices.set(JSON.parse(storedInvoices));
    }

    // Effect to sync invoices to localStorage whenever they change
    effect(() => {
      localStorage.setItem('hms_invoices', JSON.stringify(this.invoices()));
    });
  }

  createInvoice(invoiceData: Omit<Invoice, 'id' | 'date' | 'status'>): void {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: this.generateId(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      status: 'pending'
    };
    this.invoices.set([...this.invoices(), newInvoice]);
  }

  getAllInvoices() {
    return this.invoices;
  }

  markAsPaid(invoiceId: string): void {
    this.invoices.update(invoices =>
      invoices.map(invoice =>
        invoice.id === invoiceId ? { ...invoice, status: 'paid' } : invoice
      )
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
