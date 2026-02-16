import { clampColumnCount } from '../lib/columns';

type MonthValue = number | '';
type YearValue = number | '';

interface SettingsBarProps {
  month: MonthValue;
  year: YearValue;
  searchTerm: string;
  columnCount: number;
  hasImported: boolean;
  showLists: boolean;
  onMonthChange: (month: MonthValue) => void;
  onYearChange: (year: YearValue) => void;
  onColumnCountChange: (columns: number) => void;
  onSearchChange: (value: string) => void;
  onShowLists: () => void;
  canShowLists: boolean;
  isShowButtonDisabled: boolean;
}

function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const dynamicYears = [currentYear - 1, currentYear, currentYear + 1].filter((value, index, array) => {
    return Number.isFinite(value) && array.indexOf(value) === index;
  });
  if (dynamicYears.length === 3) {
    return dynamicYears;
  }
  return [2024, 2025, 2026];
}

export function SettingsBar({
  month,
  year,
  searchTerm,
  columnCount,
  hasImported,
  showLists,
  onMonthChange,
  onYearChange,
  onColumnCountChange,
  onSearchChange,
  onShowLists,
  canShowLists,
  isShowButtonDisabled,
}: SettingsBarProps) {
  const monthId = 'settings-month';
  const yearId = 'settings-year';
  const searchId = 'settings-search';
  const columnId = 'settings-columns';
  const years = getYearOptions();

  return (
    <section className="card no-print p-6" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="card-title">
        Stap 3 · Instellingen
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Kies maand en jaar voor de presentielijsten, stel het aantal lesdagen in en filter optioneel op lesnummer of naam.
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={monthId}>
          <span className="font-medium">Maand</span>
          <select
            id={monthId}
            value={month === '' ? '' : String(month)}
            onChange={(event) => {
              const value = event.target.value;
              onMonthChange(value === '' ? '' : Number(value));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Kies een maand</option>
            <option value={1}>Januari</option>
            <option value={2}>Februari</option>
            <option value={3}>Maart</option>
            <option value={4}>April</option>
            <option value={5}>Mei</option>
            <option value={6}>Juni</option>
            <option value={7}>Juli</option>
            <option value={8}>Augustus</option>
            <option value={9}>September</option>
            <option value={10}>Oktober</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={yearId}>
          <span className="font-medium">Jaar</span>
          <select
            id={yearId}
            value={year === '' ? '' : String(year)}
            onChange={(event) => {
              const value = event.target.value;
              onYearChange(value === '' ? '' : Number(value));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Kies een jaar</option>
            {years.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={searchId}>
          <span className="font-medium">Zoeken op lesnummer of naam</span>
          <input
            id={searchId}
            type="search"
            value={searchTerm}
            placeholder="Filter op coursecode of cursusnaam"
            onChange={(event) => onSearchChange(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={columnId}>
          <span className="font-medium">Aantal lesdagen</span>
          <input
            id={columnId}
            type="number"
            min={1}
            max={40}
            value={columnCount}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isNaN(parsed)) {
                onColumnCountChange(columnCount);
              } else {
                onColumnCountChange(clampColumnCount(parsed));
              }
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          className="action-button"
          onClick={onShowLists}
          disabled={isShowButtonDisabled}
        >
          Toon presentielijsten
        </button>
        {!hasImported && (
          <p className="mt-2 text-xs text-slate-500">Importeer eerst gegevens in stap 1.</p>
        )}
        {hasImported && showLists && !canShowLists && (
          <p className="mt-2 text-xs text-amber-700">
            Je hebt wijzigingen. Klik “Lijsten vernieuwen” om de actuele presentielijsten te bekijken.
          </p>
        )}
      </div>
    </section>
  );
}

export default SettingsBar;
