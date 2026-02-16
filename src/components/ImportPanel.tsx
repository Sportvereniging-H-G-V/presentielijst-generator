import { useMemo, useState } from 'react';
import { parseCsvFromFile, parseCsvFromString } from '../lib/csv';
import type { CsvParseError, ParsedRow } from '../lib/csv';
import { ColumnMapping, EmptyLessonWarning, LessonTrainerIssue, NormalizedRecord } from '../lib/types';
import { ColumnMapper } from './ColumnMapper';
import {
  FIELD_LABELS,
  normalizeRecords,
  REQUIRED_FIELDS,
  resolveMapping,
  type NormalizationResult,
} from '../lib/mapping';

function shouldShowMappingDebug(): boolean {
  if (!import.meta.env.PROD) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === 'map';
}

function formatMissingFieldMessage(fields: (keyof ColumnMapping)[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field] ?? field);
  return `Het bestand mist de verplichte kolommen: ${labels.join(', ')}.`;
}

const demoDataUrl = new URL('../demo/demo.csv', import.meta.url).href;

interface ImportPanelProps {
  onImport: (records: NormalizedRecord[], mapping: ColumnMapping, trainerWarnings: LessonTrainerIssue[]) => void;
  onPreviewReady?: () => void;
}

export function ImportPanel({ onImport, onPreviewReady }: ImportPanelProps) {
  const isMappingDebug = shouldShowMappingDebug();
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [messages, setMessages] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [incompleteWarnings, setIncompleteWarnings] = useState<CsvParseError[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMappingVisible, setIsMappingVisible] = useState(false);

  const resetFeedback = () => {
    setMessages([]);
    setErrors([]);
    setIncompleteWarnings([]);
    setImportWarnings([]);
  };

  const formatParseError = (error: CsvParseError): string => {
    const rowNumber = typeof error.row === 'number' && error.row >= 0 ? error.row + 2 : undefined;
    const prefix = rowNumber ? `Rij ${rowNumber}: ` : '';
    return `${prefix}${error.message}`;
  };

  const handleParsed = (result: Awaited<ReturnType<typeof parseCsvFromString>>) => {
    setRawRows(result.data);
    setHeaders(result.fields);
    const resolvedMapping = result.mapping ?? resolveMapping(result.fields).mapping;
    const missing = result.missingRequiredFields ?? resolveMapping(result.fields).missing;
    setMapping(resolvedMapping);
    onPreviewReady?.();
    setMessages([
      `${result.data.length} rijen ingelezen. Klik op "Doorgaan naar proeflessers" om de gegevens toe te passen.`,
    ]);

    const nonTooFewErrors = result.errors.filter((error) => error.code !== 'TooFewFields');
    const missingMessages = missing.length > 0 ? [formatMissingFieldMessage(missing)] : [];
    setErrors([...nonTooFewErrors.map(formatParseError), ...missingMessages]);

    const dedupedWarnings: CsvParseError[] = [];
    const seenRows = new Set<number>();
    result.incompleteFieldErrors.forEach((warning) => {
      const rowValue = typeof warning.row === 'number' ? warning.row : undefined;
      if (rowValue === undefined || !seenRows.has(rowValue)) {
        dedupedWarnings.push(warning);
        if (rowValue !== undefined) {
          seenRows.add(rowValue);
        }
      }
    });
    setIncompleteWarnings(dedupedWarnings);
  };

  const parseFromFile = async (file: File) => {
    resetFeedback();
    try {
      setIsLoading(true);
      const result = await parseCsvFromFile(file);
      handleParsed(result);
    } catch (error) {
      setErrors(['Kon het bestand niet inlezen. Controleer of het een geldig CSV-bestand is.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseFromFile(file);
      event.target.value = '';
    }
  };

  const runImport = (): boolean => {
    if (!rawRows.length) {
      setErrors(['Er zijn nog geen gegevens ingelezen.']);
      return false;
    }
    if (missingRequiredFields.length > 0) {
      setErrors([formatMissingFieldMessage(missingRequiredFields)]);
      return false;
    }
    const normalization: NormalizationResult = normalizeRecords(rawRows, mapping);
    if (normalization.records.length === 0) {
      setErrors(['Na normalisatie bleven er geen geldige rijen over. Controleer de brondata.']);
      return false;
    }
    onImport(normalization.records, mapping, normalization.trainerWarnings);
    setImportWarnings(normalization.warnings);
    setMessages([]);
    setErrors([]);
    return true;
  };

  const loadDemo = async () => {
    resetFeedback();
    try {
      setIsLoading(true);
      const response = await fetch(demoDataUrl);
      const text = await response.text();
      const result = await parseCsvFromString(text);
      handleParsed(result);
      setMessages(['Demogegevens geladen. Klik op "Doorgaan naar proeflessers" om ze te gebruiken.']);
    } catch (error) {
      setErrors(['Demogegevens konden niet geladen worden.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    const success = runImport();
    if (!success) {
      return;
    }
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById('trials')?.scrollIntoView({ behavior: 'smooth' });
  };

  const missingRequiredFields = useMemo(() => {
    return REQUIRED_FIELDS.filter((field) => {
      const column = mapping[field];
      return !column || !headers.includes(column);
    });
  }, [headers, mapping]);

  const mappingStatusMessage = missingRequiredFields.length
    ? `Veldkoppelingen onvolledig: ${missingRequiredFields
        .map((field) => FIELD_LABELS[field] ?? field)
        .join(', ')}`
    : 'Veldkoppelingen compleet';

  const mappingStatusClass = missingRequiredFields.length
    ? 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900'
    : 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900';

  return (
    <>
      <section className="card no-print p-6" aria-labelledby="help-heading">
        <h2 id="help-heading" className="card-title">
          Hoe werkt dit?
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Open in AllUnited de selectie-wizard “112 Presentielijst export voor App” bij lessen of presentie.</li>
          <li>Controleer dat beide groepen aangevinkt zijn.</li>
          <li>Geef de juiste peildatum op en klik op ververs.</li>
          <li>Zet de waarde bij “een download bestand” op “Puntkomma / waarde” en download het bestand.</li>
          <li>Upload het CSV-bestand hier.</li>
          <li>Importeer de gegevens en controleer de meldingen.</li>
          <li>Beheer proeflessers (voeg ze toe per lesnummer).</li>
          <li>Stel Maand, Jaar en Aantal lesdagen in en klik Toon presentielijsten.</li>
          <li>Download per les een Excel-presentielijst of alle lessen als ZIP.</li>
        </ol>
        <ul className="mt-4 space-y-1 text-xs text-slate-600">
          <li>Leden/Leiding worden automatisch herkend.</li>
          <li>Ontbrekende velden worden als leeg aangevuld; controleer de meldingen voor waarschuwingen.</li>
          <li>Alles draait lokaal in de browser (geen netwerkverkeer).</li>
        </ul>
      </section>

      <section className="card no-print p-6" aria-labelledby="import-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="import-heading" className="card-title">
              Stap 1 · Gegevens importeren
            </h2>
            <p className="text-sm text-slate-600">
              Upload het AllUnited CSV-bestand en importeer de gegevens.
            </p>
          </div>
          <button type="button" className="action-button" onClick={loadDemo} disabled={isLoading}>
            Demo laden
          </button>
        </div>

        <div className="mt-6">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-medium">Upload CSV-bestand (AllUnited export)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="rounded-md border border-dashed border-slate-400 bg-white px-3 py-4 text-sm"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {messages.length > 0 && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <ul className="list-disc pl-5">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {importWarnings.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ul className="list-disc pl-5">
              {importWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ul className="list-disc pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {incompleteWarnings.length > 0 && (!isMappingDebug || !isMappingVisible) && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>Er zijn {incompleteWarnings.length} rijen met onvolledige velden; lege waarden zijn aangevuld.</p>
          </div>
        )}

        {headers.length > 0 && (
          <div className="mt-6 space-y-6">
            {isMappingDebug && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setIsMappingVisible((value) => !value)}
                    aria-expanded={isMappingVisible}
                    aria-controls="mapping-panel"
                  >
                    Veldkoppelingen en voorbeeld tonen/verbergen
                  </button>
                  {!isMappingVisible && (
                    <span className={mappingStatusClass}>{mappingStatusMessage}</span>
                  )}
                </div>

                {isMappingVisible && (
                  <div id="mapping-panel" className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Veldkoppeling</h3>
                      <ColumnMapper
                        headers={headers}
                        mapping={mapping}
                        required={REQUIRED_FIELDS}
                        onChange={(field, column) => setMapping((prev) => ({ ...prev, [field]: column }))}
                      />
                      {(() => {
                        const functionColumn = mapping.function;
                        const columnMissing = !functionColumn || !headers.includes(functionColumn);
                        const columnEmpty =
                          !columnMissing && rawRows.every((row) => !String(row[functionColumn!] ?? '').trim());
                        if (columnMissing) {
                          return (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                              Kolom ‘function’ ontbreekt; iedereen wordt als lid beschouwd zolang deze niet gekoppeld is.
                            </p>
                          );
                        }
                        if (columnEmpty) {
                          return (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                              Kolom ‘function’ bevat geen waarden. Personen zonder rol worden als lid ingedeeld.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Voorbeeld (eerste 10 rijen)</h3>
                      {incompleteWarnings.length > 0 && (
                        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          <p>
                            Er zijn {incompleteWarnings.length} rijen met onvolledige velden; lege waarden zijn aangevuld.
                          </p>
                          <ul className="mt-2 space-y-1">
                            {incompleteWarnings.slice(0, 5).map((warning) => {
                              const rowNumber =
                                typeof warning.row === 'number' && warning.row >= 0 ? warning.row + 2 : undefined;
                              return (
                                <li key={`${warning.code}-${warning.row}-${warning.message}`}>
                                  {rowNumber ? `Rij ${rowNumber}` : 'Rij onbekend'}: {warning.message}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="overflow-auto rounded-md border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              {headers.map((header) => (
                                <th key={header} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-700">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {rawRows.slice(0, 10).map((row, rowIndex) => (
                              <tr key={`preview-${rowIndex}`}>
                                {headers.map((header) => (
                                  <td key={`${rowIndex}-${header}`} className="whitespace-nowrap px-3 py-1 text-slate-600">
                                    {row[header] ?? ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" className="action-button" onClick={handleContinue} disabled={isLoading}>
            Doorgaan naar proeflessers
          </button>
        </div>
      </section>
    </>
  );
}

export default ImportPanel;
