import { type Collection, type Db, ObjectId } from 'mongodb';
import type { ITaskRepository, TaskUpdateData } from '../../../core/ports/output/task-repository.ts';
import type { Task } from '@ismart/specs';

type TaskDoc = Omit<Task, '_id'> & { _id: ObjectId };

function toTask(doc: TaskDoc): Task {
  return { ...doc, _id: doc._id.toHexString() };
}

export class MongoTaskRepository implements ITaskRepository {
  private readonly col: Collection<TaskDoc>;

  constructor(db: Db) {
    this.col = db.collection<TaskDoc>('tasks');
  }

  async findById(id: string): Promise<Task | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.col.findOne({ _id: new ObjectId(id) });
    return doc ? toTask(doc) : null;
  }

  async findByAuthor(authorId: string): Promise<Task[]> {
    const docs = await this.col.find({ authorId }).sort({ createdAt: -1 }).toArray();
    return docs.map(toTask);
  }

  async findPublishedByTeacher(teacherId: string): Promise<Task[]> {
    const docs = await this.col.find({ authorId: teacherId, status: 'published' }).sort({ createdAt: -1 }).toArray();
    return docs.map(toTask);
  }

  async create(data: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date();
    const doc: TaskDoc = { ...data, _id: new ObjectId(), createdAt: now, updatedAt: now };
    await this.col.insertOne(doc);
    return toTask(doc);
  }

  async update(id: string, data: TaskUpdateData): Promise<Task | null> {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    return result ? toTask(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
