import { Link, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth.ts';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homeUrl = user?.role === 'teacher' ? '/teacher' : '/student';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <Link to={homeUrl} className="text-xl font-bold text-indigo-600">
          iSmart
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.name}
            <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
              {user?.role}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
