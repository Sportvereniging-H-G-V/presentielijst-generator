import type { LessonDateColumn } from '../lib/dates';
import { NormalizedRecord } from '../lib/types';
import { ParticipantsTable } from './ParticipantsTable';

interface LeidingTableProps {
  staffOrdered: NormalizedRecord[];
  coursecode: string;
  columnCount: number;
  dateColumns: LessonDateColumn[];
}

function isLeiding(record: NormalizedRecord): boolean {
  if (record.roleCategory) {
    return record.roleCategory === 'leiding';
  }
  const value = String(record.function ?? '').trim().toLowerCase();
  return value === 'leiding';
}

export function LeidingTable({ staffOrdered, coursecode, columnCount, dateColumns }: LeidingTableProps) {
  const leidingRecords = staffOrdered.filter((record) => record.roleCategory === 'leiding');
  const assistentRecords = staffOrdered.filter((record) => record.roleCategory === 'assistent');
  const overigeRecords = staffOrdered.filter(
    (record) => record.roleCategory !== 'leiding' && record.roleCategory !== 'assistent',
  );

  const sections = [
    {
      id: `${coursecode}-leiding`,
      title: leidingRecords.length > 0 ? 'Leiding' : undefined,
      records: leidingRecords,
    },
    {
      id: `${coursecode}-assistent`,
      title: assistentRecords.length > 0 ? 'Assistent' : undefined,
      records: assistentRecords,
    },
  ];

  if (overigeRecords.length > 0) {
    sections.push({
      id: `${coursecode}-overig`,
      title: undefined,
      records: overigeRecords,
    });
  }

  return (
    <ParticipantsTable
      title="Leiding & Assistenten"
      coursecode={coursecode}
      columnCount={columnCount}
      dateColumns={dateColumns}
      sections={sections}
      formatPhones={(person) => person.phoneDisplay}
      getNameClassName={(person) =>
        `text-slate-800 ${isLeiding(person) ? 'font-semibold' : 'font-medium'}`
      }
    />
  );
}

export default LeidingTable;
