interface ExportButtonsProps {
  onExportExcel?: () => void | Promise<void>;
  onExportAllExcel?: () => void | Promise<void>;
  isExcelDisabled?: boolean;
  excelDisabledReason?: string;
  isExcelLoading?: boolean;
  isAllExcelDisabled?: boolean;
  allExcelDisabledReason?: string;
  isAllExcelLoading?: boolean;
  className?: string;
  excelLabel?: string;
  allExcelLabel?: string;
  onExportByLeaderZip?: () => void | Promise<void>;
  isByLeaderDisabled?: boolean;
  byLeaderDisabledReason?: string;
  isByLeaderLoading?: boolean;
  byLeaderLabel?: string;
  isDirty?: boolean;
  dirtyReason?: string;
}

const DEFAULT_DIRTY_REASON = "Lijsten gewijzigd — klik 'Lijsten vernieuwen'.";

export function ExportButtons({
  onExportExcel,
  onExportAllExcel,
  onExportByLeaderZip,
  isExcelDisabled = false,
  excelDisabledReason,
  isExcelLoading = false,
  isAllExcelDisabled = false,
  allExcelDisabledReason,
  isAllExcelLoading = false,
  isByLeaderDisabled = false,
  byLeaderDisabledReason,
  isByLeaderLoading = false,
  className = 'flex flex-wrap gap-2',
  excelLabel = 'Download Excel (deze les)',
  allExcelLabel = 'Download alle lessen (ZIP)',
  byLeaderLabel = 'Download per leiding (ZIP)',
  isDirty = false,
  dirtyReason = DEFAULT_DIRTY_REASON,
}: ExportButtonsProps) {
  if (!onExportExcel && !onExportAllExcel && !onExportByLeaderZip) {
    return null;
  }

  const resolveDisabledReason = (disabled: boolean, provided?: string) => {
    if (!disabled) {
      return undefined;
    }
    return provided ?? (isDirty ? dirtyReason : undefined);
  };

  const excelTitle = resolveDisabledReason(isExcelDisabled, excelDisabledReason);
  const allExcelTitle = resolveDisabledReason(isAllExcelDisabled, allExcelDisabledReason);
  const byLeaderTitle = resolveDisabledReason(isByLeaderDisabled, byLeaderDisabledReason);

  return (
    <div className={className}>
      {onExportExcel && (
        <button
          type="button"
          className="action-button"
          onClick={() => void onExportExcel()}
          disabled={isExcelDisabled || isExcelLoading}
          title={excelTitle}
          aria-busy={isExcelLoading}
        >
          {isExcelLoading ? 'Excel wordt gemaakt…' : excelLabel}
        </button>
      )}
      {onExportAllExcel && (
        <button
          type="button"
          className="action-button"
          onClick={() => void onExportAllExcel()}
          disabled={isAllExcelDisabled || isAllExcelLoading}
          title={allExcelTitle}
          aria-busy={isAllExcelLoading}
        >
          {isAllExcelLoading ? 'ZIP wordt opgebouwd…' : allExcelLabel}
        </button>
      )}
      {onExportByLeaderZip && (
        <button
          type="button"
          className="action-button"
          onClick={() => void onExportByLeaderZip()}
          disabled={isByLeaderDisabled || isByLeaderLoading}
          title={byLeaderTitle}
          aria-busy={isByLeaderLoading}
        >
          {isByLeaderLoading ? 'ZIP wordt opgebouwd…' : byLeaderLabel}
        </button>
      )}
    </div>
  );
}

export default ExportButtons;
