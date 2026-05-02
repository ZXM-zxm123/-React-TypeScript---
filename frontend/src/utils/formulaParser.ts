const CELL_REF_PATTERN = /([A-Z]+)(\d+)/g;
const RANGE_PATTERN = /([A-Z]+)(\d+):([A-Z]+)(\d+)/g;

export function parseCellId(cellId: string): { col: number; row: number } {
  const match = cellId.match(/([A-Z]+)(\d+)/);
  if (!match) return { col: 0, row: 0 };

  const colStr = match[1];
  const row = parseInt(match[2], 10) - 1;

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;

  return { col, row };
}

export function getCellId(col: number, row: number): string {
  const colLetter = String.fromCharCode(65 + col);
  return `${colLetter}${row + 1}`;
}

export function isFormula(value: string): boolean {
  return typeof value === 'string' && value.startsWith('=');
}

export function extractCellReferences(formula: string): string[] {
  const refs: string[] = [];
  let match;

  const normalizedFormula = formula.replace(RANGE_PATTERN, (match, startCol, startRow, endCol, endRow) => {
    const cells = expandRange(startCol, parseInt(startRow), endCol, parseInt(endRow));
    refs.push(...cells);
    return '';
  });

  while ((match = CELL_REF_PATTERN.exec(normalizedFormula)) !== null) {
    const cellId = match[1] + match[2];
    if (!refs.includes(cellId)) {
      refs.push(cellId);
    }
  }

  return refs;
}

function expandRange(startCol: string, startRow: number, endCol: string, endRow: number): string[] {
  const cells: string[] = [];
  const startColNum = colToNum(startCol);
  const endColNum = colToNum(endCol);
  const minCol = Math.min(startColNum, endColNum);
  const maxCol = Math.max(startColNum, endColNum);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      cells.push(getCellId(col, row));
    }
  }

  return cells;
}

function colToNum(col: string): number {
  let num = 0;
  for (const c of col) {
    num = num * 26 + (c.charCodeAt(0) - 64);
  }
  return num;
}

export function getCellDisplayValue(cell: { value: string | number; calculatedValue?: string | number }): string {
  if (cell.calculatedValue !== undefined) {
    return String(cell.calculatedValue);
  }
  return String(cell.value);
}
