import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.ts';
import { submissionsApi } from '../../api/submissions.ts';
import { CodeEditor } from '../../components/CodeEditor.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import type { Language } from '../../types.ts';
import { ApiError } from '../../api/client.ts';

export function StudentTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.get(id!),
    enabled: !!id,
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions', 'task', id],
    queryFn: () => submissionsApi.listByTask(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((s) => s.status === 'pending' || s.status === 'running')) return 3000;
      return false;
    },
  });

  const [code, setCode] = useState('');
  const [submitError, setSubmitError] = useState('');

  const submitMutation = useMutation({
    mutationFn: (language: Language) =>
      submissionsApi.submit(id!, { code, language }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'task', id] });
      setSubmitError('');
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Ошибка при отправке');
    },
  });

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;
  if (!task) return <p className="text-red-500">Задача не найдена</p>;

  const starterCode = task.starterCode ?? '';
  const effectiveCode = code || starterCode;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/student" className="text-sm text-indigo-600 hover:underline">&larr; К задачам</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{task.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{task.language} · {task.timeLimitMs}ms · {task.memoryLimitMb}MB</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-2">Описание</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
      </div>

      {task.testCases.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Тест-кейсы</h2>
          <div className="space-y-3">
            {task.testCases.map((tc, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ввод:</p>
                  <pre className="bg-gray-50 rounded px-3 py-2 font-mono text-gray-800">{tc.input}</pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Вывод:</p>
                  <pre className="bg-gray-50 rounded px-3 py-2 font-mono text-gray-800">{tc.expectedOutput}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Ваше решение</h2>
        <CodeEditor
          value={effectiveCode}
          onChange={setCode}
          language={task.language}
          height="350px"
        />
        {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
        <button
          onClick={() => submitMutation.mutate(task.language)}
          disabled={submitMutation.isPending || !effectiveCode.trim()}
          className="mt-3 bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitMutation.isPending ? 'Отправляем...' : 'Отправить решение'}
        </button>
      </div>

      {submissions && submissions.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Мои попытки</h2>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <Link
                key={sub._id}
                to={`/student/submissions/${sub._id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 transition-all"
              >
                <span className="text-sm text-gray-500">
                  {new Date(sub.submittedAt).toLocaleString('ru')}
                </span>
                <div className="flex items-center gap-3">
                  {sub.sandboxResult && (
                    <span className="text-sm text-gray-600">
                      {sub.sandboxResult.passedCount}/{sub.sandboxResult.totalCount} тестов
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
