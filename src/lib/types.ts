export interface Student {
  id: string;
  fullName: string;
  birthday: string;
  phone: string;
  parentPhone: string;
  email: string;
  highSchool: string;
  obp: string;
  goals: string;
  area: 'SAY' | 'EA' | 'DİL' | 'SÖZ';
  grade: '11. Sınıf' | '12. Sınıf' | 'Mezun';
  avatarUrl?: string;
}

export interface StudyTask {
  id: string;
  studentId: string;
  dayOfWeek: number; // 0-6
  subject: string;
  topic: string;
  estimatedMinutes: number;
  description: string;
  completed: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  timestamp: string;
  read: boolean;
}

export interface User {
  id: string;
  role: 'admin' | 'student';
  name: string;
  avatarUrl?: string;
}
