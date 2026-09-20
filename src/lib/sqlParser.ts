import { Parser } from 'node-sql-parser';

const parser = new Parser();

export function parseQuery(query: string) {
  try {
    const ast = parser.astify(query);
    return ast;
  } catch (error) {
    console.warn("Could not parse query AST for visualization:", error);
    return null;
  }
}
