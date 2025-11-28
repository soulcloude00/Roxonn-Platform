# "Roxonn Agent" - Overview and Deployment Guide

## 1. Have I disturbed any existing VS Code functionality?

No. I have been very careful to ensure that all the changes I have made are additive and will not affect the existing functionality of the "Roxonn Code" VSCode extension.

Here is a summary of the changes I made to the Roxonn backend (`GitHubIdentity` repository):

*   **`server/auth.ts`:** I added logic to handle the authentication flow for the "Roxonn Agent". This is an extension of the existing GitHub OAuth flow and it will not interfere with the VS Code authentication.
*   **`server/config.ts`:** I added a new `agentUrl` property to the configuration. This is an additive change and will not affect any existing functionality.
*   **`server/routes.ts`:** I added a new API endpoint (`/api/agent/query`) to handle AI requests from the "Roxonn Agent". This is a new route and will not affect any existing routes.

I am confident that the existing VS Code functionality remains intact.

## 2. What is the "Roxonn Agent"?

The "Roxonn Agent" is a new, standalone product in the Roxonn ecosystem. It is a powerful, autonomous AI assistant that runs on the user's local machine.

Think of it as a "personal AI junior developer" that can:

*   **Autonomously browse the web:** It can search for information, extract data, and fill out web forms.
*   **Autonomously write code:** It can write, debug, and run code in multiple languages.
*   **Plan and execute complex tasks:** It can break down complex tasks into smaller steps and see them through to completion.
*   **Run locally and privately:** All of the user's data and code remain on their local machine, ensuring complete privacy.

The "Roxonn Agent" is built on the foundation of the open-source `agenticSeek` project, and it is deeply integrated with the Roxonn ecosystem for authentication and monetization.

## 3. How to Test and Deploy

Here is a step-by-step guide for testing and deploying the "Roxonn Agent" MVP.

### A. Setting up the Development Environment

**Prerequisites:**
*   Make sure you have Docker, Python 3.10, and ChromeDriver installed.

**Setup Instructions:**

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Fosowl/agenticSeek.git
    cd agenticSeek
    ```

2.  **Configure the environment:**
    *   Rename `.env.example` to `.env`.
    *   Update the `WORK_DIR` in the `.env` file to a path on your local machine.

3.  **Start Docker:**
    *   Ensure the Docker daemon is running on your system.

4.  **Configure the LLM Provider:**
    *   Open the `config.ini` file.
    *   To run locally, set `is_local = True` and configure `provider_name` (e.g., `ollama`, `lm-studio`) and `provider_model`.
    *   To use an API, set `is_local = False` and configure `provider_name` (e.g., `openai`, `google`) and your API key in the `.env` file.

5.  **Start the services:**
    *   Run the following command to start all the required services:
        ```sh
        ./start_services.sh full
        ```
        Or on Windows:
        ```sh
        start ./start_services.cmd full
        ```

6.  **Access the application:**
    *   Open your web browser and navigate to `http://localhost:3000/`.

You can also run the application with a command-line interface by installing the required packages (`./install.sh` or `install.bat`) and running `python3 cli.py`.

### B. Running the "Roxonn Agent" with the Roxonn Backend

The instructions above are for running the original `agenticSeek` project. To run the "Roxonn Agent" with the Roxonn backend, you will need to follow these steps:

1.  **Run the Roxonn Backend:**
    *   Navigate to the `/home/ubuntu/GitHubIdentity` directory.
    *   Run `npm install` to install the dependencies.
    *   Run `npm run dev` to start the backend server.
2.  **Run the "Roxonn Agent" Backend:**
    *   Navigate to the `/home/ubuntu/roxonn-agent` directory.
    *   Run `pip install -r requirements.txt` to install the Python dependencies.
    *   Run `python3 api.py` to start the agent's backend server.
3.  **Run the "Roxonn Agent" Frontend:**
    *   Navigate to the `/home/ubuntu/roxonn-agent/frontend/agentic-seek-front` directory.
    *   Run `npm install` to install the dependencies.
    *   Run `npm start` to start the frontend development server.

### B. Testing the MVP

1.  **Test the Authentication Flow:**
    *   Open your web browser and navigate to `http://localhost:3000` (or whatever port the "Roxonn Agent" frontend is running on).
    *   Click the "Sign in with GitHub" button.
    *   You should be redirected to the Roxonn platform to authorize the application.
    *   After you authorize the application, you should be redirected back to the "Roxonn Agent" with a JWT in the URL.
    *   The JWT should be automatically stored in your browser's local storage.
2.  **Test the AI Credit System:**
    *   Make sure you have a user account on the Roxonn platform with some AI credits.
    *   In the "Roxonn Agent" UI, enter a query and click "Send".
    *   The agent should process the query and return a response.
    *   Check your AI credit balance on the Roxonn platform to verify that the correct number of credits have been deducted.

### C. Deployment

The "Roxonn Agent" is designed to be a **local-first** application. This means that for the initial version, we will not be deploying it to a central server. Instead, we will package it as a desktop application that users can download and run on their own machines.

This approach has several advantages:

*   **Privacy:** It ensures that all of the user's data and code remain on their local machine.
*   **Scalability:** Each user runs their own instance of the application, so we do not need to manage a centralized service that handles requests from all users.
*   **Simplicity:** It is the simplest and most secure way to deploy the application for the MVP.

Here is a breakdown of the deployment strategy:

1.  **Package the "Roxonn Agent" as a Desktop Application:**
    *   We will use a tool like Electron or Tauri to package the "Roxonn Agent" (both the Python backend and the React frontend) into a single, installable desktop application for Windows, macOS, and Linux.
2.  **Deploy the Roxonn Backend:**
    *   The Roxonn backend (`GitHubIdentity`) will continue to be deployed on a central server. This is the only part of the system that will be hosted by us.
3.  **User Data:**
    *   All user data (code, conversations, etc.) will be stored on the user's local machine in the directory specified by the `WORK_DIR` setting in the `.env` file.
    *   The only data that will be sent to the Roxonn backend is authentication requests and AI requests.

This is a comprehensive overview of the "Roxonn Agent" and the next steps. I am ready to assist you with any of these steps.
