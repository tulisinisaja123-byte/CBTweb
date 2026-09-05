import { supabase } from '../lib/supabase';

export interface ExamSyncPayload {
  examId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, any>;
  violationsCount: number;
  status: 'PROGRESS' | 'SUBMITTED';
}

export const syncStudentAnswer = async (payload: ExamSyncPayload) => {
  try {
    const compositeId = `${payload.examId}_${payload.studentId}`;

    const { data, error } = await supabase
      .from('exam_responses')
      .upsert({
        id: compositeId,
        exam_id: payload.examId,
        student_id: payload.studentId,
        student_name: payload.studentName,
        answers: payload.answers,
        violations_count: payload.violationsCount,
        status: payload.status,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Gagal sinkronkan jawaban ke Supabase:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error syncStudentAnswer:', err);
    return null;
  }
};