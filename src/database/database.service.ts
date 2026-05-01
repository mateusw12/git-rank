import { Injectable } from '@nestjs/common';

type CollectionRecord = Record<string, unknown>;

@Injectable()
export class DatabaseService {
  private readonly collections = new Map<string, Map<string, CollectionRecord>>();

  private getCollection(name: string): Map<string, CollectionRecord> {
    const existing = this.collections.get(name);

    if (existing) {
      return existing;
    }

    const created = new Map<string, CollectionRecord>();
    this.collections.set(name, created);
    return created;
  }

  private nextId(collection: Map<string, CollectionRecord>): string {
    return `${collection.size + 1}`;
  }

  insert<T extends CollectionRecord>(collectionName: string, data: T): T & { id: string } {
    const collection = this.getCollection(collectionName);
    const id = this.nextId(collection);
    const created = { id, ...data };

    collection.set(id, created);
    return created;
  }

  findById<T extends CollectionRecord>(collectionName: string, id: string): (T & { id: string }) | null {
    const collection = this.getCollection(collectionName);
    const found = collection.get(id);

    if (!found) {
      return null;
    }

    return found as T & { id: string };
  }

  findAll<T extends CollectionRecord>(collectionName: string): Array<T & { id: string }> {
    const collection = this.getCollection(collectionName);
    return Array.from(collection.values()) as Array<T & { id: string }>;
  }

  update<T extends CollectionRecord>(
    collectionName: string,
    id: string,
    patch: Partial<T>,
  ): (T & { id: string }) | null {
    const collection = this.getCollection(collectionName);
    const existing = collection.get(id);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...patch,
      id,
    };

    collection.set(id, updated);
    return updated as T & { id: string };
  }

  delete(collectionName: string, id: string): boolean {
    const collection = this.getCollection(collectionName);
    return collection.delete(id);
  }
}
