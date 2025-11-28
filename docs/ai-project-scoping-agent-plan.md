# AI Project Scoping Agent: Implementation Plan

## 1. Feature Overview

The AI Project Scoping Agent will be a premium feature for enterprise users. It allows a user to upload a Product Requirements Document (PRD) or a technical specification. The system will then use Google's Vertex AI Agent Builder to analyze the document and generate a structured project plan, including a breakdown of tasks suitable for creation as bounties on the Roxonn platform.

## 2. User Flow

1.  **Access:** A user with an enterprise subscription navigates to the "AI Scoping Agent" page in the Roxonn web app.
2.  **Upload:** The user is presented with an interface to upload a document (e.g., `.txt`, `.md`, `.pdf`, `.docx`).
3.  **Processing:** The user clicks "Generate Plan". The frontend uploads the file to the Roxonn backend.
4.  **AI Analysis:** The backend sends the document to a purpose-built agent in Google's Vertex AI Agent Builder. The agent is guided by a sophisticated system prompt to analyze the document and generate a structured JSON output containing a project plan, task list, and descriptions.
5.  **Display Results:** The backend receives the structured response from the AI. The frontend then polls for the result and, once ready, displays the generated plan in a clean, user-friendly format.
6.  **Action (Future):** The user can review the plan and, with one click, automatically create the suggested tasks as draft bounties in their project on the Roxonn platform.

## 3. Technical Implementation

### 3.1. Frontend (React)

-   **New Page:** Create a new page component at `client/src/pages/ai-scoping-agent-page.tsx`.
-   **New Route:** Add a route in `client/src/App.tsx` for `/ai-scoping-agent`.
-   **UI Components:**
    -   `FileUpload.tsx`: A component for dragging and dropping or selecting a file.
    -   `PlanDisplay.tsx`: A component to render the structured JSON plan returned from the AI. This should include sections for the project summary, and a list of tasks with titles, descriptions, and estimated complexity.
    -   `StatusIndicator.tsx`: A component to show the processing status (e.g., "Uploading...", "Analyzing Document...", "Generating Plan...").
-   **API Interaction:**
    -   Create a new hook `useAiScopingAgent.ts` to handle the API calls for uploading the document and fetching the results.
    -   This will involve a POST request to a new backend endpoint and then polling another endpoint for the result.

### 3.2. Backend (Express)

-   **New Route:** Add a new route file `server/routes/aiScopingAgent.ts` and mount it in `server/index.ts`.
-   **New API Endpoints:**
    -   `POST /api/ai-scoping/upload`:
        -   Handles multipart/form-data file uploads.
        -   Temporarily stores the uploaded file.
        -   Initiates the asynchronous analysis process.
        -   Returns a `jobId` to the client for polling.
    -   `GET /api/ai-scoping/results/:jobId`:
        -   The client polls this endpoint.
        -   It checks the status of the analysis job.
        -   Returns the final plan as JSON when complete.
-   **New Service:** Create `server/services/aiScopingService.ts`.
    -   This service will contain the core logic for interacting with the Google Cloud Vertex AI SDK.
    -   It will be responsible for:
        1.  Taking the path to the uploaded file.
        2.  Authenticating with Google Cloud.
        3.  Calling the Vertex AI Agent Builder with the document as context.
        4.  Using a carefully crafted system prompt to instruct the model to act as an expert project manager and output a structured JSON plan.
        5.  Storing the result associated with the `jobId`.

### 3.3. Google Cloud Vertex AI Agent Builder

-   **Setup:**
    1.  Create a new project in the Google Cloud Console and enable the "Vertex AI" API.
    2.  Use the available credits for this project.
    3.  Create a new "Chat App" or "Agent" in the Vertex AI Agent Builder.
-   **Data Handling:**
    -   The agent will not be trained on a permanent dataset. Instead, for each request, the user's uploaded document will be passed *in the prompt* as the context for the conversation. This ensures data privacy and that the analysis is specific to the user's document.
-   **Prompt Engineering (Critical Path):**
    -   We will need to develop a detailed **system prompt**. This prompt will be the key to getting high-quality, structured output.
    -   Example prompt elements:
        -   "You are an expert software project manager. Your task is to analyze the following document and break it down into a comprehensive project plan."
        -   "The output MUST be a valid JSON object with the following structure: `{ \"projectName\": string, \"summary\": string, \"tasks\": [{ \"id\": number, \"title\": string, \"description\": string, \"dependencies\": number[], \"estimatedComplexity\": 'low'|'medium'|'high' }] }`."
        -   "For each task, provide a clear title and a detailed description suitable for a developer to begin work. Identify any dependencies between tasks."

### 3.4. Data Model & Monetization

-   **Database:** For the initial version, we can store the job status and results in a simple in-memory store (like a Map) on the backend to avoid database changes. For a more robust solution, we would add a new table `ai_scoping_jobs` to the PostgreSQL database.
-   **Access Control:** The new API endpoints will be protected by middleware that checks if the authenticated user has an active enterprise subscription.

## 4. Next Steps

1.  **Setup Google Cloud Project:** Create the project, enable APIs, and set up authentication (e.g., a service account key).
2.  **Develop Backend Service:** Implement the `aiScopingService.ts` and the API endpoints. Start with a mock of the Google AI response to allow for parallel frontend development.
3.  **Develop Frontend UI:** Build the new page and components.
4.  **Prompt Engineering & Integration:** Refine the system prompt and integrate the backend service with the actual Vertex AI API.
5.  **Testing & Refinement:** Thoroughly test the end-to-end flow with various documents.
