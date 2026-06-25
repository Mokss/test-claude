import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { tasksApi } from '../../api/tasks.ts';
import type { Task } from '../../types.ts';

const statusLabel: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликовано',
};

const statusStyle: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
};

export function TeacherTaskListPage() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Удалить задачу «${title}»?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои задачи</h1>
        <Link
          to="/teacher/tasks/new"
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Новая задача
        </Link>
      </div>

      {tasks?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Задач нет</p>
          <Link to="/teacher/tasks/new" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
            Создать первую задачу
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks?.map((task: Task) => (
            <div
              key={task._id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[task.status]}`}>
                    {statusLabel[task.status]}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{task.language}</span>
                </div>
                <h2 className="font-semibold text-gray-900 truncate">{task.title}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/teacher/tasks/${task._id}`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Редактировать
                </Link>
                <button
                  onClick={() => handleDelete(task._id, task.title)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link to="/teacher/students" className="text-indigo-600 hover:underline text-sm">
          Перейти к ученикам →
        </Link>
      </div>
    </div>
  );
}
