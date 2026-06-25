import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.ts';
import { CodeEditor } from '../../components/CodeEditor.tsx';
import type { Language, TaskStatus, TestCase } from '../../types.ts';
import { ApiError } from '../../api/client.ts';

interface FormState {
  title: string;
  description: string;
  language: Language;
  starterCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  status: TaskStatus;
  testCases: TestCase[];
}

const defaultForm: FormState = {
  title: '',
  description: '',
  language: 'python',
  starterCode: '',
  timeLimitMs: 5000,
  memoryLimitMb: 128,
  status: 'draft',
  testCases: [{ input: '', expectedOutput: '', isHidden: false }],
};

export function TeacherTaskFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.get(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        language: existing.language,
        starterCode: existing.starterCode ?? '',
        timeLimitMs: existing.timeLimitMs,
        memoryLimitMb: existing.memoryLimitMb,
        status: existing.status,
        testCases: existing.testCases,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? tasksApi.update(id!, form)
        : tasksApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/teacher');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    },
  });

  const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
    setForm((f) => ({
      ...f,
      testCases: f.testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)),
    }));
  };

  const addTestCase = () => {
    setForm((f) => ({
      ...f,
      testCases: [...f.testCases, { input: '', expectedOutput: '', isHidden: false }],
    }));
  };

  const removeTestCase = (index: number) => {
    setForm((f) => ({ ...f, testCases: f.testCases.filter((_, i) => i !== index) }));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/teacher" className="text-sm text-indigo-600 hover:underline">&larr; К задачам</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEdit ? 'Редактировать задачу' : 'Новая задача'}
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Язык</label>
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as Language }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовать</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Лимит времени (ms)</label>
            <input
              type="number"
              min={100}
              max={30000}
              value={form.timeLimitMs}
              onChange={(e) => setForm((f) => ({ ...f, timeLimitMs: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Лимит памяти (MB)</label>
            <input
              type="number"
              min={16}
              max={512}
              value={form.memoryLimitMb}
              onChange={(e) => setForm((f) => ({ ...f, memoryLimitMb: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Стартовый код</label>
          <CodeEditor
            value={form.starterCode}
            onChange={(v) => setForm((f) => ({ ...f, starterCode: v }))}
            language={form.language}
            height="200px"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Тест-кейсы</h2>
          <button
            onClick={addTestCase}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Добавить
          </button>
        </div>

        <div className="space-y-4">
          {form.testCases.map((tc, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Тест {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) => updateTestCase(i, 'isHidden', e.target.checked)}
                      className="rounded"
                    />
                    Скрытый
                  </label>
                  {form.testCases.length > 1 && (
                    <button
                      onClick={() => removeTestCase(i)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ввод (stdin)</label>
                  <textarea
                    rows={3}
                    value={tc.input}
                    onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ожидаемый вывод</label>
                  <textarea
                    rows={3}
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <Link
          to="/teacher"
          className="bg-gray-100 text-gray-700 rounded-lg px-6 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Отмена
        </Link>
      </div>
    </div>
  );
}
