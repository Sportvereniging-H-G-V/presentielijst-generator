import { FIELD_LABELS } from '../lib/mapping';
import { ColumnMapping } from '../lib/types';

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  required: (keyof ColumnMapping)[];
  onChange: (field: keyof ColumnMapping, column: string | undefined) => void;
}

const EMPTY_OPTION = '— niet gekoppeld —';

export function ColumnMapper({ headers, mapping, required, onChange }: ColumnMapperProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => {
        const isRequired = required.includes(field);
        return (
          <label key={field} className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">
              {FIELD_LABELS[field]}
              {isRequired && <span className="text-red-600"> *</span>}
            </span>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={mapping[field] ?? EMPTY_OPTION}
              onChange={(event) => {
                const value = event.target.value;
                onChange(field, value === EMPTY_OPTION ? undefined : value);
              }}
            >
              <option value={EMPTY_OPTION}>{EMPTY_OPTION}</option>
              {headers.map((header) => (
                <option key={`${field}-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

export default ColumnMapper;
