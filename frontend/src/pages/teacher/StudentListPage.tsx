import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { studentsApi } from '../../api/students.ts';
import { useAuthStore } from '../../store/auth.ts';

export function TeacherStudentListPage() {
  const user = useAuthStore((s) => s.user);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.list,
    enabled: !!user,
  });

  if (isLoading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ученики</h1>
        <p className="text-sm text-gray-500">ID учителя: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{user?._id}</code></p>
      </div>

      {students?.length === 0 ? (
        <p className="text-gray-500">Учеников нет. Поделитесь своим ID с учениками при регистрации.</p>
      ) : (
        <div className="space-y-3">
          {students?.map((student) => (
            <Link
              key={student._id}
              to={`/teacher/students/${student._id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div>
                <p className="font-semibold text-gray-900">{student.name}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
              </div>
              <span className="text-sm text-indigo-600">Просмотр →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
