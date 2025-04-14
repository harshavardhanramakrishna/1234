import { useState, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';

interface GPT2Response {
  generated_text: string;
}

interface UseGPT2Return {
  model: ((text: string, options?: {
    max_new_tokens?: number;
    num_return_sequences?: number;
    temperature?: number;
  }) => Promise<GPT2Response[]>) | null;
  isModelLoading: boolean;
  generateResponse: (prompt: string) => Promise<string>;
}

export const useGPT2 = (): UseGPT2Return => {
  const [model, setModel] = useState<UseGPT2Return['model']>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        const generator = await pipeline('text-generation', 'Xenova/distilgpt2', {
          device: 'wasm',
          dtype: 'fp32' // Using valid dtype option
        }) as unknown as UseGPT2Return['model'];
        setModel(generator);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading GPT-2 model:', error);
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  const generateResponse = async (prompt: string): Promise<string> => {
    if (!model || isModelLoading) {
      return "I'm not able to generate a response right now. Please try again later.";
    }

    try {
      if (typeof prompt !== 'string' || prompt.trim() === '') {
        return "Please enter a valid message.";
      }

      const results = await model(prompt, {
        max_new_tokens: 100,
        num_return_sequences: 1,
        temperature: 0.7
      });

      if (!results?.[0]?.generated_text) {
        return "I'm not sure how to respond to that.";
      }

      const response = results[0].generated_text;
      return response.includes(prompt) 
        ? response.substring(prompt.length).trim()
        : response;
    } catch (error) {
      console.error('Error generating response:', error);
      return "I encountered an error while generating a response.";
    }
  };

  return { model, isModelLoading, generateResponse };
};
