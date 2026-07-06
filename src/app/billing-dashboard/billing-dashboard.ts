import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService } from '../billing/billing.service';
import { Invoice } from '../billing/billing.model';

@Component({
  selector: 'app-billing-dashboard',
  imports: [CommonModule],
  templateUrl: './billing-dashboard.html',
  styleUrls: ['./billing-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillingDashboardComponent {
  private billingService = inject(BillingService);
  
  invoices = this.billingService.getAllInvoices();
  
  filterStatus = signal<'all' | 'paid' | 'pending'>('all');

  filteredInvoices = computed(() => {
    const invoices = this.invoices();
    const filter = this.filterStatus();
    if (filter === 'all') {
      return invoices;
    }
    return invoices.filter(invoice => invoice.status === filter);
  });

  markAsPaid(invoiceId: string) {
    this.billingService.markAsPaid(invoiceId);
  }

  setFilter(status: 'all' | 'paid' | 'pending') {
    this.filterStatus.set(status);
  }
}
