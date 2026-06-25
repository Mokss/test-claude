import { type Collection, type Db, ObjectId } from 'mongodb';
import type { IUserRepository } from '../../../core/ports/output/user-repository.ts';
import type { User } from '../../../core/domain/user.ts';

type UserDoc = Omit<User, '_id'> & { _id: ObjectId };

function toUser(doc: UserDoc): User {
  return { ...doc, _id: doc._id.toHexString() };
}

export class MongoUserRepository implements IUserRepository {
  private readonly col: Collection<UserDoc>;

  constructor(db: Db) {
    this.col = db.collection<UserDoc>('users');
  }

  async findById(id: string): Promise<User | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.col.findOne({ _id: new ObjectId(id) });
    return doc ? toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.col.findOne({ email });
    return doc ? toUser(doc) : null;
  }

  async findStudentsByTeacher(teacherId: string): Promise<User[]> {
    const docs = await this.col.find({ teacherId, role: 'student' }).toArray();
    return docs.map(toUser);
  }

  async create(data: Omit<User, '_id' | 'createdAt'>): Promise<User> {
    const doc: UserDoc = { ...data, _id: new ObjectId(), createdAt: new Date() };
    await this.col.insertOne(doc);
    return toUser(doc);
  }
}
