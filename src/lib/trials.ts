export interface Trial {
  id: string;
  coursecode: string;
  name: string;
  phone?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'trials:';

function getStorageKey(coursecode: string): string {
  const safeCoursecode = coursecode?.trim() || 'onbekend';
  return `${STORAGE_PREFIX}${safeCoursecode}`;
}

function isTrialsKey(key: string | null): key is string {
  return Boolean(key && key.startsWith(STORAGE_PREFIX));
}

function parseTrials(value: string | null): Trial[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const normalized: Trial[] = [];
    parsed.forEach((entry) => {
      const trial = entry as Partial<Trial>;
      if (!trial || typeof trial !== 'object') {
        return;
      }
      const id = typeof trial.id === 'string' && trial.id.trim() ? trial.id.trim() : null;
      const coursecode = typeof trial.coursecode === 'string' ? trial.coursecode.trim() : '';
      const name = typeof trial.name === 'string' ? trial.name.trim() : '';
      const phone = typeof trial.phone === 'string' ? trial.phone.trim() : undefined;
      const rawCount =
        typeof trial.count === 'number'
          ? trial.count
          : Number.parseInt(String(trial.count ?? 0), 10);
      const count = Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
      const createdAt = typeof trial.createdAt === 'string' ? trial.createdAt : new Date().toISOString();
      const updatedAt = typeof trial.updatedAt === 'string' ? trial.updatedAt : createdAt;
      if (!id || !coursecode || !name) {
        return;
      }
      normalized.push({
        id,
        coursecode,
        name,
        phone: phone && phone.length > 0 ? phone : undefined,
        count,
        createdAt,
        updatedAt,
      });
    });
    return normalized;
  } catch (error) {
    console.warn('Kon proeflessers niet parsen', error);
    return [];
  }
}

function storeTrials(coursecode: string, trials: Trial[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  const key = getStorageKey(coursecode);
  try {
    const payload = JSON.stringify(trials);
    window.localStorage.setItem(key, payload);
  } catch (error) {
    console.warn('Kon proeflessers niet opslaan', error);
  }
}

export function getTrials(coursecode: string): Trial[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const key = getStorageKey(coursecode);
  const raw = window.localStorage.getItem(key);
  return parseTrials(raw);
}

export function getAllTrials(): Trial[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const trials: Trial[] = [];
  const { localStorage } = window;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!isTrialsKey(key)) {
      continue;
    }
    const parsed = parseTrials(localStorage.getItem(key));
    trials.push(...parsed);
  }
  return trials;
}

export function addTrial(trial: Trial): Trial[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const key = getStorageKey(trial.coursecode);
  const existing = parseTrials(window.localStorage.getItem(key));
  const next = [...existing, trial];
  storeTrials(trial.coursecode, next);
  return next;
}

export function updateTrial(updated: Trial): Trial[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const { localStorage } = window;

  let sourceKey: string | null = null;
  let sourceTrials: Trial[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!isTrialsKey(key)) {
      continue;
    }
    const parsed = parseTrials(localStorage.getItem(key));
    if (parsed.some((trial) => trial.id === updated.id)) {
      sourceKey = key;
      sourceTrials = parsed;
      break;
    }
  }

  const targetKey = getStorageKey(updated.coursecode);

  if (!sourceKey) {
    const existing = parseTrials(localStorage.getItem(targetKey));
    const next = existing.map((trial) => (trial.id === updated.id ? updated : trial));
    storeTrials(updated.coursecode, next);
    return next;
  }

  if (sourceKey === targetKey) {
    const next = sourceTrials.map((trial) => (trial.id === updated.id ? updated : trial));
    const coursecode = sourceKey.slice(STORAGE_PREFIX.length);
    storeTrials(coursecode, next);
    return next;
  }

  const sourceCoursecode = sourceKey.slice(STORAGE_PREFIX.length);
  const filteredSource = sourceTrials.filter((trial) => trial.id !== updated.id);
  storeTrials(sourceCoursecode, filteredSource);

  const targetExisting = parseTrials(localStorage.getItem(targetKey));
  const filteredTarget = targetExisting.filter((trial) => trial.id !== updated.id);
  const targetNext = [...filteredTarget, updated];
  storeTrials(updated.coursecode, targetNext);
  return targetNext;
}

export function removeTrial(id: string): Trial[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const { localStorage } = window;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!isTrialsKey(key)) {
      continue;
    }
    const existing = parseTrials(localStorage.getItem(key));
    if (!existing.some((trial) => trial.id === id)) {
      continue;
    }
    const next = existing.filter((trial) => trial.id !== id);
    const coursecode = key.slice(STORAGE_PREFIX.length);
    storeTrials(coursecode, next);
    return next;
  }
  return [];
}
