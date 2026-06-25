import type { Db } from 'mongodb';

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true },
    { key: { teacherId: 1 } },
  ]);

  await db.collection('tasks').createIndexes([
    { key: { authorId: 1, status: 1 } },
    { key: { createdAt: -1 } },
  ]);

  await db.collection('submissions').createIndexes([
    { key: { taskId: 1 } },
    { key: { studentId: 1 } },
    { key: { taskId: 1, studentId: 1 } },
    { key: { submittedAt: -1 } },
  ]);
}
