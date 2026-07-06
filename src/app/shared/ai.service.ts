import { Injectable, signal, inject } from '@angular/core';
import { PharmacyService } from '../pharmacy/pharmacy.service';

@Injectable({ providedIn: 'root' })
export class AIService {
  private pharmacyService = inject(PharmacyService);
  private apiKey = 'YOUR_GROQ_API_KEY';
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  // Doctor
  isAnalyzing = signal(false);
  aiSuggestion = signal<any>(null);

  // Nurse
  isAnalyzingVitals = signal(false);
  vitalsAnalysis = signal<any>(null);

  // Receptionist
  isAnalyzingPriority = signal(false);
  priorityAnalysis = signal<any>(null);

  // Pharmacy
  isAnalyzingInteractions = signal(false);
  drugInteractions = signal<any>(null);

  // ✅ Admin Analytics
  isGeneratingReport = signal(false);
  analyticsReport = signal<any>(null);

  // ============ Shared Groq Call ============
  private async callGroq(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // تقليل الـ temperature لمنع التأليف
          response_format: { type: 'json_object' }, // إجبار الـ API على إرجاع JSON فقط
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Groq API Error (${response.status}):`, errText);
        throw new Error(`Groq API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '{}';
    } catch (error) {
      console.error('Fetch request to Groq failed:', error);
      throw error;
    }
  }

  // ============ Doctor - تحليل الأعراض ============
  async analyzeAndPrescribe(symptoms: string) {
    if (!symptoms || symptoms.trim().length < 3) return;

    this.isAnalyzing.set(true);
    this.aiSuggestion.set(null);

    try {
      const availableMedicines = this.pharmacyService.medicines()
        .filter(m => m.quantity > 0)
        .map(m => m.name)
        .join(', ');

      const prompt = `You are a Medical Consultant in an Egyptian hospital.
      Patient symptoms: "${symptoms}".
      Available medicines: [${availableMedicines}]
      IMPORTANT: Only prescribe medicines from the available list above.
      Return ONLY valid JSON:
      {
        "diagnosis": "string",
        "prescriptions": [{ "medicineName": "exact name from list", "dosage": "string", "frequency": "string" }],
        "precautions": ["string"]
      }
      No markdown, no extra text.`;

      const text = await this.callGroq(prompt);
      const clean = text.replace(/```json|```/g, '').trim();
      this.aiSuggestion.set(JSON.parse(clean));

    } catch (error) {
      console.error('AI Error:', error);
      this.aiSuggestion.set({
        diagnosis: 'An error occurred while contacting the AI service.',
        prescriptions: [],
        precautions: []
      });
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  // ============ Nurse - تحليل الـ Vitals ============
  async analyzeVitals(vitals: {
    height: number, weight: number, bloodPressure: string,
    temperature: number, pulse: number, oxygenSaturation: number
  }) {
    this.isAnalyzingVitals.set(true);
    this.vitalsAnalysis.set(null);

    try {
      const bmi = (vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1);

      const prompt = `You are a medical nurse assistant. Analyze these patient vitals:
      - Blood Pressure: ${vitals.bloodPressure} mmHg
      - Temperature: ${vitals.temperature}°C
      - Pulse: ${vitals.pulse} bpm
      - Oxygen Saturation: ${vitals.oxygenSaturation}%
      - Height: ${vitals.height} cm, Weight: ${vitals.weight} kg, BMI: ${bmi}

      Return ONLY valid JSON:
      {
        "status": "Normal" | "Warning" | "Critical",
        "alerts": ["string - specific alert for each abnormal vital"],
        "recommendations": ["string - what the nurse should do"]
      }
      No markdown, no extra text.`;

      const text = await this.callGroq(prompt);
      const clean = text.replace(/```json|```/g, '').trim();
      this.vitalsAnalysis.set(JSON.parse(clean));

    } catch (error) {
      console.error('Vitals AI Error:', error);
      this.vitalsAnalysis.set(null);
    } finally {
      this.isAnalyzingVitals.set(false);
    }
  }

  // ============ Receptionist - تحليل الأولوية ============
  async analyzePriority(complaint: string) {
    if (!complaint || complaint.trim().length < 3) return;

    this.isAnalyzingPriority.set(true);
    this.priorityAnalysis.set(null);

    try {
      const prompt = `You are a hospital receptionist assistant in an Egyptian hospital.
      Patient complaint: "${complaint}"

      IMPORTANT: The "reason" and "recommendations" fields MUST be written in Arabic. The "priority" value must remain in English ("Emergency" | "Urgent" | "Normal") as defined in the JSON schema.

      Return ONLY valid JSON:
      {
        "priority": "Emergency" | "Urgent" | "Normal",
        "reason": "string - one sentence in Arabic explaining why this priority",
        "recommendations": ["string - what the receptionist should do, in Arabic"]
      }
      No markdown, no extra text.`;

      const text = await this.callGroq(prompt);
      const clean = text.replace(/```json|```/g, '').trim();
      this.priorityAnalysis.set(JSON.parse(clean));

    } catch (error) {
      console.error('Priority AI Error:', error);
      this.priorityAnalysis.set(null);
    } finally {
      this.isAnalyzingPriority.set(false);
    }
  }

  // ============ Pharmacy - تحليل التداخل الدوائي ============
  async analyzeDrugInteractions(medicines: string[]) {
    if (!medicines || medicines.length < 2) {
      this.drugInteractions.set({ safe: true, interactions: [] });
      return;
    }

    this.isAnalyzingInteractions.set(true);
    this.drugInteractions.set(null);

    try {
      const prompt = `You are a clinical pharmacist assistant.
      Check for drug interactions between these medicines: [${medicines.join(', ')}]

      Return ONLY valid JSON:
      {
        "safe": true | false,
        "interactions": [
          {
            "drugs": ["drug1", "drug2"],
            "severity": "High" | "Moderate" | "Low",
            "effect": "string - what happens when taken together",
            "recommendation": "string - what pharmacist should do"
          }
        ]
      }
      If no interactions found, return { "safe": true, "interactions": [] }
      No markdown, no extra text.`;

      const text = await this.callGroq(prompt);
      const clean = text.replace(/```json|```/g, '').trim();
      this.drugInteractions.set(JSON.parse(clean));

    } catch (error) {
      console.error('Drug Interaction AI Error:', error);
      this.drugInteractions.set(null);
    } finally {
      this.isAnalyzingInteractions.set(false);
    }
  }

  // ============ ✅ Admin - تقرير التحليلات الذكي ============
  async generateAnalyticsReport(data: {
    totalPatients: number,
    totalConsultations: number,
    totalStaff: number,
    totalClinics: number,
    diagnoses: string[],
    medicines: string[]
  }) {
    this.isGeneratingReport.set(true);
    this.analyticsReport.set(null);

    try {
      // حساب أكثر الأمراض تكراراً
      const diagnosisCount = data.diagnoses.reduce((acc: any, d) => {
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});

      // حساب أكثر الأدوية صرفاً
      const medicineCount = data.medicines.reduce((acc: any, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});

      const topDiagnoses = Object.entries(diagnosisCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name}: ${count} cases`);

      const topMedicines = Object.entries(medicineCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name}: ${count} times`);

      const prompt = `You are a hospital analytics AI assistant.
      Analyze this hospital data and generate a smart report:

      Hospital Statistics:
      - Total Patients: ${data.totalPatients}
      - Total Consultations: ${data.totalConsultations}
      - Total Staff: ${data.totalStaff}
      - Total Clinics: ${data.totalClinics}

      Most Common Diagnoses:
      ${topDiagnoses.length > 0 ? topDiagnoses.join('\n') : 'No data available'}

      Most Prescribed Medicines:
      ${topMedicines.length > 0 ? topMedicines.join('\n') : 'No data available'}

      Return ONLY valid JSON:
      {
        "summary": "string - 2 sentence overall hospital performance summary",
        "topDiseases": [{ "name": "string", "count": number, "percentage": "string" }],
        "topMedicines": [{ "name": "string", "count": number }],
        "insights": ["string - smart insight about the data"],
        "recommendations": ["string - actionable recommendation for hospital admin"]
      }
      No markdown, no extra text.`;

      const text = await this.callGroq(prompt);
      const clean = text.replace(/```json|```/g, '').trim();
      this.analyticsReport.set(JSON.parse(clean));

    } catch (error) {
      console.error('Analytics Report AI Error:', error);
      this.analyticsReport.set(null);
    } finally {
      this.isGeneratingReport.set(false);
    }
  }
}