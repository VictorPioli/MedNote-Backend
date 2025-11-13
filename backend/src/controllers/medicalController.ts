import { Request, Response } from 'express';
import { OpenAIService } from '../services/openaiService';
import { firebaseService } from '../services/firebaseService';
import { DiagnoseRequest, ChatRequest } from '../types';
import { randomUUID } from 'crypto';

export class MedicalController {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Endpoint para transcrição de áudio
   * POST /api/transcribe
   */
  transcribe = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Arquivo de áudio é obrigatório',
          transcript: ''
        });
        return;
      }

      // Log do arquivo recebido para debug
      console.log('Arquivo recebido:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Validação do tipo de arquivo - incluindo mais variações de MIME types
      const allowedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/mp4',
        'audio/m4a',
        'audio/x-m4a'
      ];
      
      if (!allowedTypes.includes(req.file.mimetype)) {
        console.log('Tipo MIME rejeitado:', req.file.mimetype);
        res.status(400).json({
          success: false,
          message: `Formato de áudio não suportado (${req.file.mimetype}). Use WebM, WAV, MP3 ou M4A.`,
          transcript: ''
        });
        return;
      }

      // Validação do tamanho (max 25MB - limite do Whisper)
      if (req.file.size > 25 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          message: 'Arquivo muito grande. Máximo 25MB.',
          transcript: ''
        });
        return;
      }

      const transcript = await this.openAIService.transcribeAudio(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        transcript,
        success: true,
        message: 'Transcrição realizada com sucesso'
      });

    } catch (error) {
      console.error('Erro no endpoint transcribe:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        transcript: ''
      });
    }
  };

  /**
   * Endpoint para diagnóstico médico
   * POST /api/diagnose
   */
  diagnose = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transcript }: DiagnoseRequest = req.body;

      if (!transcript || transcript.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Transcript é obrigatório',
          diagnosis: '',
          diseases: [],
          exams: [],
          medications: []
        });
        return;
      }

      // Validação de comprimento mínimo
      if (transcript.trim().length < 10) {
        res.status(400).json({
          success: false,
          message: 'Transcript muito curto para análise',
          diagnosis: '',
          diseases: [],
          exams: [],
          medications: []
        });
        return;
      }

      const result = await this.openAIService.generateDiagnosis(transcript);

      // 🔥 SALVAMENTO ÚNICO NO FIREBASE (evita duplicação)
      // ✅ Apenas o backend salva - frontend não salva mais
      try {
        const consultationId = randomUUID();
        await firebaseService.saveConsultation({
          id: consultationId,
          transcription: transcript,
          diagnosis: result.diagnosis,
          diseases: result.diseases,
          exams: result.exams,
          medications: result.medications,
          timestamp: new Date(),
          confidence: 0.95 // Valor padrão para confiança
        });
        console.log(`✅ Consulta salva no Firebase: ${consultationId}`);
      } catch (firebaseError) {
        console.error('⚠️ Erro ao salvar no Firebase (continuando):', firebaseError);
        // Não interrompe o fluxo se o Firebase falhar
      }

      res.json({
        ...result,
        success: true,
        message: 'Diagnóstico gerado com sucesso'
      });

    } catch (error) {
      console.error('Erro no endpoint diagnose:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar diagnóstico',
        diagnosis: '',
        diseases: [],
        exams: [],
        medications: []
      });
    }
  };

  /**
   * Endpoint de health check
   * GET /api/health
   */
  health = async (req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'MedNote.IA Backend'
    });
  };

  /**
   * Endpoint para chat contextual
   * POST /api/chat
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, context, chatHistory }: ChatRequest = req.body;

      // Validações
      if (!message || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Mensagem é obrigatória',
          error: 'Mensagem vazia'
        });
        return;
      }

      if (!context || !context.transcript || !context.diagnosis) {
        res.status(400).json({
          success: false,
          message: 'Contexto da consulta é obrigatório',
          error: 'Contexto inválido'
        });
        return;
      }

      const response = await this.openAIService.chatWithContext(
        message,
        context,
        chatHistory || []
      );

      res.json({
        message: response,
        success: true
      });

    } catch (error) {
      console.error('Erro no endpoint chat:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      res.status(500).json({
        success: false,
        message: 'Erro ao processar mensagem',
        error: errorMessage
      });
    }
  };

  /**
   * Endpoint para buscar consultas do Firebase
   * GET /api/consultations
   */
  getConsultations = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const consultations = await firebaseService.getConsultations(limit);
      
      res.json({
        success: true,
        consultations,
        count: consultations.length
      });
    } catch (error) {
      console.error('Erro ao buscar consultas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar consultas',
        consultations: []
      });
    }
  };

  /**
   * Endpoint para buscar estatísticas
   * GET /api/consultations/stats
   */
  getConsultationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await firebaseService.getStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        stats: { total: 0, today: 0, thisWeek: 0 }
      });
    }
  };

  /**
   * Endpoint para deletar consulta
   * DELETE /api/consultations/:id
   */
  deleteConsultation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID da consulta é obrigatório'
        });
        return;
      }

      await firebaseService.deleteConsultation(id);
      
      res.json({
        success: true,
        message: 'Consulta deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar consulta:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar consulta'
      });
    }
  };
}