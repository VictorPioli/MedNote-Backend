// Types exports
export interface TranscribeResponse {
  transcript: string;
  success: boolean;
  message?: string;
  language?: 'pt' | 'en';
}

export interface DiagnoseRequest {
  transcript: string;
}

// Tipo para explicações de diagnóstico
export interface DiagnosisExplanation {
  reasoning: string;
  confidence: number;
  keySymptoms: string[];
  differentialDiagnoses: string[];
  recommendationBasis: string;
}

export interface DiagnoseResponse {
  diagnosis: string;
  diseases: string[];
  exams: string[];
  medications: string[];
  explanation: DiagnosisExplanation;
  language: 'pt' | 'en';
  success: boolean;
  message?: string;
}

// Tipos para chat contextual
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  context: {
    transcript: string;
    diagnosis: string;
    diseases: string[];
    exams: string[];
    medications: string[];
    language?: 'pt' | 'en';
  };
  chatHistory: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

// Tipos para resposta da OpenAI
export interface OpenAIResponse {
  diagnosis: string;
  diseases: string[];
  exams: string[];
  medications: string[];
  explanation?: DiagnosisExplanation;
}

// Tipos para erros
export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// Configurações da aplicação
export interface AppConfig {
  port: number;
  nodeEnv: string;
  openaiApiKey: string;
  corsOrigin: string;
}