import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
import { Trial, addTrial, getAllTrials, removeTrial, updateTrial } from '../lib/trials';
import { THEME } from '../theme';

interface TrialsManagerProps {
  coursecodes: string[];
  onTrialsDirty: () => void;
  onNavigateToSettings: () => void;
  hasImported: boolean;
  isDirty: boolean;
}

type TrialFormState = {
  coursecode: string;
  name: string;
  phone: string;
  count: string;
};

type TrialFormErrors = {
  coursecode?: string;
  name?: string;
  count?: string;
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `trial-${hex}-${Date.now()}`;
  }
  // Fallback (oude browsers zonder Web Crypto): nog steeds uniek genoeg voor niet-veilig gebruik
  return `trial-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function sanitizeCount(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function sortCoursecodes(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }));
}

function useAvailableCoursecodes(coursecodes: string[], trials: Trial[], editingId: string | null) {
  return useMemo(() => {
    const codes = new Set(coursecodes.map((code) => code.trim()).filter(Boolean));
    if (editingId) {
      const editingTrial = trials.find((trial) => trial.id === editingId);
      if (editingTrial) {
        codes.add(editingTrial.coursecode);
      }
    }
    return sortCoursecodes(Array.from(codes));
  }, [coursecodes, editingId, trials]);
}

export function TrialsManager({
  coursecodes,
  onTrialsDirty,
  onNavigateToSettings,
  hasImported,
  isDirty,
}: TrialsManagerProps) {
  const [trials, setTrials] = useState<Trial[]>(() => getAllTrials());
  const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TrialFormState>({
    coursecode: '',
    name: '',
    phone: '',
    count: '0',
  });
  const [formErrors, setFormErrors] = useState<TrialFormErrors>({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const availableCoursecodes = useAvailableCoursecodes(coursecodes, trials, editingTrialId);

  const groupedTrials = useMemo(() => {
    const map = new Map<string, Trial[]>();
    trials.forEach((trial) => {
      const list = map.get(trial.coursecode) ?? [];
      list.push(trial);
      map.set(trial.coursecode, list);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }))
      .map(([code, items]) => ({
        coursecode: code,
        trials: items.sort((a, b) => a.name.localeCompare(b.name, 'nl-NL', { sensitivity: 'base' })),
      }));
  }, [trials]);

  useEffect(() => {
    setTrials(getAllTrials());
  }, []);

  useEffect(() => {
    if (!isDirty) {
      setHasPendingChanges(false);
    }
  }, [isDirty]);

  useEffect(() => {
    if (availableCoursecodes.length === 0) {
      return;
    }
    setFormState((state) => {
      if (state.coursecode && (editingTrialId || availableCoursecodes.includes(state.coursecode))) {
        return state;
      }
      return { ...state, coursecode: availableCoursecodes[0] };
    });
  }, [availableCoursecodes, editingTrialId]);

  const resetForm = () => {
    setFormState((state) => ({ ...state, name: '', phone: '', count: '0', coursecode: state.coursecode }));
    setFormErrors({});
    setEditingTrialId(null);
  };

  const validateForm = (state: TrialFormState): TrialFormErrors => {
    const errors: TrialFormErrors = {};
    if (!state.coursecode.trim()) {
      errors.coursecode = 'Kies een lesnummer.';
    }
    if (!state.name.trim()) {
      errors.name = 'Naam is verplicht.';
    }
    const sanitized = sanitizeCount(state.count);
    if (!Number.isFinite(sanitized) || sanitized < 0) {
      errors.count = 'Aantal proeflessen moet een geheel getal van 0 of hoger zijn.';
    }
    return errors;
  };

  const markDirty = () => {
    setHasPendingChanges(true);
    onTrialsDirty();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const trimmedName = formState.name.trim();
    const trimmedPhone = formState.phone.trim();
    const sanitizedCount = sanitizeCount(formState.count);
    const nowIso = new Date().toISOString();

    if (editingTrialId) {
      const existing = trials.find((trial) => trial.id === editingTrialId);
      if (!existing) {
        resetForm();
        return;
      }
      const updatedTrial: Trial = {
        ...existing,
        coursecode: formState.coursecode.trim(),
        name: trimmedName,
        phone: trimmedPhone ? trimmedPhone : undefined,
        count: sanitizedCount,
        updatedAt: nowIso,
      };
      updateTrial(updatedTrial);
      setTrials(getAllTrials());
      markDirty();
      resetForm();
      return;
    }

    const newTrial: Trial = {
      id: generateId(),
      coursecode: formState.coursecode.trim(),
      name: trimmedName,
      phone: trimmedPhone ? trimmedPhone : undefined,
      count: sanitizedCount,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    addTrial(newTrial);
    setTrials(getAllTrials());
    markDirty();
    resetForm();
  };

  const handleEdit = (trial: Trial) => {
    setEditingTrialId(trial.id);
    setFormState({
      coursecode: trial.coursecode,
      name: trial.name,
      phone: trial.phone ?? '',
      count: String(trial.count),
    });
    setFormErrors({});
  };

  const handleDelete = (trial: Trial) => {
    const confirmed = window.confirm(`Weet je zeker dat je ${trial.name} wilt verwijderen?`);
    if (!confirmed) {
      return;
    }
    removeTrial(trial.id);
    setTrials(getAllTrials());
    if (editingTrialId === trial.id) {
      resetForm();
    }
    markDirty();
  };

  return (
    <section className="card p-6" aria-labelledby="trials-manager-title">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="trials-manager-title" className="card-title">
            Stap 2 · Proeflessers beheren
          </h2>
          <p className="text-sm text-slate-600">
            Voeg proeflessers toe voordat je de presentielijsten bekijkt. Wijzigingen worden zichtbaar na het vernieuwen van de lijsten.
          </p>
        </div>
        {hasPendingChanges && (
          <span className="text-xs font-medium text-amber-700">
            Er zijn wijzigingen in proeflessers sinds de laatste weergave.
          </span>
        )}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="trial-coursecode">
              Lesnummer
            </label>
            <select
              id="trial-coursecode"
              required
              value={formState.coursecode}
              onChange={(event) => setFormState((state) => ({ ...state, coursecode: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring"
            >
              <option value="" disabled>
                Kies een les
              </option>
              {availableCoursecodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                  {!coursecodes.includes(code) ? ' (niet in dataset)' : ''}
                </option>
              ))}
            </select>
            {formErrors.coursecode && (
              <p className="mt-1 text-xs text-red-600">{formErrors.coursecode}</p>
            )}
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="trial-name">
              Naam
            </label>
            <input
              id="trial-name"
              type="text"
              required
              value={formState.name}
              onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring"
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="trial-phone">
              Telefoonnummer (optioneel)
            </label>
            <input
              id="trial-phone"
              type="text"
              value={formState.phone}
              onChange={(event) => setFormState((state) => ({ ...state, phone: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="trial-count">
              Aantal proeflessen gehad
            </label>
            <input
              id="trial-count"
              type="number"
              min={0}
              step={1}
              required
              value={formState.count}
              onChange={(event) => setFormState((state) => ({ ...state, count: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring"
            />
            {formErrors.count && <p className="mt-1 text-xs text-red-600">{formErrors.count}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {editingTrialId && (
            <button type="button" className="secondary-button" onClick={resetForm}>
              Annuleren
            </button>
          )}
          <button type="submit" className="action-button">
            {editingTrialId ? 'Bijwerken' : 'Toevoegen'}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border" style={{ borderColor: THEME.border }}>
        <table className="min-w-full table-auto">
          <thead style={{ backgroundColor: THEME.headerBg, color: THEME.headerText }}>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">Lesnummer</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Naam</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Telefoonnummer</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Aantal proeflessen</th>
              <th className="px-4 py-2 text-right text-sm font-semibold">Acties</th>
            </tr>
          </thead>
          <tbody>
            {groupedTrials.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">
                  Nog geen proeflessers toegevoegd.
                </td>
              </tr>
            ) : (
              groupedTrials.map((group) => (
                <Fragment key={group.coursecode}>
                  {group.trials.map((trial, index) => (
                    <tr key={trial.id} className="border-t" style={{ borderColor: THEME.border }}>
                      {index === 0 && (
                        <td className="px-4 py-2 align-top text-sm font-semibold text-slate-800" rowSpan={group.trials.length}>
                          {group.coursecode}
                        </td>
                      )}
                      <td className="px-4 py-2 text-sm text-slate-800">{trial.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-800">{trial.phone ?? ''}</td>
                      <td className="px-4 py-2 text-sm text-slate-800">{trial.count}</td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="secondary-button" onClick={() => handleEdit(trial)}>
                            Bewerken
                          </button>
                          <button type="button" className="danger-button" onClick={() => handleDelete(trial)}>
                            Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="action-button"
          onClick={onNavigateToSettings}
          disabled={!hasImported}
        >
          Doorgaan naar instellingen
        </button>
      </div>
    </section>
  );
}

export default TrialsManager;
