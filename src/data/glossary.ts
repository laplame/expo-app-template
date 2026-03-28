/**
 * Glosario Link4Deal + BizneAI (cargado desde glossary.json)
 */

const glossaryJson = require('./glossary.json');

export interface GlossaryEntry {
  term: string;
  category: string;
  definition: string;
  definitionEn?: string;
}

export interface GlossaryData {
  ecosystem: string;
  version: string;
  glossary: GlossaryEntry[];
}

const data = glossaryJson as GlossaryData;

export const ecosystem = data.ecosystem;
export const version = data.version;
export const glossary = data.glossary;

export function getDefinition(entry: GlossaryEntry, language: 'es' | 'en'): string {
  if (language === 'en' && entry.definitionEn) return entry.definitionEn;
  return entry.definition;
}
