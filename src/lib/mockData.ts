import { Student, StudyTask, ChatMessage, User } from './types';

export const ADMIN_USER: User = {
  id: 'admin-1',
  role: 'admin',
  name: 'Koç Çakmak',
};

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'student-1',
    fullName: 'Elif Yılmaz',
    birthday: '2007-03-15',
    phone: '0532 123 4567',
    parentPhone: '0533 987 6543',
    email: 'elif@example.com',
    highSchool: 'Ankara Fen Lisesi',
    obp: '89.5',
    goals: 'Tıp fakültesine girmek istiyorum. Hacettepe veya İstanbul Tıp hedefim.',
    area: 'SAY',
    grade: '12. Sınıf',
  },
  {
    id: 'student-2',
    fullName: 'Ahmet Kaya',
    birthday: '2006-08-22',
    phone: '0535 555 1234',
    parentPhone: '0536 444 5678',
    email: 'ahmet@example.com',
    highSchool: 'İstanbul Erkek Lisesi',
    obp: '92.1',
    goals: 'Bilgisayar mühendisliği, ODTÜ veya Boğaziçi tercihim.',
    area: 'SAY',
    grade: 'Mezun',
  },
  {
    id: 'student-3',
    fullName: 'Zeynep Demir',
    birthday: '2008-01-10',
    phone: '0537 222 3344',
    parentPhone: '0538 111 2233',
    email: 'zeynep@example.com',
    highSchool: 'Galatasaray Lisesi',
    obp: '85.3',
    goals: 'Hukuk fakültesi, İstanbul Üniversitesi hedefim.',
    area: 'EA',
    grade: '11. Sınıf',
  },
];

export const MOCK_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    studentId: 'student-1',
    dayOfWeek: 1,
    subject: 'Matematik',
    topic: 'Türev',
    estimatedMinutes: 60,
    description: 'Türev kuralları ve uygulama soruları',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    studentId: 'student-1',
    dayOfWeek: 1,
    subject: 'Fizik',
    topic: 'Elektrik',
    estimatedMinutes: 45,
    description: 'Coulomb yasası ve elektrik alan',
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    studentId: 'student-1',
    dayOfWeek: 3,
    subject: 'Kimya',
    topic: 'Organik Kimya',
    estimatedMinutes: 50,
    description: 'Hidrokarbonlar ve adlandırma',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'student-1',
    receiverId: 'admin-1',
    content: 'Hocam türev konusunda biraz zorlanıyorum, yardımcı olabilir misiniz?',
    type: 'text',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
  },
  {
    id: 'msg-2',
    senderId: 'admin-1',
    receiverId: 'student-1',
    content: 'Tabii Elif, yarın dersteyken detaylı bakacağız. Şimdilik TYT denemesine odaklan.',
    type: 'text',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: true,
  },
  {
    id: 'msg-3',
    senderId: 'student-2',
    receiverId: 'admin-1',
    content: 'Deneme sonuçlarımı gönderdim, değerlendirir misiniz?',
    type: 'text',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    read: false,
  },
];

const STORAGE_KEYS = {
  user: 'cakmak_user',
  students: 'cakmak_students',
  tasks: 'cakmak_tasks',
  messages: 'cakmak_messages',
};

export function getStoredUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.user);
  return data ? JSON.parse(data) : null;
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}

export function getStudents(): Student[] {
  const data = localStorage.getItem(STORAGE_KEYS.students);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(MOCK_STUDENTS));
    return MOCK_STUDENTS;
  }
  return JSON.parse(data);
}

export function saveStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
}

export function getTasks(): StudyTask[] {
  const data = localStorage.getItem(STORAGE_KEYS.tasks);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(MOCK_TASKS));
    return MOCK_TASKS;
  }
  return JSON.parse(data);
}

export function saveTasks(tasks: StudyTask[]) {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export function getMessages(): ChatMessage[] {
  const data = localStorage.getItem(STORAGE_KEYS.messages);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(MOCK_MESSAGES));
    return MOCK_MESSAGES;
  }
  return JSON.parse(data);
}

export function saveMessages(messages: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
}
