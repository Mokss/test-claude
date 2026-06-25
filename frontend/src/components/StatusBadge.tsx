import type { SubmissionStatus } from '../types.ts';

const styles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  timeout: 'bg-orange-100 text-orange-700',
  error: 'bg-gray-100 text-gray-700',
  not_submitted: 'bg-gray-100 text-gray-500',
};

const labels: Record<string, string> = {
  pending: 'Ожидает',
  running: 'Выполняется',
  passed: 'Принято',
  failed: 'Не принято',
  timeout: 'Таймаут',
  error: 'Ошибка',
  not_submitted: 'Не сдано',
};

interface Props {
  status: SubmissionStatus | 'not_submitted';
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.error}`}>
      {labels[status] ?? status}
    </span>
  );
}
