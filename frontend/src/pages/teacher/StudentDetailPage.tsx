import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../../api/students.ts';
import { submissionsApi } from '../../api/submissions.ts';
import { StatusBadge } from '../../components/StatusBadge.tsx';

export function TeacherStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats', studentId],
    queryFn: () => studentsApi.stats(studentId!),
    enabled: !!studentId,
  });

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['student-submissions', studentId],
    queryFn: () => submissionsApi.listByStudent(studentId!),
    enabled: !!studentId,
  });

  if (statsLoading || subsLoading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher/students" className="text-sm text-indigo-600 hover:underline">&larr; К ученикам</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Ученик</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Всего попыток', value: stats.totalSubmissions },
            { label: 'Принято', value: stats.passedCount },
            { label: 'Не принято', value: stats.failedCount },
            { label: 'Средняя оценка', value: stats.averageScore != null ? `${stats.averageScore.toFixed(1)}/100` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {stats && stats.taskStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">По задачам</h2>
          <div className="space-y-2">
            {stats.taskStats.map((ts) => (
              <div key={ts.taskId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{ts.taskTitle}</p>
                  <p className="text-xs text-gray-500">{ts.attempts} попыток</p>
                </div>
                <div className="flex items-center gap-3">
                  {ts.grade && (
                    <span className="text-sm font-medium text-indigo-600">{ts.grade.score}/100</span>
                  )}
                  <StatusBadge status={ts.bestStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Все решения</h2>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <Link
                key={sub._id}
                to={`/teacher/submissions/${sub._id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{sub.taskId}</p>
                  <p className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleString('ru')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {sub.sandboxResult && (
                    <span className="text-sm text-gray-600">
                      {sub.sandboxResult.passedCount}/{sub.sandboxResult.totalCount}
                    </span>
                  )}
                  {sub.grade && (
                    <span className="text-sm font-medium text-indigo-600">{sub.grade.score}/100</span>
                  )}
                  <StatusBadge status={sub.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
