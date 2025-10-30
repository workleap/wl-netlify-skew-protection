// Mock localStorage for MSW - must be set up before MSW is imported
const storage = new Map<string, string>();

global.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
        return storage.size;
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null
};
