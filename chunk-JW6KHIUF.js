import{a as m}from"./chunk-NBQ6EJ6F.js";import{K as g,P as u,ca as r}from"./chunk-YV2LIY3H.js";var h=class c{pharmacyService=u(m);get apiKey(){return localStorage.getItem("hms_groq_api_key")||""}apiUrl="https://api.groq.com/openai/v1/chat/completions";isAnalyzing=r(!1);aiSuggestion=r(null);isAnalyzingVitals=r(!1);vitalsAnalysis=r(null);isAnalyzingPriority=r(!1);priorityAnalysis=r(null);isAnalyzingInteractions=r(!1);drugInteractions=r(null);isGeneratingReport=r(!1);analyticsReport=r(null);async callGroq(t){try{let e=await fetch(this.apiUrl,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"user",content:t}],temperature:.1,response_format:{type:"json_object"},max_tokens:1500})});if(!e.ok){let a=await e.text();throw console.error(`Groq API Error (${e.status}):`,a),new Error(`Groq API Error: ${e.status}`)}return(await e.json()).choices[0]?.message?.content||"{}"}catch(e){throw console.error("Fetch request to Groq failed:",e),e}}async analyzeAndPrescribe(t){if(!(!t||t.trim().length<3)){this.isAnalyzing.set(!0),this.aiSuggestion.set(null);try{let e=this.pharmacyService.medicines().filter(l=>l.quantity>0).map(l=>l.name).join(", "),s=`You are a Medical Consultant in an Egyptian hospital.
      Patient symptoms: "${t}".
      Available medicines: [${e}]
      IMPORTANT: Only prescribe medicines from the available list above.
      Return ONLY valid JSON:
      {
        "diagnosis": "string",
        "prescriptions": [{ "medicineName": "exact name from list", "dosage": "string", "frequency": "string" }],
        "precautions": ["string"]
      }
      No markdown, no extra text.`,o=(await this.callGroq(s)).replace(/```json|```/g,"").trim();this.aiSuggestion.set(JSON.parse(o))}catch(e){console.error("AI Error:",e),this.aiSuggestion.set({diagnosis:"An error occurred while contacting the AI service.",prescriptions:[],precautions:[]})}finally{this.isAnalyzing.set(!1)}}}async analyzeVitals(t){this.isAnalyzingVitals.set(!0),this.vitalsAnalysis.set(null);try{let e=(t.weight/(t.height/100)**2).toFixed(1),s=`You are a medical nurse assistant. Analyze these patient vitals:
      - Blood Pressure: ${t.bloodPressure} mmHg
      - Temperature: ${t.temperature}\xB0C
      - Pulse: ${t.pulse} bpm
      - Oxygen Saturation: ${t.oxygenSaturation}%
      - Height: ${t.height} cm, Weight: ${t.weight} kg, BMI: ${e}

      Return ONLY valid JSON:
      {
        "status": "Normal" | "Warning" | "Critical",
        "alerts": ["string - specific alert for each abnormal vital"],
        "recommendations": ["string - what the nurse should do"]
      }
      No markdown, no extra text.`,o=(await this.callGroq(s)).replace(/```json|```/g,"").trim();this.vitalsAnalysis.set(JSON.parse(o))}catch(e){console.error("Vitals AI Error:",e),this.vitalsAnalysis.set(null)}finally{this.isAnalyzingVitals.set(!1)}}async analyzePriority(t){if(!(!t||t.trim().length<3)){this.isAnalyzingPriority.set(!0),this.priorityAnalysis.set(null);try{let e=`You are a hospital receptionist assistant in an Egyptian hospital.
      Patient complaint: "${t}"

      IMPORTANT: The "reason" and "recommendations" fields MUST be written in Arabic. The "priority" value must remain in English ("Emergency" | "Urgent" | "Normal") as defined in the JSON schema.

      Return ONLY valid JSON:
      {
        "priority": "Emergency" | "Urgent" | "Normal",
        "reason": "string - one sentence in Arabic explaining why this priority",
        "recommendations": ["string - what the receptionist should do, in Arabic"]
      }
      No markdown, no extra text.`,a=(await this.callGroq(e)).replace(/```json|```/g,"").trim();this.priorityAnalysis.set(JSON.parse(a))}catch(e){console.error("Priority AI Error:",e),this.priorityAnalysis.set(null)}finally{this.isAnalyzingPriority.set(!1)}}}async analyzeDrugInteractions(t){if(!t||t.length<2){this.drugInteractions.set({safe:!0,interactions:[]});return}this.isAnalyzingInteractions.set(!0),this.drugInteractions.set(null);try{let e=`You are a clinical pharmacist assistant.
      Check for drug interactions between these medicines: [${t.join(", ")}]

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
      No markdown, no extra text.`,a=(await this.callGroq(e)).replace(/```json|```/g,"").trim();this.drugInteractions.set(JSON.parse(a))}catch(e){console.error("Drug Interaction AI Error:",e),this.drugInteractions.set(null)}finally{this.isAnalyzingInteractions.set(!1)}}async generateAnalyticsReport(t){this.isGeneratingReport.set(!0),this.analyticsReport.set(null);try{let e=t.diagnoses.reduce((n,i)=>(n[i]=(n[i]||0)+1,n),{}),s=t.medicines.reduce((n,i)=>(n[i]=(n[i]||0)+1,n),{}),a=Object.entries(e).sort((n,i)=>i[1]-n[1]).slice(0,5).map(([n,i])=>`${n}: ${i} cases`),o=Object.entries(s).sort((n,i)=>i[1]-n[1]).slice(0,5).map(([n,i])=>`${n}: ${i} times`),l=`You are a hospital analytics AI assistant.
      Analyze this hospital data and generate a smart report:

      Hospital Statistics:
      - Total Patients: ${t.totalPatients}
      - Total Consultations: ${t.totalConsultations}
      - Total Staff: ${t.totalStaff}
      - Total Clinics: ${t.totalClinics}

      Most Common Diagnoses:
      ${a.length>0?a.join(`
`):"No data available"}

      Most Prescribed Medicines:
      ${o.length>0?o.join(`
`):"No data available"}

      Return ONLY valid JSON:
      {
        "summary": "string - 2 sentence overall hospital performance summary",
        "topDiseases": [{ "name": "string", "count": number, "percentage": "string" }],
        "topMedicines": [{ "name": "string", "count": number }],
        "insights": ["string - smart insight about the data"],
        "recommendations": ["string - actionable recommendation for hospital admin"]
      }
      No markdown, no extra text.`,y=(await this.callGroq(l)).replace(/```json|```/g,"").trim();this.analyticsReport.set(JSON.parse(y))}catch(e){console.error("Analytics Report AI Error:",e),this.analyticsReport.set(null)}finally{this.isGeneratingReport.set(!1)}}static \u0275fac=function(e){return new(e||c)};static \u0275prov=g({token:c,factory:c.\u0275fac,providedIn:"root"})};export{h as a};
