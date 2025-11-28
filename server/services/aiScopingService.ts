import fs from 'fs/promises';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { config } from '../config'; // Assuming config will hold GCP details

// Initialize the Vertex AI Prediction Service Client
const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};
const predictionServiceClient = new PredictionServiceClient(clientOptions);

/**
 * Processes the uploaded document using Google Cloud Vertex AI's Gemini model.
 *
 * @param filePath The path to the uploaded document.
 * @returns A structured project plan.
 */
export async function processDocument(filePath: string): Promise<any> {
  console.log(`[AI Scoping Service] Starting REAL processing for file: ${filePath}`);

  try {
    const documentContent = await fs.readFile(filePath, 'utf-8');

    // These would be loaded from config, which gets them from .env
    const project = config.gcpProjectId || 'your-gcp-project-id'; // Placeholder
    const location = config.gcpLocation || 'us-central1'; // Placeholder
    const publisher = 'google';
    const model = 'gemini-1.5-flash-001';

    // The model path for the generateContent method
    const modelPath = `projects/${project}/locations/${location}/publishers/${publisher}/models/${model}`;

    const systemPrompt = `You are an expert software project manager. Your task is to analyze the following document and break it down into a comprehensive project plan. The output MUST be a valid JSON object with the following structure: { "projectName": string, "summary": string, "tasks": [{ "id": number, "title": string, "description": string, "dependencies": number[], "estimatedComplexity": "low"|"medium"|"high" }] }. For each task, provide a clear title and a detailed description suitable for a developer to begin work. Identify any dependencies between tasks.`;

    const fullPrompt = `${systemPrompt}\n\n--- DOCUMENT START ---\n\n${documentContent}\n\n--- DOCUMENT END ---`;

    const request = {
      model: modelPath,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };

    console.log(`[AI Scoping Service] Sending request to Vertex AI with model: ${modelPath}`);
    
    // Use the generateContent method
    const [response] = await predictionServiceClient.generateContent(request);
    
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Received no candidates from Vertex AI.');
    }

    const candidate = response.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Could not extract content parts from Vertex AI response.');
    }

    const rawJsonText = candidate.content.parts[0].text
      ?.replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    if (!rawJsonText) {
        throw new Error('Extracted text from AI response is empty.');
    }

    console.log('[AI Scoping Service] Received raw JSON text from AI:', rawJsonText);
    
    // Parse the cleaned text to get the final JSON object
    const plan = JSON.parse(rawJsonText);

    console.log(`[AI Scoping Service] Plan generated successfully for file: ${filePath}`);
    return plan;

  } catch (error) {
    console.error('[AI Scoping Service] Error interacting with Vertex AI:', error);
    throw new Error('Failed to generate project plan from document.');
  } finally {
    // Clean up the uploaded file after processing
    await fs.unlink(filePath);
    console.log(`[AI Scoping Service] Cleaned up temporary file: ${filePath}`);
  }
}
