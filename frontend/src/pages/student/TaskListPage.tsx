import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { tasksApi } from '../../api/tasks.ts';
import type { Task } from '../../types.ts';

export function StudentTaskListPage() {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;
  if (error) return <p className="text-red-500">Ошибка загрузки задач</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Задачи</h1>

      {tasks?.length === 0 ? (
        <p className="text-gray-500">Задач пока нет</p>
      ) : (
        <div className="space-y-3">
          {tasks?.map((task: Task) => (
            <Link
              key={task._id}
              to={`/student/tasks/${task._id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{task.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase shrink-0">{task.language}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
