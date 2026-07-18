export interface Option {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  questionText: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING";
  options: Option[];
  answerKey: string;
  order: number;
}

export interface MatchingQuestion {
  id: string;
  questionText: string;
}

export interface Assessment {
  id: string;
  title?: string | null;
  inputType: "TEXT" | "IMAGE";
  rawInputText: string | null;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MIXED";
  questionCount: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  createdAt: string;
  _count?: {
    questions: number;
  };
  questions?: MatchingQuestion[];
}

export interface ExportQuestion {
  id: string;
  questionText: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING";
  options: {
    id: string;
    optionText: string;
    isCorrect: boolean;
  }[];
  answerKey: string;
}

export interface IncomingOption {
  optionText: string;
  isCorrect: boolean;
}

export interface IncomingQuestion {
  questionText: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING";
  answerKey: string;
  options?: IncomingOption[];
}
export interface StatsData {
  totalAssessments: number;
  totalQuestions: number;
  difficultyDistribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export interface AssessmentOption {
  _count?: {
    questions: number;
  };
  id: string;
  title: string | null;
  questionType: string;
}
export interface ExamItem {
  id: string;
  assessmentId: string;
  title: string;
  token: string;
  duration: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  showLeaderboard: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  assessment: {
    title: string | null;
    questionCount: number;
    questionType: string;
  };
  _count: {
    attempts: number;
  };
}
