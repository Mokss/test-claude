import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '../../api/submissions.ts';
import { CodeEditor } from '../../components/CodeEditor.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';

export function StudentSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: sub, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => submissionsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'pending' || s === 'running' ? 3000 : false;
    },
  });

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;
  if (!sub) return <p className="text-red-500">Решение не найдено</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/student/tasks/${sub.taskId}`} className="text-sm text-indigo-600 hover:underline">
          &larr; К задаче
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Решение</h1>
          <StatusBadge status={sub.status} />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(sub.submittedAt).toLocaleString('ru')}
        </p>
      </div>

      {sub.grade && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h2 className="font-semibold text-indigo-900 mb-1">Оценка учителя</h2>
          <p className="text-3xl font-bold text-indigo-700">{sub.grade.score}<span className="text-base font-normal text-indigo-500">/100</span></p>
          {sub.grade.comment && (
            <p className="mt-2 text-sm text-indigo-800">{sub.grade.comment}</p>
          )}
        </div>
      )}

      {sub.sandboxResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Результаты тестов</h2>
            <span className="text-sm font-medium text-gray-600">
              {sub.sandboxResult.passedCount}/{sub.sandboxResult.totalCount} прошло
              · {sub.sandboxResult.durationMs}ms
            </span>
          </div>

          <div className="space-y-2">
            {sub.sandboxResult.testResults.map((tr, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${tr.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${tr.passed ? 'text-green-700' : 'text-red-700'}`}>
                    Тест {i + 1}: {tr.passed ? 'Пройден' : 'Не пройден'} · {tr.durationMs}ms
                  </span>
                </div>
                {!tr.passed && (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-1">
                    <div>
                      <p className="text-gray-500 mb-1">Ввод:</p>
                      <pre className="bg-white rounded px-2 py-1 text-gray-800">{tr.input}</pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Ожидалось:</p>
                      <pre className="bg-white rounded px-2 py-1 text-gray-800">{tr.expectedOutput}</pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Получено:</p>
                      <pre className="bg-white rounded px-2 py-1 text-gray-800">{tr.actualOutput}</pre>
                    </div>
                  </div>
                )}
                {tr.error && (
                  <pre className="mt-2 text-xs text-red-600 bg-white rounded px-2 py-1">{tr.error}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Код решения</h2>
        <CodeEditor
          value={sub.code}
          onChange={() => {}}
          language={sub.language}
          readOnly
          height="350px"
        />
      </div>
    </div>
  );
}
