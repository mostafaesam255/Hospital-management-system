
# Project Blueprint

## Overview

This project is a Hospital Management System (HMS) built with Angular. It features a modular architecture with role-based dashboards for different users, including doctors, nurses, and administrators. The system leverages modern Angular features like standalone components and signals for state management. A key feature is the integration of a Gemini-powered AI assistant to provide diagnostic support to doctors.

## Style, Design, and Features

### Implemented as of 2026-04-28:

*   **UI/UX:**
    *   Professional and modern user interface with a clean layout and intuitive navigation.
    *   Role-based dashboards for Doctors, Pharmacists, Receptionists, and other roles.
    *   The Doctor's dashboard features a patient lookup, a consultation workspace, and an AI-powered assistant.
    *   The patient header card in the Doctor's dashboard has been redesigned for a more professional look and feel.

*   **Core Functionality:**
    *   The application is built entirely with standalone components, following the latest Angular best practices.
    *   State management is handled using Angular Signals.
    *   The application uses a modular, feature-based architecture.

*   **AI Assistant:**
    *   The AI assistant is powered by the Google Gemini API, using the latest `@google/genai` SDK and the `gemini-3-flash-preview` model.
    *   The AI provides diagnostic suggestions based on patient symptoms entered by the doctor.
    *   The AI service has been enhanced to be more dynamic and context-aware, preventing static or canned responses.
    *   Robust error handling and JSON parsing have been implemented to handle malformed responses from the Gemini API.
    *   The API key is sanitized to prevent header-related errors.

## Current Task: Upgrade to Gemini 3 (2026-04-28)

*   **Objective:** Migrate the Doctor Dashboard to the 2026 Gemini 3 infrastructure to fix all 400/404 errors.

*   **Steps Taken:**
    1.  **SDK Migration:** Uninstalled the outdated `@google/generative-ai` package and installed the new `@google/genai` package.
    2.  **Service Refactoring:** Updated both `src/app/ai.service.ts` and `src/app/shared/ai.service.ts` to use the new Gemini 3 SDK. This included:
        *   Modifying the `analyzeAndPrescribe` method to use `ai.models.generateContent` with the `gemini-3-flash-preview` model.
        *   Handling the API response using the `response.text` property.
    3.  **Error Resolution:** Identified and fixed build errors related to incorrect file paths and potentially undefined response values, ensuring a successful build.

## Current Task: AWS Deployment & API Integration (May 2026)

*   **Objective:** Deploy both Frontend (Angular) and Backend (.NET WebApi) to AWS and link them.
*   **Infrastructure Details:**
    *   **Frontend:** Hosted on AWS S3 (`http://hms-ai-app-094156049477.s3-website-us-east-1.amazonaws.com`).
    *   **Backend (API):** Hosted on AWS Elastic Beanstalk (`http://hms-api-prod.eba-ymxz3wka.us-east-1.elasticbeanstalk.com/api`).
    *   **Database:** Hosted on AWS RDS SQL Server (`hms-db.cc94mcu64e43.us-east-1.rds.amazonaws.com,1433`).
*   **Steps Taken:**
    1.  **Backend Deployment (Elastic Beanstalk v8):**
        *   Resolved Nginx `502 Bad Gateway` by changing the application port to the default Elastic Beanstalk port **5000** (via `Procfile` command: `web: dotnet WebApi.dll --urls http://0.0.0.0:5000`).
        *   Removed custom `.platform` Nginx config to prevent port 80 conflicts with EB's default server block.
        *   Created `hms-api-v8.zip`, uploaded to S3, and deployed successfully. Verified database migration and connectivity.
    2.  **Frontend Deployment (S3):**
        *   Configured `environment.prod.ts` with the Elastic Beanstalk production API URL.
        *   Added `deploy:aws` script in `package.json` to automate production build (`ng build --configuration production`) and sync build assets with the S3 bucket.
        *   Successfully built and uploaded the frontend to S3. Verified CORS settings on the backend to allow requests from the S3 website origin.

## Current Task: Clinic and Drug Seeding Bug Fix (May 2026)

*   **Objective:** Resolve `500 Internal Server Error` when adding a clinic or a drug, caused by empty database tables (`TbMedicalSpecialty` and `TbDrugCategory`) violating foreign key constraints.
*   **Proposed Changes:**
    *   **Backend (`WebApi/Services/ContextConfig.cs`):**
        *   Seed the default Medical Specialty (`83ac97b4-ceb6-4fac-9bfe-0343c6abe04a`) if it does not exist.
        *   Seed the default Drug Category (`00000000-0000-0000-0000-000000000000`) if it does not exist.
*   **Verification:**
    *   Deploy the backend `v9` to Elastic Beanstalk.
    *   Test adding a clinic in the admin dashboard.

## Current Task: Pharmacy Delete Fix & Form Validations (May 2026)

*   **Objective:**
    1.  Fix the deletion bug in the Pharmacy dashboard.
    2.  Add National ID (14 digits) and Phone (11 digits) validation to the Receptionist patient form.
    3.  Add Username (@gmail.com) and Password (uppercase + special character) validation to the Admin add user form.

*   **Proposed Changes:**
    *   **Frontend (`src/app/pharmacy/pharmacy.service.ts`):**
        *   Change `deleteMedicine` to use `JSON.stringify(id)` and set `Content-Type: application/json` headers to match backend expectation.
    *   **Frontend (`src/app/receptionist-dashboard/receptionist-dashboard.component.ts` & `.html`):**
        *   Update `nationalId` validators in `patientForm` with `Validators.pattern('^[0-9]{14}$')`.
        *   Update `contact` validators in `patientForm` with `Validators.pattern('^[0-9]{11}$')`.
        *   Add placeholders and validation error messages for both fields in the HTML template.
    *   **Frontend (`src/app/admin-dashboard/admin-dashboard.component.ts` & `.html`):**
        *   Update `username` validator with `Validators.pattern('^[a-zA-Z0-9._%+-]+@gmail\\.com$')`.
        *   Add `resetPasswordValidators()` method to restore validators when adding a new user.
        *   Add password pattern validation: `Validators.pattern('^(?=.*[A-Z])(?=.*[@#*$!%?&]).{6,}$')`.
        *   Add placeholders, validation error messages, and description hints in the HTML template.

*   **Verification:**
    *   Build and deploy the Angular application to S3.
    *   Verify deletion on the Pharmacy page.
    *   Verify validations on Receptionist and Admin forms.

## Current Task: Night Mode (Dark Mode) Toggle (May 2026)

*   **Objective:** Implement a premium and modern Night Mode theme toggler using Angular Signals and CSS variables.
*   **Proposed Changes:**
    *   **Frontend (`src/app/shared/services/theme.service.ts`):** Create service to manage and persist theme state.
    *   **Frontend (`src/styles.css`):** Add CSS variables for light and dark modes, customize theme backgrounds, text colors, cards, and transitions.
    *   **Frontend (`src/app/main-layout/main-layout.component.ts` & `.html`):** Integrate toggle button in navbar using theme state.
*   **Verification:**
    *   Run local build check.
    *   Test theme toggling and persistence.

## Current Task: Receptionist Dashboard Modal Fixes & Background Polling (June 2026)

*   **Objective:**
    1. Fix the bug where patient form fields remain disabled when attempting to register a new patient after previously searching for an existing patient.
    2. Ensure new patients and updates display immediately in the grids without manual refresh.
    3. Keep all active dashboards in sync in the background without manual reloads.

*   **Proposed Changes:**
    *   **Frontend (`src/app/receptionist-dashboard/receptionist-dashboard.component.ts` & `.html`):**
        *   Implement `AfterViewInit` and `OnDestroy` lifecycles to register event listeners on the `hidden.bs.modal` events, automatically resetting and enabling the patient form when modals are closed.
        *   Refactor modal toggle code to use programmatic `bootstrap.Modal.getInstance` instantiation instead of template data attributes.
        *   Make `onAddPatient()` and `onUpdatePatient()` asynchronous, using `await` to delay modal close until list reloads are complete.
    *   **Frontend (`src/app/patient/patient.service.ts`, `src/app/pharmacy/pharmacy.service.ts`, `src/app/clinics/clinic.service.ts`, `src/app/user/user.service.ts`):**
        *   Implement background polling (auto-refresh) every 15s for patients, 20s for medicines, and 30s for clinics and staff.
        *   Perform requests silently (bypassing `isLoading` state flags) and only when a user is authenticated.
        *   Compare incoming list data with the current signal value using JSON string comparison to prevent redundant UI layout updates.

*   **Verification:**
    *   Verified clean production compilation via `npm run build`.
    *   Successfully deployed to AWS S3 via `npm run deploy:aws`.
    *   Inspected direct API output and successfully validated user authentication state.

## Current Task: AI Suggestion Clearing & Laboratory Sync (June 2026)

*   **Objective:**
    1. Clear the AI Assistant suggestions in the doctor's workspace when switching between patients.
    2. Sync the Doctor's Laboratory Requests with the Lab/Investigation Dashboard across different devices.

*   **Proposed Changes:**
    *   **Frontend (`src/app/doctor-dashboard/doctor-dashboard.component.ts` & `.html`):**
        *   Added synchronous state clearing (`selectedPatient` to null, `aiSuggestion` to null, forms and lists reset) at the start of `openConsultationModal()` to avoid any stale UI flash while fetching history.
        *   Added a `closeConsultation()` helper that resets all state fields when the modal is cancelled/closed, and bound it to modal close and cancel button click handlers in the template.
    *   **Backend (`WebApi/Controllers/InvestigationRequestController.cs`):**
        *   Added a new `[HttpGet]` endpoint mapping `_investigationService.GetAll()` to allow retrieving all investigation requests from the SQL database.
    *   **Frontend (`src/app/patient/patient.service.ts`):**
        *   Refactored `loadPatients()` to fetch all patient records and active investigations in parallel via `Promise.all`.
        *   Mapped and grouped active investigations by `patientId` to populate `patient.investigations` reactively. This ensures that any device viewing the list (including the Lab Technician) immediately displays requested labs.

*   **Verification & Deployment:**
    *   Compiled the backend with `dotnet build` (0 errors).
    *   Packaged the backend in Linux-compatible format (`tar -a -c -f hms-api-v11.zip -C publish .`).
    *   Successfully uploaded to S3 and deployed version `v11` to Elastic Beanstalk (health is Green/Ready).
    *   Compiled and successfully deployed the frontend production bundle to AWS S3 via `npm run deploy:aws`.

## Current Task: Doctor Queue Clearance on Consultation Submit (June 2026)

*   **Objective:**
    *   Ensure that when a doctor diagnoses a patient with ready lab/scan results and submits the consultation, the patient is removed from the Doctor's Workspace queue instead of remaining in `completed` status with `New Result` badge.

*   **Proposed Changes:**
    *   **Backend (`WebApi/Controllers/InvestigationRequestController.cs`):**
        *   Added a new `[HttpPost("UpdateStatus")]` endpoint mapping `_investigationService.UpdateStatus(id, status)` to support changing investigation status from the client.
    *   **Frontend (`src/app/patient/patient.service.ts`):**
        *   Refactored `addConsultation()` to identify all `"Results Ready"` investigations requested for the patient.
        *   Updated these investigations to `"Completed"` status inside the local patient signal, `localStorage`, and called the new `/InvestigationRequest/UpdateStatus` backend endpoint.
        *   Since active investigations are marked `"Completed"`, `hasNewResults(patient)` evaluates to false, and the patient is automatically filtered out of the active doctor's queue.

*   **Verification & Deployment:**
    *   Compiled the backend with `dotnet build` (0 errors).
    *   Packaged the backend as `hms-api-v12.zip` and deployed to Elastic Beanstalk (version `v12`, health is Green/Ready).
    *   Compiled and deployed the updated frontend bundle to AWS S3 website bucket.

## Current Task: Pharmacy Queue Refresh Fix (June 2026)

*   **Objective:**
    *   Ensure that when the pharmacist clicks "Dispense medication" for a patient and refreshes the page, the patient does not reappear in the "Pending Prescriptions" queue.
*   **Proposed Changes:**
    *   **Frontend (`src/app/patient/patient.service.ts`):**
        *   In `dispenseMedication(patientId)`, clear the patient ID from `hms_completed_patients` and `hms_ready_patients` in `localStorage` to resolve status conflicts.
        *   In `loadPatients()`, refine the status mapping logic to prevent resetting the patient status to `'In-progress'` if it is already `'dispensed'`. Only update to `'In-progress'` if there are pending investigations (`Requested` or `In Progress`) and the current state is `Pending` or `Ready`.
*   **Verification:**
    *   Compile the frontend locally and sync with S3 using `npm run deploy:aws`.
    *   Test dispensing medication and reloading the page on the pharmacy dashboard.

## Current Task: Streamlit AI Models Integration (June 2026)

*   **Objective:**
    *   Integrate the 6 predictive AI models from `E:\HMS\Ai` directly into the Doctor Dashboard using an interactive modal iframe with query parameter routing.
*   **Proposed Changes:**
    *   **Python AI (`E:\HMS\Ai\main_app.py`):**
        *   Read `st.query_params` to automatically select and focus on the corresponding model requested by the doctor.
    *   **Frontend (`src/app/doctor-dashboard/doctor-dashboard.component.ts` & `.html` & `.css`):**
        *   Add configuration for `aiHubUrl` in environment files.
        *   Add selection controls in the doctor workspace to select a model (Diabetes, Obesity, Heart, Kidney, Liver, Hypertension).
        *   Open a beautiful modal with an iframe pointing to Streamlit, pre-routed to the selected model using query parameters.
        *   Inject `DomSanitizer` to handle safe resource URL binding for the iframe.

