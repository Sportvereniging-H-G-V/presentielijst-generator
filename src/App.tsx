import { useEffect, useMemo, useState } from 'react';
import ImportPanel from './components/ImportPanel';
import SettingsBar from './components/SettingsBar';
import LesCard from './components/LesCard';
import TrialsManager from './components/TrialsManager';
import {
  ColumnMapping,
  EmptyLessonWarning,
  LessonGroup,
  LessonTrainerIssue,
  NormalizedRecord,
} from './lib/types';
import { groupByLesson } from './lib/group';
import { ExportButtons } from './components/ExportButtons';
import { downloadAllLessonsZip, downloadLessonExcel, downloadPerLeaderZip } from './lib/excel';
import { clampColumnCount } from './lib/columns';
import Footer from './components/Footer';
import { getTrials, Trial } from './lib/trials';

const COLUMN_COUNT_STORAGE_KEY = 'plist:columns:n';
const MONTH_STORAGE_KEY = 'plist:settings:month';
const YEAR_STORAGE_KEY = 'plist:settings:year';
const DEFAULT_COLUMN_COUNT = 4;
const DIRTY_DOWNLOAD_MESSAGE = 'Lijsten gewijzigd — klik \'Lijsten vernieuwen\'.';

type MonthValue = number | '';
type YearValue = number | '';

function loadStoredColumnCount(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_COLUMN_COUNT;
  }
  const raw = window.localStorage.getItem(COLUMN_COUNT_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isNaN(parsed)) {
    return DEFAULT_COLUMN_COUNT;
  }
  return clampColumnCount(parsed);
}

function loadStoredMonth(): MonthValue {
  if (typeof window === 'undefined') {
    return '';
  }
  const raw = window.localStorage.getItem(MONTH_STORAGE_KEY);
  if (!raw) {
    return '';
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
    return '';
  }
  return parsed;
}

function loadStoredYear(): YearValue {
  if (typeof window === 'undefined') {
    return '';
  }
  const raw = window.localStorage.getItem(YEAR_STORAGE_KEY);
  if (!raw) {
    return '';
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return '';
  }
  return parsed;
}

function App() {
  const [month, setMonth] = useState<MonthValue>(() => loadStoredMonth());
  const [year, setYear] = useState<YearValue>(() => loadStoredYear());
  const [columnCount, setColumnCount] = useState(() => loadStoredColumnCount());
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [trainerWarnings, setTrainerWarnings] = useState<LessonTrainerIssue[]>([]);
  const [emptyLessonWarnings, setEmptyLessonWarnings] = useState<EmptyLessonWarning[]>([]);
  const [importFeedbackMessages, setImportFeedbackMessages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAllExcelLoading, setIsAllExcelLoading] = useState(false);
  const [isPerLeaderLoading, setIsPerLeaderLoading] = useState(false);
  const [trialsRefreshCounter, setTrialsRefreshCounter] = useState(0);
  const [hasImported, setHasImported] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [trialsDirty, setTrialsDirty] = useState(false);
  const [isSettingsStepActive, setIsSettingsStepActive] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [appliedSettings, setAppliedSettings] = useState<{
    month: MonthValue;
    year: YearValue;
    columnCount: number;
  }>(() => ({ month: '', year: '', columnCount: loadStoredColumnCount() }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(COLUMN_COUNT_STORAGE_KEY, String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (month === '') {
      window.localStorage.removeItem(MONTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(MONTH_STORAGE_KEY, String(month));
    }
  }, [month]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (year === '') {
      window.localStorage.removeItem(YEAR_STORAGE_KEY);
    } else {
      window.localStorage.setItem(YEAR_STORAGE_KEY, String(year));
    }
  }, [year]);

  useEffect(() => {
    if (!showLists) {
      setSettingsDirty(false);
      return;
    }
    if (
      appliedSettings.month !== month ||
      appliedSettings.year !== year ||
      appliedSettings.columnCount !== columnCount
    ) {
      setSettingsDirty(true);
    }
  }, [appliedSettings, columnCount, month, showLists, year]);

  const { lessons, emptyLessons } = useMemo(() => groupByLesson(records), [records]);
  useEffect(() => {
    setEmptyLessonWarnings(emptyLessons);
  }, [emptyLessons]);
  const coursecodes = useMemo(() => lessons.map((lesson) => lesson.coursecode), [lessons]);

  const visibleLessons = useMemo(
    () => lessons.filter((lesson) => !lesson.shouldSkip),
    [lessons],
  );

  const hasLeaderRecords = useMemo(
    () =>
      visibleLessons.some((lesson) =>
        lesson.staffOrdered.some(
          (person) =>
            person.roleCategory === 'leiding' &&
            !person.isPlaceholder &&
            person.name.trim().length > 0,
        ),
      ),
    [visibleLessons],
  );

  const filteredLessons = useMemo(() => {
    if (!searchTerm.trim()) {
      return visibleLessons;
    }
    const term = searchTerm.toLowerCase();
    return visibleLessons.filter(
      (lesson) =>
        lesson.coursecode.toLowerCase().includes(term) ||
        lesson.course.toLowerCase().includes(term),
    );
  }, [visibleLessons, searchTerm]);

  const trialsByCoursecode = useMemo(() => {
    const map = new Map<string, Trial[]>();
    if (typeof window === 'undefined') {
      return map;
    }
    lessons.forEach((lesson) => {
      map.set(lesson.coursecode, getTrials(lesson.coursecode));
    });
    return map;
  }, [lessons, trialsRefreshCounter]);

  const trainerWarningMessage = useMemo(() => {
    if (trainerWarnings.length === 0) {
      return undefined;
    }
    const codes = Array.from(
      new Set(
        trainerWarnings
          .map((warning) => warning.coursecode.trim())
          .filter((code) => code.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }));
    const codeLabel = codes.length > 0 ? codes.join(', ') : 'onbekend';
    return `Waarschuwing: In het CSV-bestand zijn trainers gevonden (lescodes: ${codeLabel}). Deze zijn voorlopig als leiding verwerkt, maar pas dit aan in AllUnited.`;
  }, [trainerWarnings]);

  const shouldShowImportSummary =
    hasImported &&
    (importFeedbackMessages.length > 0 || Boolean(trainerWarningMessage) || emptyLessonWarnings.length > 0);

  const isDirty = trialsDirty || settingsDirty;
  const listsVisible = hasImported && showLists;

  const monthNumber = typeof month === 'number' ? month : undefined;
  const yearNumber = typeof year === 'number' ? year : undefined;

  const handleTrialsDirtyChange = () => {
    setTrialsDirty(true);
  };

  const handleRebuildLists = () => {
    if (!monthNumber || !yearNumber) {
      return;
    }
    setTrialsRefreshCounter((value) => value + 1);
    setTrialsDirty(false);
    setSettingsDirty(false);
    setShowLists(true);
    setAppliedSettings({ month, year, columnCount });
  };

  const handleImport = (
    normalized: NormalizedRecord[],
    _mapping: ColumnMapping,
    detectedTrainerWarnings: LessonTrainerIssue[],
  ) => {
    setRecords(normalized);
    setTrainerWarnings(detectedTrainerWarnings);
    setImportFeedbackMessages(['Data succesvol geïmporteerd. Ga door naar de proeflessers in stap 2.']);
    setHasImported(true);
    setIsSettingsStepActive(false);
    setShowLists(false);
    setTrialsDirty(false);
    setSettingsDirty(false);
    setAppliedSettings({ month, year, columnCount });
    setEmptyLessonWarnings(emptyLessons);
  };

  const handleImportPreviewReady = () => {
    setImportFeedbackMessages([]);
    setTrainerWarnings([]);
    setEmptyLessonWarnings([]);
  };

  const handleLessonExcelDownload = async (lesson: LessonGroup) => {
    if (!listsVisible || !monthNumber || !yearNumber) {
      return;
    }
    try {
      await downloadLessonExcel(lesson, monthNumber, yearNumber, columnCount);
    } catch (error) {
      console.error('Excel-export mislukt', error);
      throw error;
    }
  };

  const handleDownloadAllExcel = async () => {
    if (!listsVisible || !monthNumber || !yearNumber || visibleLessons.length === 0) {
      return;
    }
    try {
      setIsAllExcelLoading(true);
      await downloadAllLessonsZip(visibleLessons, monthNumber, yearNumber, columnCount);
    } catch (error) {
      console.error('ZIP-export mislukt', error);
      window.alert('Kon het ZIP-bestand niet genereren. Probeer het opnieuw.');
    } finally {
      setIsAllExcelLoading(false);
    }
  };

  const handleDownloadPerLeaderZip = async () => {
    if (!listsVisible || !monthNumber || !yearNumber || visibleLessons.length === 0 || !hasLeaderRecords) {
      return;
    }
    try {
      setIsPerLeaderLoading(true);
      await downloadPerLeaderZip(visibleLessons, monthNumber, yearNumber, columnCount);
    } catch (error) {
      console.error('ZIP-export per leiding mislukt', error);
      window.alert('Kon het ZIP-bestand niet genereren. Probeer het opnieuw.');
    } finally {
      setIsPerLeaderLoading(false);
    }
  };

  const excelDisabled = !listsVisible || visibleLessons.length === 0 || isDirty;
  const excelDisabledReason = (() => {
    if (!listsVisible) {
      if (!hasImported) {
        return 'Importeer eerst gegevens.';
      }
      if (!monthNumber || !yearNumber) {
        return 'Stel maand en jaar in en klik op “Toon presentielijsten”.';
      }
      return 'Klik op “Toon presentielijsten” om de lijsten te bekijken.';
    }
    if (visibleLessons.length === 0) {
      return 'Geen lessen met leden gevonden in de gegevens.';
    }
    if (isDirty) {
      return DIRTY_DOWNLOAD_MESSAGE;
    }
    return undefined;
  })();

  const perLeaderDisabled = excelDisabled || !hasLeaderRecords;
  const perLeaderDisabledReason = (() => {
    if (!listsVisible) {
      return excelDisabledReason;
    }
    if (visibleLessons.length === 0) {
      return 'Geen lessen met leden gevonden in de gegevens.';
    }
    if (!hasLeaderRecords) {
      return 'Geen leiding gevonden in de lessen met leden.';
    }
    if (isDirty) {
      return DIRTY_DOWNLOAD_MESSAGE;
    }
    return undefined;
  })();

  const scrollToId = (id: string) => {
    if (typeof document === 'undefined') {
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShowListsClick = () => {
    handleRebuildLists();
  };

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Presentielijst Generator</h1>
          <p className="text-sm text-slate-600">
            Volg de drie stappen om presentielijsten te genereren. Alle gegevens blijven lokaal in de browser opgeslagen.
          </p>
        </header>

        <div id="import" />
        <ImportPanel
          onImport={handleImport}
          onPreviewReady={handleImportPreviewReady}
        />

        {shouldShowImportSummary && (
          <div className="no-print space-y-4">
            {importFeedbackMessages.length > 0 && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <ul className="list-disc pl-5">
                  {importFeedbackMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {trainerWarningMessage && (
              <div
                className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                role="alert"
                aria-live="assertive"
              >
                <p>{trainerWarningMessage}</p>
              </div>
            )}
            {emptyLessonWarnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Lessen zonder leden worden niet getoond.</p>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  {emptyLessonWarnings.map((lesson, index) => {
                    const hasCourse = lesson.course && lesson.course.trim().length > 0;
                    const lessonLabel = hasCourse ? `${lesson.coursecode}: ${lesson.course}` : lesson.coursecode;
                    return (
                      <li key={`${lesson.coursecode}-${index}`}>
                        Les {lessonLabel} bevat alleen leiding en geen leden. Deze presentielijst is niet getoond.
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <div id="trials" />
        {hasImported && (
          <TrialsManager
            coursecodes={coursecodes}
            onTrialsDirty={handleTrialsDirtyChange}
            onNavigateToSettings={() => {
              setIsSettingsStepActive(true);
              scrollToId('settings');
            }}
            hasImported={hasImported}
            isDirty={trialsDirty}
          />
        )}

        <div id="settings" />
        {hasImported && isSettingsStepActive && (
          <SettingsBar
            month={month}
            year={year}
            searchTerm={searchTerm}
            columnCount={columnCount}
            hasImported={hasImported}
            showLists={showLists}
            onMonthChange={(value) => {
              setMonth(value);
            }}
            onYearChange={(value) => {
              setYear(value);
            }}
            onColumnCountChange={(value) => {
              const clamped = clampColumnCount(value);
              setColumnCount(clamped);
              if (showLists) {
                setSettingsDirty(true);
              }
            }}
            onSearchChange={setSearchTerm}
            onShowLists={handleShowListsClick}
            canShowLists={hasImported && monthNumber !== undefined && yearNumber !== undefined && !isDirty}
            isShowButtonDisabled={!hasImported || !monthNumber || !yearNumber}
          />
        )}

        {listsVisible && isDirty && (
          <div className="sticky top-0 z-20">
            <div className="mx-auto max-w-6xl rounded-md border border-amber-200 bg-amber-100 px-4 py-3 text-amber-900 shadow">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-medium">
                  Je hebt wijzigingen. Klik Lijsten vernieuwen om de presentielijsten bij te werken.
                </p>
                <button type="button" className="action-button self-start md:self-auto" onClick={handleRebuildLists}>
                  Lijsten vernieuwen
                </button>
              </div>
            </div>
          </div>
        )}

        {listsVisible ? (
          <section className="card no-print p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="card-title">Downloads</h2>
                <p className="text-sm text-slate-600">
                  Download de presentielijsten per les als Excel-bestand of verzamel alle lessen in één ZIP.
                </p>
              </div>
              <ExportButtons
                onExportAllExcel={handleDownloadAllExcel}
                isAllExcelDisabled={excelDisabled}
                allExcelDisabledReason={excelDisabledReason}
                isAllExcelLoading={isAllExcelLoading}
                onExportByLeaderZip={handleDownloadPerLeaderZip}
                isByLeaderDisabled={perLeaderDisabled}
                byLeaderDisabledReason={perLeaderDisabledReason}
                isByLeaderLoading={isPerLeaderLoading}
                isDirty={isDirty}
                dirtyReason={DIRTY_DOWNLOAD_MESSAGE}
              />
            </div>
          </section>
        ) : hasImported ? (
          <section className="card p-6 text-center text-sm text-slate-600">
            Stel maand, jaar en aantal lesdagen in en klik op “Toon presentielijsten” om de lijsten te bekijken.
          </section>
        ) : (
          <section className="card p-6 text-center text-sm text-slate-600">
            Start bij stap 1: importeer een CSV-export uit AllUnited.
          </section>
        )}

        {listsVisible && (
          filteredLessons.length === 0 ? (
            <section className="card p-6 text-center text-sm text-slate-600">
              Geen lessen gevonden die overeenkomen met je zoekopdracht.
            </section>
          ) : (
            <div className="space-y-6">
              {filteredLessons.map((lesson) => (
                <LesCard
                  key={lesson.coursecode}
                  lesson={lesson}
                  month={monthNumber ?? 1}
                  year={yearNumber ?? new Date().getFullYear()}
                  columnCount={columnCount}
                  onExportExcel={handleLessonExcelDownload}
                  excelDisabled={excelDisabled}
                  excelDisabledReason={excelDisabledReason}
                  trials={trialsByCoursecode.get(lesson.coursecode) ?? []}
                  isDirty={isDirty}
                  dirtyReason={DIRTY_DOWNLOAD_MESSAGE}
                />
              ))}
            </div>
          )
        )}
      </div>
      <Footer />
    </>
  );
}

export default App;
