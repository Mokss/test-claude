import { type Collection, type Db, ObjectId } from 'mongodb';
import type { ISubmissionRepository } from '../../../core/ports/output/submission-repository.ts';
import type { Submission, SandboxResult, Grade } from '@ismart/specs';

type SubmissionDoc = Omit<Submission, '_id'> & { _id: ObjectId };

function toSubmission(doc: SubmissionDoc): Submission {
  return { ...doc, _id: doc._id.toHexString() };
}

export class MongoSubmissionRepository implements ISubmissionRepository {
  private readonly col: Collection<SubmissionDoc>;

  constructor(db: Db) {
    this.col = db.collection<SubmissionDoc>('submissions');
  }

  async findById(id: string): Promise<Submission | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.col.findOne({ _id: new ObjectId(id) });
    return doc ? toSubmission(doc) : null;
  }

  async findByTask(taskId: string): Promise<Submission[]> {
    const docs = await this.col.find({ taskId }).sort({ submittedAt: -1 }).toArray();
    return docs.map(toSubmission);
  }

  async findByStudent(studentId: string): Promise<Submission[]> {
    const docs = await this.col.find({ studentId }).sort({ submittedAt: -1 }).toArray();
    return docs.map(toSubmission);
  }

  async findByTaskAndStudent(taskId: string, studentId: string): Promise<Submission[]> {
    const docs = await this.col.find({ taskId, studentId }).sort({ submittedAt: -1 }).toArray();
    return docs.map(toSubmission);
  }

  async create(data: Omit<Submission, '_id' | 'submittedAt'>): Promise<Submission> {
    const doc: SubmissionDoc = { ...data, _id: new ObjectId(), submittedAt: new Date() };
    await this.col.insertOne(doc);
    return toSubmission(doc);
  }

  async updateStatus(id: string, status: Submission['status'], sandboxResult?: SandboxResult): Promise<Submission | null> {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, ...(sandboxResult ? { sandboxResult } : {}) } },
      { returnDocument: 'after' },
    );
    return result ? toSubmission(result) : null;
  }

  async updateGrade(id: string, grade: Grade): Promise<Submission | null> {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { grade } },
      { returnDocument: 'after' },
    );
    return result ? toSubmission(result) : null;
  }
}
