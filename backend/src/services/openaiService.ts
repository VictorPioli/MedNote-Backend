import OpenAI from 'openai';
import { OpenAIResponse } from '../types';
import LanguageService, { DiagnosisExplanation } from './languageService';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Transcreve áudio usando o modelo Whisper da OpenAI
   * @param audioBuffer Buffer do arquivo de áudio
   * @param filename Nome do arquivo original
   * @returns Texto transcrito
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.webm'): Promise<string> {
    try {
      console.log('Iniciando transcrição:', { filename, size: audioBuffer.length });
      
      // Usar fs para criar um arquivo temporário
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `temp_${Date.now()}_${filename}`);
      
      // Escrever buffer para arquivo temporário
      fs.writeFileSync(tempFile, audioBuffer);
      
      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: 'whisper-1',
          response_format: 'text'
        }, {
          timeout: 60000 // 60 segundos para áudio
        });

        console.log('Transcrição realizada com sucesso');
        return transcription || '';
      } finally {
        // Limpar arquivo temporário
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn('Falha ao remover arquivo temporário:', e);
        }
      }
    } catch (error) {
      console.error('Erro na transcrição:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate_limit') || error.message.includes('429')) {
          throw new Error('Limite de transcrições atingido. Tente novamente em alguns minutos.');
        }
        if (error.message.includes('quota') || error.message.includes('billing')) {
          throw new Error('Cota da OpenAI excedida. Verifique seu plano e billing.');
        }
        if (error.message.includes('file')) {
          throw new Error('Formato de áudio não suportado. Use WAV, MP3, M4A ou WebM.');
        }
      }
      
      throw new Error('Falha ao transcrever áudio');
    }
  }

  /**
   * Determina o tipo MIME baseado no filename
   */
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || 'webm';
    const mimeTypes: { [key: string]: string } = {
      'wav': 'audio/wav',
      'mp3': 'audio/mp3',
      'mp4': 'audio/mp4',
      'm4a': 'audio/mp4',
      'webm': 'audio/webm'
    };
    return mimeTypes[extension] || 'audio/webm';
  }

  /**
   * Chat contextual multilíngue baseado no diagnóstico
   */
  async chatWithContext(
    userMessage: string,
    context: {
      transcript: string;
      diagnosis: string;
      diseases: string[];
      exams: string[];
      medications: string[];
      language?: 'pt' | 'en';
    },
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
  ): Promise<string> {
    try {
      // 🌍 DETECTAR IDIOMA DA MENSAGEM OU USAR CONTEXTO
      const messageLanguage = context.language || LanguageService.detectLanguage(userMessage);
      const prompts = LanguageService.getPromptForLanguage(messageLanguage);

      const systemPrompt = `${prompts.chatPrompt}

CONTEXTO DA CONSULTA:
- Transcrição: ${context.transcript}
- Diagnóstico: ${context.diagnosis}
- Doenças identificadas: ${context.diseases.join(', ')}
- Exames recomendados: ${context.exams.join(', ')}
- Medicações sugeridas: ${context.medications.join(', ')}

INSTRUÇÕES IMPORTANTES:
1. Responda sempre de forma empática e educativa
2. Use linguagem clara e acessível no idioma ${messageLanguage === 'en' ? 'inglês' : 'português'}
3. Baseie suas respostas no contexto da consulta
4. Esclareça dúvidas sobre o diagnóstico, exames ou medicações
5. Sempre reforce a importância do acompanhamento médico
6. Não forneça novos diagnósticos - apenas esclareça o que já foi discutido
7. Se perguntado sobre algo fora do contexto médico, redirecione para o tema da consulta

Esta conversa é complementar à consulta. Sempre incentive o paciente a seguir as orientações médicas e buscar acompanhamento presencial quando necessário.`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...chatHistory,
        { role: 'user' as const, content: userMessage }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.3
      });

      const response = completion.choices[0]?.message?.content?.trim();
      if (!response) {
        throw new Error('Resposta vazia da OpenAI');
      }

      return response;
    } catch (error) {
      console.error('Erro no chat contextual:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate_limit') || error.message.includes('429')) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        }
        if (error.message.includes('quota') || error.message.includes('billing')) {
          throw new Error('Cota da OpenAI excedida. Verifique seu plano e billing.');
        }
      }
      
      throw new Error('Falha ao processar mensagem do chat');
    }
  }

  /**
   * Gera diagnóstico médico com explicações baseado no transcript
   * @param transcript Texto da consulta médica
   * @returns Objeto com diagnóstico, sugestões e explicações
   */
  async generateDiagnosis(transcript: string): Promise<OpenAIResponse & { explanation: DiagnosisExplanation; language: 'pt' | 'en' }> {
    try {
      // 🌍 DETECTAR IDIOMA AUTOMATICAMENTE
      const detectedLanguage = LanguageService.detectLanguage(transcript);
      console.log(`🌍 Idioma detectado: ${detectedLanguage}`);

      // 🧠 OBTER PROMPT MULTILÍNGUE
      const prompts = LanguageService.getPromptForLanguage(detectedLanguage);

      const prompt = `${prompts.diagnosisPrompt}

TRANSCRIÇÃO: "${transcript}"`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Usando GPT-4 para análises mais precisas
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" } // Força resposta em JSON
      }, {
        timeout: 45000 // 45 segundos para GPT-4
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('Resposta vazia da OpenAI');
      }

      // Parse da resposta JSON com explicações
      const response = JSON.parse(content);
      
      // Validação básica da resposta
      if (!response.diagnosis || !response.diseases || !response.exams || !response.medications) {
        throw new Error('Formato de resposta inválido da OpenAI');
      }

      // 🧠 GARANTIR QUE EXPLANATION EXISTE
      if (!response.explanation) {
        response.explanation = {
          reasoning: detectedLanguage === 'en' ? 
            "Analysis based on reported symptoms and clinical patterns." : 
            "Análise baseada nos sintomas relatados e padrões clínicos.",
          confidence: 0.80,
          keySymptoms: response.diseases.slice(0, 2),
          differentialDiagnoses: response.diseases.slice(1),
          recommendationBasis: detectedLanguage === 'en' ? 
            "Standard clinical guidelines and symptom correlation." : 
            "Diretrizes clínicas padrão e correlação de sintomas."
        };
      }

      return {
        ...response,
        language: detectedLanguage
      };
    } catch (error) {
      console.error('Erro na geração de diagnóstico:', error);
      
      // Tratamento específico para diferentes tipos de erro
      if (error instanceof Error) {
        if (error.message.includes('rate_limit') || error.message.includes('429')) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        }
        if (error.message.includes('quota') || error.message.includes('billing')) {
          throw new Error('Cota da OpenAI excedida. Verifique seu plano e billing na OpenAI.');
        }
        if (error instanceof SyntaxError) {
          throw new Error('Falha ao processar resposta da IA');
        }
      }
      
      throw new Error('Falha ao gerar diagnóstico');
    }
  }
}