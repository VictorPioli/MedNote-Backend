import admin from 'firebase-admin';

// Interface para dados da consulta
interface ConsultationData {
  id: string;
  transcription: string;
  diagnosis: string;
  diseases?: string[];
  exams?: string[];
  medications?: string[];
  timestamp: Date;
  duration?: number;
  confidence?: number;
}

class FirebaseService {
  private db!: admin.firestore.Firestore;
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!this.initialized && admin.apps.length === 0) {
        // Caminho para o arquivo de credenciais (service account)
        // Usando require para carregar o arquivo JSON diretamente
        const serviceAccount = require('../../keys/mednote-8ae39-firebase-adminsdk-fbsvc-a8eccf6a10.json');
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'mednote-8ae39'
        });

        this.db = admin.firestore();
        this.initialized = true;
        console.log('🔥 Firebase Admin SDK inicializado com sucesso');
      } else if (admin.apps.length > 0) {
        this.db = admin.firestore();
        this.initialized = true;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Salva uma consulta na coleção MedNote
   */
  async saveConsultation(data: ConsultationData): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('Firebase não inicializado');
      }

      const consultationRef = this.db.collection('MedNote').doc(data.id);
      
      const consultationData = {
        id: data.id,
        transcription: data.transcription,
        diagnosis: data.diagnosis,
        diseases: data.diseases || [],
        exams: data.exams || [],
        medications: data.medications || [],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: data.timestamp,
        duration: data.duration || null,
        confidence: data.confidence || null,
        status: 'completed'
      };

      await consultationRef.set(consultationData);
      
      console.log(`✅ Consulta salva no Firebase: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Erro ao salvar consulta no Firebase:', error);
      throw error;
    }
  }

  /**
   * Busca consultas da coleção MedNote
   */
  async getConsultations(limit: number = 10): Promise<ConsultationData[]> {
    try {
      if (!this.initialized) {
        throw new Error('Firebase não inicializado');
      }

      const snapshot = await this.db
        .collection('MedNote')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const consultations: ConsultationData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        consultations.push({
          id: doc.id,
          transcription: data.transcription,
          diagnosis: data.diagnosis,
          diseases: data.diseases || [],
          exams: data.exams || [],
          medications: data.medications || [],
          timestamp: data.createdAt?.toDate() || data.timestamp?.toDate(),
          duration: data.duration,
          confidence: data.confidence
        });
      });

      return consultations;
    } catch (error) {
      console.error('❌ Erro ao buscar consultas no Firebase:', error);
      throw error;
    }
  }

  /**
   * Deleta uma consulta
   */
  async deleteConsultation(id: string): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('Firebase não inicializado');
      }

      await this.db.collection('MedNote').doc(id).delete();
      console.log(`🗑️ Consulta deletada: ${id}`);
    } catch (error) {
      console.error('❌ Erro ao deletar consulta:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas
   */
  async getStats(): Promise<{ total: number; today: number; thisWeek: number }> {
    try {
      if (!this.initialized) {
        throw new Error('Firebase não inicializado');
      }

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

      // Total de consultas
      const totalSnapshot = await this.db.collection('MedNote').get();
      const total = totalSnapshot.size;

      // Consultas hoje
      const todaySnapshot = await this.db
        .collection('MedNote')
        .where('timestamp', '>=', startOfDay)
        .get();
      const today = todaySnapshot.size;

      // Consultas esta semana
      const weekSnapshot = await this.db
        .collection('MedNote')
        .where('timestamp', '>=', startOfWeek)
        .get();
      const thisWeek = weekSnapshot.size;

      return { total, today, thisWeek };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { total: 0, today: 0, thisWeek: 0 };
    }
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;