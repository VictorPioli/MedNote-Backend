import dotenv from 'dotenv';
import { AppConfig } from './types';

// Carrega variáveis de ambiente
dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

// Validação de variáveis obrigatórias
export const validateConfig = (): void => {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY é obrigatória');
  }
  
  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT deve estar entre 1 e 65535');
  }
};