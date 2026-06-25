export interface NotifyTeacherEvent {
  teacherId: string;
  teacherEmail: string;
  studentName: string;
  taskTitle: string;
  submissionId: string;
  status: 'passed' | 'failed';
}
