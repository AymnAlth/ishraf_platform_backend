import { AsyncLocalStorage } from "node:async_hooks";

import type { Queryable } from "../interfaces/queryable.interface";

type MemoStore = Map<string, Promise<unknown>>;

const queryableIds = new WeakMap<object, number>();
let nextQueryableId = 1;

const getQueryableMemoKey = (queryable: Queryable): string => {
  const queryableObject = queryable as object;
  const existingId = queryableIds.get(queryableObject);

  if (existingId) {
    return String(existingId);
  }

  const nextId = nextQueryableId++;
  queryableIds.set(queryableObject, nextId);

  return String(nextId);
};

export class RequestMemoService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<MemoStore>();

  run<T>(callback: () => T): T {
    return this.asyncLocalStorage.run(new Map(), callback);
  }

  async memoize<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const store = this.asyncLocalStorage.getStore();

    if (!store) {
      return factory();
    }

    const cachedPromise = store.get(key);

    if (cachedPromise) {
      return cachedPromise as Promise<T>;
    }

    const nextPromise = factory().catch((error) => {
      store.delete(key);
      throw error;
    });

    store.set(key, nextPromise);

    return nextPromise;
  }

  getQueryableMemoKey(queryable: Queryable): string {
    return getQueryableMemoKey(queryable);
  }
}

export const requestMemoService = new RequestMemoService();
