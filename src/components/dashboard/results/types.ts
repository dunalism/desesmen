export interface ExamDetails {
  id: string;
  title: string;
  token: string;
  duration: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  assessmentTitle: string;
  questionsCount: number;
}

export interface StatsSummary {
  averageScore: number;
  maxScore: number;
  minScore: number;
  totalAttempts: number;
}

export interface StudentAnswerItem {
  id: string;
  questionId: string;
  chosenOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  questionText: string;
  questionType: string;
  answerKey: string;
}

export interface ExamAttemptItem {
  durationSeconds: number;
  id: string;
  studentName: string;
  studentId: string | null;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  isGraded: boolean;
  answers: StudentAnswerItem[];
}

export interface ItemAnalysisItem {
  questionId: string;
  questionText: string;
  type: string;
  order: number;
  wrongCount: number;
  totalCount: number;
  errorPercentage: number;
  answerKey: string;
  options?: Array<{ id: string; optionText: string; isCorrect: boolean }>;
}

export interface ExamResultsResponse {
  success: boolean;
  exam: ExamDetails;
  stats: StatsSummary;
  attempts: ExamAttemptItem[];
  itemAnalysis: ItemAnalysisItem[];
}
