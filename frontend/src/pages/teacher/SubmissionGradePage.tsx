import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '../../api/submissions.ts';
import { CodeEditor } from '../../components/CodeEditor.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { ApiError } from '../../api/client.ts';

export function TeacherSubmissionGradePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: sub, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => submissionsApi.get(id!),
    enabled: !!id,
  });

  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const gradeMutation = useMutation({
    mutationFn: () => submissionsApi.grade(id!, {
      score: Number(score),
      comment: comment.trim() || undefined,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['submission', id], updated);
      const studentId = updated.studentId;
      queryClient.invalidateQueries({ queryKey: ['student-stats', studentId] });
      navigate(-1);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'NOT_READY') {
        setError('Задание ещё не проверено sandbox — попробуйте позже');
      } else {
        setError(err instanceof ApiError ? err.message : 'Ошибка сохранения оценки');
      }
    },
  });

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;
  if (!sub) return <p className="text-red-500">Решение не найдено</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline">&larr; Назад</button>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Решение ученика</h1>
          <StatusBadge status={sub.status} />
        </div>
        {sub.student && (
          <p className="text-sm text-gray-500 mt-1">{sub.student.name} · {new Date(sub.submittedAt).toLocaleString('ru')}</p>
        )}
      </div>

      {sub.sandboxResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Результаты тестов</h2>
            <span className="text-sm text-gray-600">
              {sub.sandboxResult.passedCount}/{sub.sandboxResult.totalCount} · {sub.sandboxResult.durationMs}ms
            </span>
          </div>
          <div className="space-y-2">
            {sub.sandboxResult.testResults.map((tr, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${tr.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <span className={`font-medium ${tr.passed ? 'text-green-700' : 'text-red-700'}`}>
                  Тест {i + 1}: {tr.passed ? 'Пройден' : 'Не пройден'} · {tr.durationMs}ms
                </span>
                {!tr.passed && (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
                    <div>
                      <p className="text-gray-500 mb-1">Ввод:</p>
                      <pre className="bg-white rounded px-2 py-1">{tr.input}</pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Ожидалось:</p>
                      <pre className="bg-white rounded px-2 py-1">{tr.expectedOutput}</pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Получено:</p>
                      <pre className="bg-white rounded px-2 py-1">{tr.actualOutput}</pre>
                    </div>
                  </div>
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

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          {sub.grade ? 'Изменить оценку' : 'Выставить оценку'}
        </h2>

        {sub.grade && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-700">
              Текущая оценка: <strong>{sub.grade.score}/100</strong>
              {sub.grade.comment && ` — ${sub.grade.comment}`}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Оценка (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={sub.grade ? String(sub.grade.score) : ''}
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий (необязательно)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={sub.grade?.comment ?? ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => gradeMutation.mutate()}
            disabled={gradeMutation.isPending || !score}
            className="bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {gradeMutation.isPending ? 'Сохраняем...' : 'Сохранить оценку'}
          </button>
        </div>
      </div>
    </div>
  );
}
