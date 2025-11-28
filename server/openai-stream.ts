// Special handler for streaming OpenAI response data from Azure OpenAI API
import { Response as FetchResponse } from 'node-fetch';
import { Response as ExpressResponse } from 'express';
import { Transform, Readable } from 'stream';
import { log } from './utils';

/**
 * Interface for token usage information
 */
interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Rough estimation of tokens based on text length
 * 1 token is roughly 4 characters in English
 * @param text Text to estimate tokens for
 * @returns Estimated number of tokens
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Handles streaming OpenAI API responses from Azure OpenAI
 * This function properly handles the SSE (Server-Sent Events) format
 * that OpenAI uses for streaming responses
 * @param apiResponse The response from the OpenAI API
 * @param clientResponse The Express response to send data to
 * @param userId The user's ID for logging
 * @param requestBody The original request body sent to the OpenAI API (for token estimation)
 * @returns Promise that resolves with token usage data when streaming is complete
 */
export async function handleOpenAIStream(
  apiResponse: FetchResponse, 
  clientResponse: ExpressResponse, 
  userId: number,
  requestBody?: any
): Promise<TokenUsage> {
  // Set appropriate headers for streaming
  clientResponse.setHeader('Content-Type', 'text/event-stream');
  clientResponse.setHeader('Cache-Control', 'no-cache');
  clientResponse.setHeader('Connection', 'keep-alive');

  if (!apiResponse.body) {
    throw new Error('Response body is null or undefined');
  }
  
  // Variables to store token usage data
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  
  // Track prompt for token estimation fallback
  let estimatedPromptTokens = 0;
  try {
    // Extract messages from the request body to estimate input tokens
    if (requestBody && requestBody.messages && Array.isArray(requestBody.messages)) {
      // Estimate tokens from messages
      const messagesText = requestBody.messages.map((m: any) => m.content || '').join(' ');
      estimatedPromptTokens = estimateTokens(messagesText);
      log(`Estimated prompt tokens: ${estimatedPromptTokens}`, 'vscode-ai');
    }
  } catch (e) {
    log(`Error estimating prompt tokens: ${e}`, 'vscode-ai');
  }
  
  // To store all completion content for estimation if needed
  let allCompletionContent = '';
  
  try {
    log(`Starting to stream OpenAI response to user ${userId}`, 'vscode-ai');
    
    // Create a transform stream to collect usage data from chunks
    const usageCollector = new Transform({
      transform(chunk: Buffer, encoding: string, callback) {
        // Forward the chunk as-is to the output
        this.push(chunk);
        
        // Also check for usage data in the chunk
        const text = chunk.toString('utf-8');
        
        // Parse SSE data to collect completion content for estimation
        try {
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataContent = line.substring(5).trim();
              if (dataContent && dataContent !== '[DONE]') {
                try {
                  const parsedData = JSON.parse(dataContent);
                  if (parsedData.choices && parsedData.choices[0] && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                    // Collect the content for token estimation
                    allCompletionContent += parsedData.choices[0].delta.content;
                  }
                  
                  // Check for usage info in the response
                  if (parsedData.usage) {
                    promptTokens = parsedData.usage.prompt_tokens;
                    completionTokens = parsedData.usage.completion_tokens;
                    log(`Found direct token usage in stream: ${promptTokens} prompt, ${completionTokens} completion`, 'vscode-ai');
                  }
                } catch (e) {
                  // Ignore parsing errors for individual chunks
                }
              }
            }
          }
        } catch (chunkError) {
          // Continue even if we can't parse a chunk
        }
        
        // Also try the previous regex approach for compatibility
        if (text.includes('"usage"') && text.includes('"prompt_tokens"') && text.includes('"completion_tokens"')) {
          try {
            // Try to extract the usage data using regex
            const usageMatch = text.match(/"usage"\s*:\s*\{([^}]+)\}/i);
            if (usageMatch && usageMatch[1]) {
              // Parse the individual token counts
              const promptMatch = usageMatch[1].match(/"prompt_tokens"\s*:\s*(\d+)/i);
              const completionMatch = usageMatch[1].match(/"completion_tokens"\s*:\s*(\d+)/i);
              
              if (promptMatch && promptMatch[1]) {
                promptTokens = parseInt(promptMatch[1], 10);
              }
              
              if (completionMatch && completionMatch[1]) {
                completionTokens = parseInt(completionMatch[1], 10);
              }
              
              if (promptTokens && completionTokens) {
                log(`Extracted token usage from stream: ${promptTokens} prompt, ${completionTokens} completion`, 'vscode-ai');
              }
            }
          } catch (parseError) {
            log(`Error parsing usage data from stream: ${parseError}`, 'vscode-ai');
          }
        }
        
        callback();
      }
    });
    
    // Pipe the response through our collector and to the client
    if (apiResponse.body instanceof Readable) {
      apiResponse.body.pipe(usageCollector).pipe(clientResponse);
    } else {
      throw new Error('API response body is not a Readable stream');
    }
    
    // Return a promise that resolves when streaming completes
    return new Promise<TokenUsage>((resolve, reject) => {
      apiResponse.body.on('end', () => {
        log(`Finished streaming OpenAI response to user ${userId}`, 'vscode-ai');
        
        // If we don't have direct usage data, estimate based on collected content
        if (!promptTokens || !completionTokens) {
          const estimatedCompletionTokens = estimateTokens(allCompletionContent);
          log(`No direct token data available, using estimates: ${estimatedPromptTokens} prompt, ${estimatedCompletionTokens} completion`, 'vscode-ai');
          
          // Use either the direct values if available, or our estimates
          promptTokens = promptTokens || estimatedPromptTokens;
          completionTokens = completionTokens || estimatedCompletionTokens;
          
          // Provide a minimum token value for accounting purposes if our estimates are too low
          promptTokens = Math.max(promptTokens, 10);
          completionTokens = Math.max(completionTokens, 10);
        }
        
        resolve({ promptTokens, completionTokens });
      });
      
      apiResponse.body.on('error', (error: Error) => {
        log(`Error in OpenAI response stream: ${error.message || error}`, 'vscode-ai');
        if (!clientResponse.writableEnded) {
          clientResponse.status(500).json({ error: 'Streaming error', message: error.message || 'Unknown error' });
        }
        
        // Use estimated tokens if available
        if (!promptTokens) promptTokens = Math.max(estimatedPromptTokens, 10);
        if (!completionTokens) completionTokens = Math.max(estimateTokens(allCompletionContent), 10);
        
        resolve({ promptTokens, completionTokens });
      });
      
      clientResponse.on('close', () => {
        log(`Client disconnected during streaming for user ${userId}`, 'vscode-ai');
        
        // Use estimated tokens if available
        if (!promptTokens) promptTokens = Math.max(estimatedPromptTokens, 10);
        if (!completionTokens) completionTokens = Math.max(estimateTokens(allCompletionContent), 10);
        
        resolve({ promptTokens, completionTokens });
      });
    });
  } catch (error: any) {
    log(`Error setting up OpenAI response stream: ${error.message || error}`, 'vscode-ai');
    if (!clientResponse.writableEnded) {
      clientResponse.status(500).json({ error: 'Streaming error', message: error.message || 'Unknown error' });
    }
    
    // Use estimated tokens if available, or set minimum values for accounting
    if (!promptTokens) promptTokens = Math.max(estimatedPromptTokens, 10);
    if (!completionTokens) completionTokens = Math.max(estimateTokens(allCompletionContent), 10);
    
    return { promptTokens, completionTokens };
  }
}
