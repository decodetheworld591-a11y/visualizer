import { create } from 'zustand';

export type QueryStatus = 'idle' | 'running' | 'success' | 'error';

export interface VisualizationStep {
  id: string;
  phase: string;
  title: string;
  description: string;
  concept: string;
  sqlKeyword: string;
  color: string;
  icon: string;
}

export interface TableRow { [key: string]: any; }

interface SQLState {
  // Query
  query: string;
  status: QueryStatus;
  errorMessage: string | null;

  // Data
  tables: Record<string, TableRow[]>;
  activeTable: string;

  // Result
  result: TableRow[] | null;
  resultColumns: string[];

  // Step-by-step visualization
  steps: VisualizationStep[];
  currentStep: number;

  // Per-step data
  rowStates: Record<string, 'normal' | 'pass' | 'fail'>;
  highlightColumns: string[];
  filterExpr: string | null;
  sortedRows: TableRow[] | null;
  groupData: Record<string, TableRow[]> | null;

  // UI State
  isLightMode: boolean;
  toggleLightMode: () => void;

  // Actions
  setQuery: (q: string) => void;

  runQuery: () => void;
  setStatus: (s: QueryStatus, err?: string) => void;
  setActiveTable: (name: string) => void;
  setResult: (rows: TableRow[], cols: string[]) => void;
  setSteps: (steps: VisualizationStep[]) => void;
  setCurrentStep: (idx: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setRowStates: (rs: Record<string, 'normal' | 'pass' | 'fail'>) => void;
  setHighlightColumns: (cols: string[]) => void;
  setFilterExpr: (expr: string | null) => void;
  setSortedRows: (rows: TableRow[] | null) => void;
  setGroupData: (data: Record<string, TableRow[]> | null) => void;
  addTable: (name: string, rows: TableRow[]) => void;
  reset: () => void;
}

const defaultTables: Record<string, TableRow[]> = {
  students: [
    { id: 1, name: 'Alex',    age: 21, city: 'NYC', grade: 'A' },
    { id: 2, name: 'Sara',    age: 18, city: 'LA',  grade: 'B' },
    { id: 3, name: 'John',    age: 25, city: 'NYC', grade: 'A' },
    { id: 4, name: 'Mia',     age: 22, city: 'SF',  grade: 'C' },
    { id: 5, name: 'Leo',     age: 19, city: 'BOS', grade: 'B' },
    { id: 6, name: 'Eva',     age: 23, city: 'NYC', grade: 'A' },
  ],
  employees: [
    { id: 1, name: 'Alice',   dept: 'Engineering', salary: 90000 },
    { id: 2, name: 'Bob',     dept: 'Design',      salary: 75000 },
    { id: 3, name: 'Charlie', dept: 'Engineering', salary: 85000 },
    { id: 4, name: 'Diana',   dept: 'Marketing',   salary: 70000 },
    { id: 5, name: 'Eve',     dept: 'Design',      salary: 80000 },
    { id: 6, name: 'Frank',   dept: 'Engineering', salary: 95000 },
  ],
  products: [
    { id: 1, name: 'Laptop',  category: 'Electronics', price: 999  },
    { id: 2, name: 'Phone',   category: 'Electronics', price: 699  },
    { id: 3, name: 'Chair',   category: 'Furniture',   price: 299  },
    { id: 4, name: 'Desk',    category: 'Furniture',   price: 499  },
    { id: 5, name: 'Headset', category: 'Electronics', price: 149  },
  ],
};

export const useSQLStore = create<SQLState>((set, get) => ({
  query: 'SELECT name, age, city\nFROM students\nWHERE age > 20\nORDER BY age DESC;',
  status: 'idle',
  errorMessage: null,
  tables: defaultTables,
  activeTable: 'students',
  result: null,
  resultColumns: [],
  steps: [],
  currentStep: 0,
  rowStates: {},
  highlightColumns: [],
  filterExpr: null,
  sortedRows: null,
  groupData: null,
  isLightMode: false,

  toggleLightMode: () => set(s => {
    const next = !s.isLightMode;
    if (next) document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
    return { isLightMode: next };
  }),

  setQuery: (q) => set({ query: q }),
  runQuery: () => set({ status: 'running', errorMessage: null }),
  setStatus: (s, err) => set({ status: s, errorMessage: err ?? null }),
  setActiveTable: (name) => set({ activeTable: name }),
  setResult: (rows, cols) => set({ result: rows, resultColumns: cols, status: 'success' }),
  setSteps: (steps) => set({ steps, currentStep: 0 }),
  setCurrentStep: (idx) => set({ currentStep: idx }),
  nextStep: () => set(s => ({ currentStep: Math.min(s.currentStep + 1, s.steps.length - 1) })),
  prevStep: () => set(s => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
  setRowStates: (rs) => set({ rowStates: rs }),
  setHighlightColumns: (cols) => set({ highlightColumns: cols }),
  setFilterExpr: (expr) => set({ filterExpr: expr }),
  setSortedRows: (rows) => set({ sortedRows: rows }),
  setGroupData: (data) => set({ groupData: data }),
  addTable: (name, rows) => set(s => ({ tables: { ...s.tables, [name]: rows }, activeTable: name })),
  reset: () => set({
    status: 'idle', errorMessage: null, result: null, resultColumns: [],
    steps: [], currentStep: 0, rowStates: {}, highlightColumns: [],
    filterExpr: null, sortedRows: null, groupData: null,
  }),
}));
