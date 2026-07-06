import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PatientService } from '../patient/patient.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Investigation } from '../patient/patient.model';

type InvestigationWithPatient = Investigation & { patientName: string };

@Component({
  selector: 'app-investigation-dashboard',
  templateUrl: './investigation-dashboard.component.html',
  styleUrls: ['./investigation-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, DatePipe]
})
export class InvestigationDashboardComponent {
  public patientService = inject(PatientService);
  private formBuilder = inject(FormBuilder);

  public investigations = computed(() => 
    this.patientService.patients().flatMap(p =>
      p.investigations.map(inv => ({ ...inv, patientName: p.name })))
  );

  public pendingCount = computed(() => this.investigations().filter(i => i.status === 'Requested').length);
  public processingCount = computed(() => this.investigations().filter(i => i.status === 'In Progress').length);
  public completedCount = computed(() => this.investigations().filter(i => i.status === 'Results Ready').length);

  public showResultModal = signal(false);
  public selectedInvestigation = signal<InvestigationWithPatient | null>(null);
  public selectedFilePreview = signal<string | ArrayBuffer | null>(null);
  private selectedFile: File | null = null;

  public resultForm = this.formBuilder.group({
    result: ['', Validators.required],
    report: ['']
  });

  openResultModal(investigation: InvestigationWithPatient): void {
    console.log('Opening result modal for', investigation);
    this.selectedInvestigation.set(investigation);
    this.resultForm.reset({
      result: investigation.result || '',
      report: investigation.report || ''
    });
    this.showResultModal.set(true);
  }

  closeResultModal(): void {
    this.showResultModal.set(false);
    this.selectedInvestigation.set(null);
    this.selectedFile = null;
    this.selectedFilePreview.set(null);
  }

  viewAttachment(investigation: InvestigationWithPatient): void {
    console.log('Viewing attachment for', investigation);
    alert('Viewing attachment for ' + investigation.patientName);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedFilePreview.set(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async onResultSubmit(): Promise<void> {
    if (this.resultForm.invalid || !this.selectedInvestigation()) return;

    const investigationId = this.selectedInvestigation()!.id;
    const patient = this.patientService.patients().find(p => p.investigations.some(inv => inv.id === investigationId));
    const attachment = this.selectedFilePreview() ? this.selectedFilePreview() as string : '';

    if (patient) {
      await this.patientService.updateInvestigationResult(
        patient.id,
        investigationId,
        this.resultForm.value.result!,
        this.resultForm.value.report!,
        attachment
      );
    }
    this.closeResultModal();
  }
}
