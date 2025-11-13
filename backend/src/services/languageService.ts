// Serviço de internacionalização e detecção de idioma
export interface Language {
  code: 'pt' | 'en';
  name: string;
  nativeName: string;
}

export interface Translation {
  pt: string;
  en: string;
}

export interface DiagnosisExplanation {
  reasoning: string;
  confidence: number;
  keySymptoms: string[];
  differentialDiagnoses: string[];
  recommendationBasis: string;
}

export class LanguageService {
  // Idiomas suportados
  static readonly LANGUAGES: Record<string, Language> = {
    pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    en: { code: 'en', name: 'English', nativeName: 'English' }
  };

  // Traduções da interface
  static readonly UI_TRANSLATIONS: Record<string, Translation> = {
    // Títulos
    title: {
      pt: 'MedNote.IA - Assistente Médico Inteligente',
      en: 'MedNote.AI - Intelligent Medical Assistant'
    },
    subtitle: {
      pt: 'Transcreva consultas e obtenha diagnósticos assistidos por IA',
      en: 'Transcribe consultations and get AI-assisted diagnoses'
    },

    // Botões e ações
    startRecording: {
      pt: 'Iniciar Gravação',
      en: 'Start Recording'
    },
    stopRecording: {
      pt: 'Parar Gravação',
      en: 'Stop Recording'
    },
    processing: {
      pt: 'Processando...',
      en: 'Processing...'
    },
    transcribing: {
      pt: 'Transcrevendo áudio...',
      en: 'Transcribing audio...'
    },
    analyzing: {
      pt: 'Analisando sintomas...',
      en: 'Analyzing symptoms...'
    },

    // Seções
    transcription: {
      pt: 'Transcrição',
      en: 'Transcription'
    },
    diagnosis: {
      pt: 'Diagnóstico',
      en: 'Diagnosis'
    },
    explanation: {
      pt: 'Explicação do Diagnóstico',
      en: 'Diagnosis Explanation'
    },
    reasoning: {
      pt: 'Raciocínio Clínico',
      en: 'Clinical Reasoning'
    },
    confidence: {
      pt: 'Nível de Confiança',
      en: 'Confidence Level'
    },
    keySymptoms: {
      pt: 'Sintomas Principais',
      en: 'Key Symptoms'
    },
    differentialDiagnoses: {
      pt: 'Diagnósticos Diferenciais',
      en: 'Differential Diagnoses'
    },
    recommendations: {
      pt: 'Recomendações',
      en: 'Recommendations'
    },
    diseases: {
      pt: 'Possíveis Condições',
      en: 'Possible Conditions'
    },
    exams: {
      pt: 'Exames Sugeridos',
      en: 'Suggested Tests'
    },
    medications: {
      pt: 'Medicações',
      en: 'Medications'
    },

    // Chat
    chatTitle: {
      pt: 'Chat com IA - Tire suas dúvidas',
      en: 'AI Chat - Ask your questions'
    },
    chatPlaceholder: {
      pt: 'Digite sua pergunta sobre o diagnóstico...',
      en: 'Type your question about the diagnosis...'
    },
    send: {
      pt: 'Enviar',
      en: 'Send'
    },

    // Histórico
    history: {
      pt: 'Histórico',
      en: 'History'
    },
    consultations: {
      pt: 'Consultas',
      en: 'Consultations'
    },
    today: {
      pt: 'Hoje',
      en: 'Today'
    },
    thisWeek: {
      pt: 'Esta Semana',
      en: 'This Week'
    },
    total: {
      pt: 'Total',
      en: 'Total'
    },

    // Mensagens
    noAudioDetected: {
      pt: 'Nenhum áudio detectado. Tente novamente.',
      en: 'No audio detected. Please try again.'
    },
    audioTooShort: {
      pt: 'Áudio muito curto para análise.',
      en: 'Audio too short for analysis.'
    },
    processingError: {
      pt: 'Erro ao processar. Tente novamente.',
      en: 'Processing error. Please try again.'
    },
    successful: {
      pt: 'Processamento concluído com sucesso!',
      en: 'Processing completed successfully!'
    }
  };

  /**
   * Detecta o idioma do texto usando padrões básicos
   */
  static detectLanguage(text: string): 'pt' | 'en' {
    if (!text || text.trim().length === 0) {
      return 'pt'; // Padrão português
    }

    const lowerText = text.toLowerCase();

    // Palavras comuns em português
    const portugueseWords = [
      'dor', 'febre', 'tosse', 'dores', 'sinto', 'estou', 'tenho', 'doutor', 'médico',
      'sintomas', 'medicamento', 'exame', 'hospital', 'consulta', 'paciente', 'tratamento',
      'saúde', 'doença', 'remédio', 'problema', 'mal', 'bem', 'melhor', 'pior', 'muito',
      'pouco', 'quando', 'onde', 'como', 'porque', 'será', 'pode', 'deve', 'precisa'
    ];

    // Palavras comuns em inglês
    const englishWords = [
      'pain', 'fever', 'cough', 'feel', 'feeling', 'have', 'doctor', 'medical',
      'symptoms', 'medication', 'test', 'hospital', 'appointment', 'patient', 'treatment',
      'health', 'disease', 'medicine', 'problem', 'bad', 'good', 'better', 'worse', 'much',
      'little', 'when', 'where', 'how', 'because', 'will', 'can', 'should', 'need'
    ];

    let ptScore = 0;
    let enScore = 0;

    // Contabiliza palavras encontradas
    portugueseWords.forEach(word => {
      if (lowerText.includes(word)) ptScore++;
    });

    englishWords.forEach(word => {
      if (lowerText.includes(word)) enScore++;
    });

    // Padrões específicos
    if (lowerText.match(/\b(the|and|is|are|was|were|have|has|will|would|could|should)\b/g)) {
      enScore += 2;
    }

    if (lowerText.match(/\b(que|para|com|por|mas|são|está|estão|tem|vai|seria|pode|deve)\b/g)) {
      ptScore += 2;
    }

    return enScore > ptScore ? 'en' : 'pt';
  }

  /**
   * Obtém tradução para o idioma especificado
   */
  static translate(key: string, language: 'pt' | 'en'): string {
    const translation = this.UI_TRANSLATIONS[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translation[language] || translation.pt;
  }

  /**
   * Obtém todas as traduções para um idioma
   */
  static getAllTranslations(language: 'pt' | 'en'): Record<string, string> {
    const translations: Record<string, string> = {};
    Object.keys(this.UI_TRANSLATIONS).forEach(key => {
      translations[key] = this.translate(key, language);
    });
    return translations;
  }

  /**
   * Formata prompt do OpenAI baseado no idioma
   */
  static getPromptForLanguage(language: 'pt' | 'en'): {
    diagnosisPrompt: string;
    explanationPrompt: string;
    chatPrompt: string;
  } {
    if (language === 'en') {
      return {
        diagnosisPrompt: `You are an experienced medical AI assistant. Analyze the following transcription of a medical consultation and provide a comprehensive diagnosis in English.

Please respond ONLY in valid JSON format with the following structure:
{
  "diagnosis": "Primary diagnosis and clinical assessment",
  "diseases": ["Possible condition 1", "Possible condition 2", "Possible condition 3"],
  "exams": ["Suggested test 1", "Suggested test 2", "Suggested test 3"],
  "medications": ["Medication/treatment 1", "Medication/treatment 2"],
  "explanation": {
    "reasoning": "Detailed clinical reasoning for the diagnosis",
    "confidence": 0.85,
    "keySymptoms": ["Main symptom 1", "Main symptom 2"],
    "differentialDiagnoses": ["Alternative diagnosis 1", "Alternative diagnosis 2"],
    "recommendationBasis": "Basis for treatment recommendations"
  }
}

Important guidelines:
- Base analysis on reported symptoms
- Consider common conditions first
- Suggest appropriate tests for differential diagnosis
- Confidence should be between 0.1 and 1.0
- Always recommend seeking professional medical evaluation
- Response must be in English`,

        explanationPrompt: "Provide detailed medical reasoning in English for the diagnosis",
        
        chatPrompt: "You are a helpful medical AI assistant. Answer questions about the diagnosis in English, always recommending professional medical consultation."
      };
    }

    return {
      diagnosisPrompt: `Você é um assistente médico de IA experiente. Analise a seguinte transcrição de uma consulta médica e forneça um diagnóstico abrangente em português.

Responda APENAS em formato JSON válido com a seguinte estrutura:
{
  "diagnosis": "Diagnóstico principal e avaliação clínica",
  "diseases": ["Possível condição 1", "Possível condição 2", "Possível condição 3"],
  "exams": ["Exame sugerido 1", "Exame sugerido 2", "Exame sugerido 3"],
  "medications": ["Medicação/tratamento 1", "Medicação/tratamento 2"],
  "explanation": {
    "reasoning": "Raciocínio clínico detalhado para o diagnóstico",
    "confidence": 0.85,
    "keySymptoms": ["Sintoma principal 1", "Sintoma principal 2"],
    "differentialDiagnoses": ["Diagnóstico alternativo 1", "Diagnóstico alternativo 2"],
    "recommendationBasis": "Base para as recomendações de tratamento"
  }
}

Diretrizes importantes:
- Base a análise nos sintomas relatados
- Considere condições comuns primeiro
- Sugira exames apropriados para diagnóstico diferencial
- Confiança deve estar entre 0.1 e 1.0
- Sempre recomende buscar avaliação médica profissional
- Resposta deve estar em português`,

      explanationPrompt: "Forneça raciocínio médico detalhado em português para o diagnóstico",
      
      chatPrompt: "Você é um assistente médico de IA útil. Responda perguntas sobre o diagnóstico em português, sempre recomendando consulta médica profissional."
    };
  }
}

export default LanguageService;