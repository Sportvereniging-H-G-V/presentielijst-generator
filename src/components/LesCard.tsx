import { useMemo, useState } from 'react';
import { LessonGroup } from '../lib/types';
import { getLessonDateColumns, getMonthName } from '../lib/dates';
import LeidingTable from './LeidingTable';
import LedenTable from './LedenTable';
import { ExportButtons } from './ExportButtons';
import { THEME } from '../theme';
import { Trial } from '../lib/trials';

interface LesCardProps {
  lesson: LessonGroup;
  month: number;
  year: number;
  columnCount: number;
  onExportExcel?: (lesson: LessonGroup) => Promise<void>;
  excelDisabled?: boolean;
  excelDisabledReason?: string;
  trials?: Trial[];
  isDirty?: boolean;
  dirtyReason?: string;
}

export function LesCard({
  lesson,
  month,
  year,
  columnCount,
  onExportExcel,
  excelDisabled = false,
  excelDisabledReason,
  trials = [],
  isDirty = false,
  dirtyReason,
}: LesCardProps) {
  if (lesson.shouldSkip) {
    return null;
  }

  const [collapsed, setCollapsed] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const monthName = getMonthName(month);
  const ledenCount = lesson.leden.filter((person) => !person.isPlaceholder).length;
  const staffCount = lesson.staffOrdered.filter((person) => !person.isPlaceholder).length;
  const title = `Presentielijst ${monthName} ${year} voor lesnummer ${lesson.coursecode}: ${lesson.course} (${ledenCount} leden)`;
  const columnSummary = columnCount === 1 ? '1 lesdag' : `${columnCount} lesdagen`;
  const dateColumns = useMemo(
    () => getLessonDateColumns(month, year, columnCount),
    [month, year, columnCount],
  );

  const handleDownloadExcel = async () => {
    if (!onExportExcel) {
      return;
    }
    try {
      setIsExcelLoading(true);
      await onExportExcel(lesson);
    } catch (error) {
      console.error('Excel-export mislukt', error);
      window.alert('Kon het Excel-bestand niet genereren. Probeer het opnieuw.');
    } finally {
      setIsExcelLoading(false);
    }
  };

  return (
    <article
      className="lesson-card card overflow-hidden"
      aria-labelledby={`lesson-${lesson.coursecode}`}
    >
      <header
        className="flex flex-wrap items-start justify-between gap-4 p-6"
        style={{ backgroundColor: THEME.titleBg, color: THEME.titleText }}
      >
        <div className="space-y-1">
          <h3 id={`lesson-${lesson.coursecode}`} className="text-xl font-semibold">
            {title}
          </h3>
          <p className="text-sm opacity-80">
            {staffCount} leiding · {ledenCount} leden · {columnSummary}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            className="action-button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-controls={`lesson-body-${lesson.coursecode}`}
          >
            {collapsed ? 'Uitklappen' : 'Inklappen'}
          </button>
          {onExportExcel && (
            <ExportButtons
              onExportExcel={handleDownloadExcel}
              isExcelDisabled={excelDisabled}
              excelDisabledReason={excelDisabledReason}
              isExcelLoading={isExcelLoading}
              isDirty={isDirty}
              dirtyReason={dirtyReason}
            />
          )}
        </div>
      </header>

      <div
        id={`lesson-body-${lesson.coursecode}`}
        hidden={collapsed}
        className="space-y-6 p-6"
      >
        <LeidingTable
          staffOrdered={lesson.staffOrdered}
          coursecode={lesson.coursecode}
          columnCount={columnCount}
          dateColumns={dateColumns}
        />
        <LedenTable
          records={lesson.leden}
          coursecode={lesson.coursecode}
          columnCount={columnCount}
          dateColumns={dateColumns}
          trials={trials}
        />
      </div>
    </article>
  );
}

export default LesCard;
