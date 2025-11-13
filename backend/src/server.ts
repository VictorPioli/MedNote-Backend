import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

import { config, validateConfig } from './config';
import { OpenAIService } from './services';
import { MedicalController } from './controllers';

// Configuração do multer para upload de áudio
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB (limite do Whisper)
  },
  fileFilter: (req, file, cb) => {
    // Aceita apenas arquivos de áudio - incluindo mais variações
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
    
    console.log('Multer - arquivo recebido:', file.mimetype);
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Apenas arquivos de áudio são permitidos. Recebido: ${file.mimetype}`));
    }
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    message: 'Muitas requisições, tente novamente em 15 minutos'
  }
});

async function startServer() {
  try {
    // Valida configurações
    validateConfig();
    
    const app = express();
    
    // Configurar trust proxy para rate limiting
    app.set('trust proxy', 1);
    
    // Middlewares de segurança
    app.use(helmet());
    app.use(cors({
      origin: config.corsOrigin,
      credentials: true
    }));
    app.use(limiter);
    
    // Middlewares de parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Inicializa serviços
    const openAIService = new OpenAIService(config.openaiApiKey);
    const medicalController = new MedicalController(openAIService);
    
    // Rotas da API
    app.get('/api/health', medicalController.health);
    app.post('/api/transcribe', upload.single('audio'), medicalController.transcribe);
    app.post('/api/diagnose', medicalController.diagnose);
    app.post('/api/chat', medicalController.chat);
    
    // 🔥 NOVAS ROTAS FIREBASE
    app.get('/api/consultations', medicalController.getConsultations);
    app.get('/api/consultations/stats', medicalController.getConsultationStats);
    app.delete('/api/consultations/:id', medicalController.deleteConsultation);
    
    // Middleware de tratamento de erros
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Erro não tratado:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    });
    
    // Rota 404
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
      });
    });
    
    // Inicia servidor
    const server = app.listen(config.port, () => {
      console.log(`🚀 Servidor rodando na porta ${config.port}`);
      console.log(`📊 Ambiente: ${config.nodeEnv}`);
      console.log(`🌐 CORS habilitado para: ${config.corsOrigin}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 Recebido SIGTERM, fechando servidor...');
      server.close(() => {
        console.log('✅ Servidor fechado com sucesso');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Inicia a aplicação
startServer();