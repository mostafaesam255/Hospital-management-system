# Hospital Management System with AI Diagnostics (HMS + AI Diagnostics)

A comprehensive clinic and hospital management system integrated with an advanced machine learning diagnostic hub. The application operates fully offline-first, utilizing the browser's **LocalStorage** for user sessions, state management, and database persistence.

---

## 🚀 Architectural Overview
The project is divided into two primary subsystems:
1. **Hospital Management Frontend (HMS Web App):** Built using **Angular v20+** standalone architecture. It utilizes reactive **Signals** for state management, built-in control flow, and **OnPush** change detection strategy for optimal performance.
2. **AI Diagnostics Hub:** A **Python** and **Streamlit** based web portal containing trained machine learning models (e.g., Diabetes Early Detection). It seamlessly retrieves patient metrics automatically from the main frontend application.

---

## 💻 Roles & Specialized Dashboards

The system features **7 specialized dashboards** tailored to hospital staff workflows:

### 1. Admin Dashboard
* **Staff Management:** Add, update, and delete users or medical personnel.
* **Clinics Management:** Add and modify medical clinics and specialties.

### 2. Receptionist Dashboard
* **Patient Registration:** Register new patients and validate national IDs.
* **Visit Bookings:** Schedule new clinic visits for patients.
* **Patient Search:** Instantly search through patient demographics and visit records.

### 3. Nurse Dashboard
* **Vitals Recording:** Log clinical measurements for queued patients:
  * Height, weight, and automated BMI calculations.
  * Blood pressure, pulse rate, temperature, and oxygen saturation.
* Saving vitals automatically advances the patient queue status to **Ready** for the doctor.

### 4. Doctor Dashboard
* **Queue Management:** View patients queued for the doctor's specific clinic.
* **Consultations:** Document diagnoses, request clinical investigations, and write prescriptions.
* **AI Diagnostics Integration:**
  * Open integrated machine learning models inside iframe overlays.
  * Automatically pre-fills patient details (age, gender, height, weight, BMI) in the AI hub using query parameters to save time.

### 5. Lab/Investigation Dashboard
* **Request Management:** View medical lab and imaging requests from doctors.
* **Results Entry:** Input laboratory findings, reports, and upload diagnostic attachments.
* **Status Updates:** Marking results as ready automatically flags the patient queue for the doctor to review.

### 6. Pharmacy Dashboard
* **Prescriptions Dispatch:** View approved prescriptions for patients who finished their doctor consultation.
* **Inventory Control:** Dispensing prescriptions automatically deducts quantities from the local stock.
* **Stock Alerting:** Generates real-time alerts when drugs fall below their configured minimum threshold (Low Stock Alerts).

### 7. Accountant Dashboard
* **Detailed Invoices:** Review billing logs detailing consultation fees, active prescriptions, and completed laboratory requests.
* **Payment Finalization:** Mark bills as paid to close out patient files.

---

## 🔑 Default Demo Credentials
The application automatically seeds mock database arrays into `localStorage` upon initial load. You can log in using any of the following credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@gmail.com` | `Admin123!` |
| **Doctor** | `doctor@gmail.com` | `Password123!` |
| **Nurse** | `nurse@gmail.com` | `Password123!` |
| **Receptionist** | `receptionist@gmail.com` | `Password123!` |
| **Pharmacy** | `pharmacy@gmail.com` | `Password123!` |
| **Lab/Investigation** | `lab@gmail.com` | `Password123!` |
| **Accountant** | `accountant@gmail.com` | `Password123!` |

---

## 🛠️ Installation & Execution Guide

### 1. Run the Hospital Management App (Angular)
Ensure [Node.js](https://nodejs.org/) is installed. Navigate to the project root directory in your terminal and execute:

```bash
# Navigate to the frontend directory
cd e:\HMS\HMS-AI

# Install project dependencies
npm install

# Run the local development server
npm run start
```
Open your browser and navigate to: [http://localhost:4200](http://localhost:4200)

---

### 2. Run the AI Diagnostics Hub (Streamlit)
Ensure [Python 3.10+](https://www.python.org/) is installed. Open a separate terminal window and execute:

```bash
# Navigate to the AI directory
cd e:\HMS\Ai

# Install required python packages
pip install -r requirements.txt

# Run the Streamlit server
streamlit run main_app.py
```
The Streamlit interface will start at: [http://localhost:8501](http://localhost:8501)

---

## 💾 Storage & Data Schema
All application entities are stored locally as JSON arrays under browser `localStorage` namespaces:
* `hms_users`: Staff logins, roles, and clinic assignments.
* `hms_patients`: Basic patient demographic records.
* `hms_patient_vitals`: Historic vitals recordings.
* `hms_patient_investigations`: Requested laboratory tests, reports, and results.
* `hms_patient_history`: Cumulative medical visits, diagnoses, and prescription logs.
* `hms_medicines`: Pharmacy stock levels, unit pricing, and thresholds.

This ensures all clinical state changes persist cleanly in the user's browser, enabling full functionality offline without setting up external servers.
