import { CrewData, LabourData, LabourSummaryItem } from '../types/crew';

export interface ExtractResult {
  data: CrewData[];
  executionTimeMs: number;
  engine: string;
}

export interface ExtractLabourResult {
  data: LabourData[];
  executionTimeMs: number;
  engine: string;
}

export interface BackendStatus {
  status: string;
  engine: string;
  binaryExists: boolean;
  binaryPath: string;
  zigVersion: string;
  port: number;
  timestamp: string;
}

export async function extractPdf(file: File): Promise<ExtractResult> {
  const formData = new FormData();
  formData.append('pdf', file);

  const startTime = performance.now();
  const response = await fetch('/api/extract', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorJson.message || errorJson.error || `HTTP error ${response.status}`);
  }

  const data: CrewData[] = await response.json();
  const engine = response.headers.get('X-Engine') || 'Zig-0.13.0';
  const execTimeHeader = response.headers.get('X-Execution-Time-Ms');
  const executionTimeMs = execTimeHeader ? parseInt(execTimeHeader, 10) : Math.round(performance.now() - startTime);

  return {
    data,
    executionTimeMs,
    engine,
  };
}

export async function extractLabourFromPdf(file: File): Promise<ExtractLabourResult> {
  const formData = new FormData();
  formData.append('pdf', file);

  const startTime = performance.now();
  const response = await fetch('/api/extract-labour', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorJson.message || errorJson.error || `HTTP error ${response.status}`);
  }

  const data: LabourData[] = await response.json();
  const engine = response.headers.get('X-Engine') || 'Zig-0.13.0';
  const execTimeHeader = response.headers.get('X-Execution-Time-Ms');
  const executionTimeMs = execTimeHeader ? parseInt(execTimeHeader, 10) : Math.round(performance.now() - startTime);

  return {
    data,
    executionTimeMs,
    engine,
  };
}

export async function extractText(text: string): Promise<ExtractResult> {
  const startTime = performance.now();
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorJson.message || errorJson.error || `HTTP error ${response.status}`);
  }

  const data: CrewData[] = await response.json();
  const engine = response.headers.get('X-Engine') || 'Zig-0.13.0';
  const execTimeHeader = response.headers.get('X-Execution-Time-Ms');
  const executionTimeMs = execTimeHeader ? parseInt(execTimeHeader, 10) : Math.round(performance.now() - startTime);

  return {
    data,
    executionTimeMs,
    engine,
  };
}

/**
 * Extracts unique labour entries from parsed CrewData array, tracking occurrences and crew membership.
 */
export function extractUniqueLabourFromCrews(crews: CrewData[]): LabourSummaryItem[] {
  const map = new Map<string, LabourSummaryItem>();

  for (const crew of crews) {
    if (!crew || !crew.crewId) continue;
    const cleanCrewId = crew.crewId.trim().toLowerCase();
    if (cleanCrewId.startsWith('crew no')) continue;

    for (const item of crew.lineItems) {
      if (!item || !item.description) continue;
      const desc = item.description.trim();
      const descLower = desc.toLowerCase();
      if (descLower.startsWith('crew no') || descLower.includes('bare costs') || descLower.includes('daily totals')) {
        continue;
      }

      // Determine if item is labor: has non-zero hourly cost or costPerLaborHour
      const isLabor = item.bareCosts.hourly > 0 || (item.costPerLaborHour && (item.costPerLaborHour.bare > 0 || item.costPerLaborHour.inclOP > 0));
      if (!isLabor) continue;

      const existing = map.get(desc);

      if (existing) {
        existing.occurrences += 1;
        if (!existing.crewIds.includes(crew.crewId)) {
          existing.crewIds.push(crew.crewId);
        }
        // Update costs if previous had zeros
        if (existing.bareCosts.hourly === 0 && item.bareCosts.hourly > 0) {
          existing.bareCosts = { ...item.bareCosts };
          existing.indSubsOP = { ...item.indSubsOP };
        }
        if ((!existing.costPerLaborHour || existing.costPerLaborHour.bare === 0) && item.costPerLaborHour) {
          existing.costPerLaborHour = { ...item.costPerLaborHour };
        }
      } else {
        const costPerLaborHour = item.costPerLaborHour || {
          bare: item.bareCosts.hourly > 0 ? item.bareCosts.hourly : 0,
          inclOP: item.indSubsOP.hourly > 0 ? item.indSubsOP.hourly : 0,
        };

        map.set(desc, {
          description: desc,
          bareCosts: { ...item.bareCosts },
          indSubsOP: { ...item.indSubsOP },
          costPerLaborHour,
          occurrences: 1,
          crewIds: [crew.crewId],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description));
}

export async function getBackendStatus(): Promise<BackendStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch backend status');
  return res.json();
}

export async function loadSampleData(): Promise<{ pdfBlob: Blob; data: CrewData[] }> {
  // Fetch sample PDF
  const pdfRes = await fetch('/rsmeans_page1.pdf');
  if (!pdfRes.ok) throw new Error('Failed to load sample PDF');
  const pdfBlob = await pdfRes.blob();

  // Fetch sample JSON
  const jsonRes = await fetch('/rsmeans_sample_extracted.json');
  if (!jsonRes.ok) throw new Error('Failed to load pre-extracted sample data');
  const data: CrewData[] = await jsonRes.json();

  return { pdfBlob, data };
}

