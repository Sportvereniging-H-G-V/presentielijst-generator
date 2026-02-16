import { Fragment, type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { LessonDateColumn } from '../lib/dates';
import { NormalizedRecord } from '../lib/types';
import { THEME } from '../theme';

interface ParticipantsSection {
  id: string;
  title?: string;
  records: NormalizedRecord[];
}

interface ParticipantsTableProps {
  title: string;
  coursecode: string;
  columnCount: number;
  dateColumns: LessonDateColumn[];
  sections: ParticipantsSection[];
  extraRows?: NormalizedRecord[];
  formatPhones: (record: NormalizedRecord) => string;
  getNameClassName?: (record: NormalizedRecord) => string;
  renderNameContent?: (record: NormalizedRecord) => ReactNode;
  renderPhoneContent?: (record: NormalizedRecord, formattedPhone: string) => ReactNode;
}

const DEFAULT_DATE_LABEL = 'Datum';

function createPresenceKey(coursecode: string, name: string, isoDate: string): string {
  const trimmedCoursecode = coursecode.trim() || 'onbekend';
  const trimmedName = name.trim();
  if (!trimmedName || !isoDate) {
    return '';
  }
  return `presence:${trimmedCoursecode}:${trimmedName}:${isoDate}`;
}

function formatReadableDate(isoDate: string): string {
  const safeIso = `${isoDate}T00:00:00Z`;
  const parsed = new Date(safeIso);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function PresenceControl({
  coursecode,
  name,
  isoDate,
}: {
  coursecode: string;
  name: string;
  isoDate: string;
}) {
  const storageKey = useMemo(() => createPresenceKey(coursecode, name, isoDate), [coursecode, name, isoDate]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setChecked(false);
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    setChecked(stored === '1');
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      return;
    }
    if (checked) {
      window.localStorage.setItem(storageKey, '1');
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [checked, storageKey]);

  if (!storageKey) {
    return null;
  }

  const ariaLabel = `Aanwezigheid ${name.trim()} op ${formatReadableDate(isoDate)}`;

  return (
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
      aria-label={ariaLabel}
    />
  );
}

export function ParticipantsTable({
  title,
  coursecode,
  columnCount,
  dateColumns,
  sections,
  extraRows = [],
  formatPhones,
  getNameClassName,
  renderNameContent,
  renderPhoneContent,
}: ParticipantsTableProps) {
  const tableStyle: CSSProperties = {
    '--table-border-color': THEME.border,
    '--table-header-bg': THEME.headerBg,
    '--table-header-text': THEME.headerText,
  } as CSSProperties;

  const effectiveDateColumns = useMemo(() => {
    const safeCount = Math.max(0, Math.floor(columnCount));
    const trimmed = dateColumns.slice(0, safeCount);
    if (trimmed.length === safeCount) {
      return trimmed;
    }
    const missing = safeCount - trimmed.length;
    const fillers = Array.from({ length: missing }, () => ({
      isoDate: '',
      label: DEFAULT_DATE_LABEL,
    }));
    return [...trimmed, ...fillers];
  }, [columnCount, dateColumns]);

  const totalColumns = 4 + effectiveDateColumns.length;
  const totalRecords =
    sections.reduce((sum, section) => sum + section.records.length, 0) + extraRows.length;

  return (
    <section
      className="overflow-hidden rounded-lg border bg-white"
      style={{ borderColor: THEME.border }}
    >
      <div
        className="px-4 py-2 text-base font-semibold"
        style={{ backgroundColor: THEME.sectionHeaderBg, color: THEME.sectionHeaderText }}
      >
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="table-grid min-w-full" style={tableStyle}>
          <thead>
            <tr>
              <th scope="col" className="text-left">Naam</th>
              <th scope="col" className="text-left">Telefoonnummer(s)</th>
              <th scope="col">Geb. datum</th>
              <th scope="col">Foto</th>
              {effectiveDateColumns.map((column, index) => (
                <th key={`${coursecode}-col-${index}`} scope="col">
                  {column.label || DEFAULT_DATE_LABEL}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const hasRecords = section.records.length > 0;
              return (
                <Fragment key={section.id}>
                  {section.title && hasRecords && (
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={totalColumns}
                        className="bg-slate-100 px-4 py-2 text-left text-sm font-semibold"
                        style={{
                          backgroundColor: THEME.sectionHeaderBg,
                          color: THEME.sectionHeaderText,
                        }}
                      >
                        {section.title}
                      </th>
                    </tr>
                  )}
                  {section.records.map((person, personIndex) => {
                    const rowKey = `${section.id}-${coursecode}-${personIndex}`;
                    const phoneDisplay = (() => {
                      const formatted = formatPhones(person);
                      if (formatted) {
                        return formatted;
                      }
                      return '';
                    })();
                    const nameContent = renderNameContent?.(person) ?? person.name;
                    const phoneContent = renderPhoneContent?.(person, phoneDisplay) ?? phoneDisplay;
                    const birthdateDisplay =
                      person.birthdate ?? person.birthdateRaw ?? (person.isPlaceholder ? '' : '—');
                    const nameClassName =
                      getNameClassName?.(person) ?? 'font-medium text-slate-800';
                    const trimmedName = person.name.trim();
                    return (
                      <tr key={rowKey}>
                        <td className={nameClassName}>{nameContent}</td>
                        <td className="whitespace-nowrap text-slate-800">{phoneContent}</td>
                        <td className="text-center">{birthdateDisplay}</td>
                        <td className="text-center">{person.secretImagesFlag ? 'Nee' : ''}</td>
                        {effectiveDateColumns.map((column, index) => {
                          const shouldRenderPresence =
                            Boolean(column.isoDate) &&
                            !person.isPlaceholder &&
                            trimmedName.length > 0;
                          return (
                            <td key={`${rowKey}-col-${index}`} className="text-center">
                              {shouldRenderPresence ? (
                                <PresenceControl
                                  coursecode={coursecode}
                                  name={trimmedName}
                                  isoDate={column.isoDate}
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {extraRows.map((person, personIndex) => {
              const rowKey = `extra-${coursecode}-${personIndex}`;
              const phoneDisplay = (() => {
                const formatted = formatPhones(person);
                if (formatted) {
                  return formatted;
                }
                return '';
              })();
              const nameContent = renderNameContent?.(person) ?? person.name;
              const phoneContent = renderPhoneContent?.(person, phoneDisplay) ?? phoneDisplay;
              const birthdateDisplay =
                person.birthdate ?? person.birthdateRaw ?? (person.isPlaceholder ? '' : '—');
              const nameClassName = getNameClassName?.(person) ?? 'font-medium text-slate-800';
              const trimmedName = person.name.trim();
              return (
                <tr key={rowKey}>
                  <td className={nameClassName}>{nameContent}</td>
                  <td className="whitespace-nowrap text-slate-800">{phoneContent}</td>
                  <td className="text-center">{birthdateDisplay}</td>
                  <td className="text-center">{person.secretImagesFlag ? 'Nee' : ''}</td>
                  {effectiveDateColumns.map((column, index) => {
                    const shouldRenderPresence =
                      Boolean(column.isoDate) &&
                      !person.isPlaceholder &&
                      trimmedName.length > 0;
                    return (
                      <td key={`${rowKey}-col-${index}`} className="text-center">
                        {shouldRenderPresence ? (
                          <PresenceControl
                            coursecode={coursecode}
                            name={trimmedName}
                            isoDate={column.isoDate}
                          />
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {totalRecords === 0 && (
              <tr>
                <td colSpan={totalColumns} className="py-4 text-center text-sm text-slate-500">
                  Geen personen in deze sectie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
