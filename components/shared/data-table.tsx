import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Right-aligned column for actions; rendered as the card footer on mobile. */
  isAction?: boolean;
  className?: string;
};

/**
 * A table on tablets and desktops, a stack of cards on phones: each card lists
 * the column labels with their values and puts the actions at the bottom.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  className,
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  className?: string;
}) {
  const dataColumns = columns.filter((column) => !column.isAction);
  const actionColumns = columns.filter((column) => column.isAction);

  return (
    <div className={className}>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.isAction && "text-right", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn("py-3", column.isAction && "text-right", column.className)}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-xl border bg-card p-4">
            <dl className="space-y-2">
              {dataColumns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{column.header}</dt>
                  <dd className="text-right font-medium">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actionColumns.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
                {actionColumns.map((column) => (
                  <div key={column.key}>{column.cell(row)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
