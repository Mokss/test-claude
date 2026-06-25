import type { IStatsUseCase } from '../ports/input/stats-use-case.ts';
import type { ISubmissionRepository } from '../ports/output/submission-repository.ts';
import type { ITaskRepository } from '../ports/output/task-repository.ts';
import type { StudentStats, TaskStat } from '../domain/stats.ts';
import type { Submission, SandboxStatus } from '../domain/submission.ts';

const TERMINAL: SubmissionStatus[] = ['passed', 'failed', 'timeout', 'error'];
type SubmissionStatus = Submission['status'];

const STATUS_RANK: Record<SandboxStatus, number> = {
  passed: 4,
  failed: 3,
  timeout: 2,
  error: 1,
};

function bestStatus(statuses: SandboxStatus[]): SandboxStatus {
  return statuses.reduce((best, s) => STATUS_RANK[s] > STATUS_RANK[best] ? s : best);
}

export class StatsService implements IStatsUseCase {
  private readonly submissions: ISubmissionRepository;
  private readonly tasks: ITaskRepository;

  constructor(submissions: ISubmissionRepository, tasks: ITaskRepository) {
    this.submissions = submissions;
    this.tasks = tasks;
  }

  async getStudentStats(studentId: string, _teacherId: string): Promise<StudentStats> {
    const allSubs = await this.submissions.findByStudent(studentId);

    if (allSubs.length === 0) {
      return {
        studentId,
        totalSubmissions: 0,
        passedCount: 0,
        failedCount: 0,
        taskStats: [],
      };
    }

    const terminalSubs = allSubs.filter(s => TERMINAL.includes(s.status));
    const passedCount = terminalSubs.filter(s => s.status === 'passed').length;
    const failedCount = terminalSubs.filter(s => s.status === 'failed').length;

    const gradedSubs = allSubs.filter(s => s.grade != null);
    const averageScore = gradedSubs.length > 0
      ? gradedSubs.reduce((sum, s) => sum + s.grade!.score, 0) / gradedSubs.length
      : undefined;

    const subsWithDuration = allSubs.filter(s => s.sandboxResult != null);
    const averageDurationMs = subsWithDuration.length > 0
      ? subsWithDuration.reduce((sum, s) => sum + s.sandboxResult!.durationMs, 0) / subsWithDuration.length
      : undefined;

    const taskStats = await this.buildTaskStats(allSubs);

    return {
      studentId,
      totalSubmissions: allSubs.length,
      passedCount,
      failedCount,
      averageScore,
      averageDurationMs,
      taskStats,
    };
  }

  private async buildTaskStats(subs: Submission[]): Promise<TaskStat[]> {
    const byTask = new Map<string, Submission[]>();
    for (const sub of subs) {
      const list = byTask.get(sub.taskId) ?? [];
      list.push(sub);
      byTask.set(sub.taskId, list);
    }

    const stats: TaskStat[] = [];

    for (const [taskId, taskSubs] of byTask) {
      const task = await this.tasks.findById(taskId);
      const taskTitle = task?.title ?? taskId;

      const terminalSubs = taskSubs.filter(s => TERMINAL.includes(s.status) && s.sandboxResult);
      const sandboxStatuses = terminalSubs.map(s => s.sandboxResult!.status);

      if (sandboxStatuses.length === 0) continue;

      const gradedSub = [...taskSubs].reverse().find(s => s.grade != null);

      stats.push({
        taskId,
        taskTitle,
        attempts: taskSubs.length,
        bestStatus: bestStatus(sandboxStatuses),
        grade: gradedSub?.grade,
      });
    }

    return stats;
  }
}
