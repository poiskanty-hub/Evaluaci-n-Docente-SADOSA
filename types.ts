/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string;
  name: string;
  subject: string;
}

export interface Evaluation {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  studentCourse: string;
  trimester: string; // "1er Trimestre" | "2do Trimestre" | "3er Trimestre"
  scores: number[]; // Index 0 to 6 representing Q1 to Q7, scale of 1 to 5
  openAnswers: string[]; // Index 0 to 2 representing Q8 to Q10
  totalScore: number; // Overall calculated score (0-100)
  createdAt: string; // Automatic ISO date-time
}

export interface QuestionDefinition {
  id: number;
  text: string;
  type: "rating" | "text";
}

export interface TeacherStats {
  teacherId: string;
  teacherName: string;
  subject: string;
  totalEvaluations: number;
  averageScore: number; // Scale 0-100
  courses: {
    [courseName: string]: {
      count: number;
      averageScore: number;
    };
  };
  questionScoreAverages: number[]; // 7 averages (each mapped to 0-100)
  strengths: { questionId: number; text: string; score: number }[];
  weaknesses: { questionId: number; text: string; score: number }[];
  suggestions: {
    q8: string[]; // Actividades complementarias
    q9: string[]; // Ambientes/Recursos
    q10: string[]; // Sugerencias calidad educativa
  };
}
