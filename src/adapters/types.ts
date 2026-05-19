export interface NavigationAdapter {
  navigate(route: string): void | Promise<void>;
  getCurrentRoute(): string | null;
  subscribe(listener: (route: string) => void): () => void;
}

export interface PersistenceAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
