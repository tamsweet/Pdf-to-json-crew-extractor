import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const uploadDir = '/tmp/crew_uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const ZIG_BIN_PATH = path.resolve(__dirname, 'backend/zig-out/bin/crew-extractor');

// Ensure execute permissions on Zig binary if present
if (fs.existsSync(ZIG_BIN_PATH)) {
  try {
    fs.chmodSync(ZIG_BIN_PATH, 0o755);
  } catch (err: any) {
    console.warn('Could not set execute permissions on Zig binary:', err.message);
  }
}

// Extract text layout from PDF using Node.js pdf-parse
async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const res = await parser.getText();
  return res.text || '';
}

// Fallback TypeScript parser mirroring Zig parser logic
interface CostPair {
  hourly: number;
  daily: number;
}
interface LaborCostPair {
  bare: number;
  inclOP: number;
}
interface LineItem {
  description: string;
  bareCosts: CostPair;
  indSubsOP: CostPair;
  costPerLaborHour?: LaborCostPair | null;
}
interface DailyTotals {
  bareCosts: CostPair;
  indSubsOP: CostPair;
  costPerLaborHour: LaborCostPair;
}
interface CrewData {
  crewId: string;
  lineItems: LineItem[];
  dailyTotals: DailyTotals;
}

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(/[\$,\s;]/g, '');
  if (!cleaned) return null;
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function isNumericToken(raw: string): boolean {
  const cleaned = raw.replace(/[\$,\s;]/g, '');
  if (!cleaned) return false;
  return !isNaN(parseFloat(cleaned)) && /\d/.test(cleaned);
}

function parseCrewsFromText(input: string): CrewData[] {
  const lines = input.split(/\r?\n/);
  const crews: CrewData[] = [];
  let currentCrewId: string | null = null;
  let currentItems: LineItem[] = [];
  let currentTotals: DailyTotals = {
    bareCosts: { hourly: 0, daily: 0 },
    indSubsOP: { hourly: 0, daily: 0 },
    costPerLaborHour: { bare: 0, inclOP: 0 },
  };

  const isTableSubHeader = (line: string): boolean => {
    const l = line.trim();
    if (l === 'Hr. Daily Hr. Daily') return true;
    if (l === 'Bare Costs' || l === 'Incl. Subs O&P' || l === 'Cost Per Labor-Hour') return true;
    if (l === 'Bare' || l === 'Costs' || l === 'Incl.' || l === 'O&P') return true;
    if (l.includes('Crews - Standard')) return true;
    if (l.startsWith('Crew No.') || l.startsWith('Crew No') || l.startsWith('Crew Number')) return true;
    if (l.includes('Bare Costs') && l.includes('Incl.')) return true;
    return false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('customer support') || line.includes('800.448.8182') || line.includes('RSMeans')) {
      continue;
    }
    if (isTableSubHeader(line)) continue;

    // Crew Header detection
    if (line.startsWith('Crew ') && !line.startsWith('Crew No') && !line.startsWith('Crew Number')) {
      if (currentCrewId && currentItems.length > 0) {
        crews.push({
          crewId: currentCrewId,
          lineItems: [...currentItems],
          dailyTotals: { ...currentTotals },
        });
        currentItems = [];
        currentTotals = {
          bareCosts: { hourly: 0, daily: 0 },
          indSubsOP: { hourly: 0, daily: 0 },
          costPerLaborHour: { bare: 0, inclOP: 0 },
        };
      }
      const parts = line.split(/\s+/);
      const id = parts[1] ? parts[1].replace(/[:,;]/g, '') : 'Unknown';
      currentCrewId = `Crew ${id}`;
      continue;
    }

    if (currentCrewId) {
      if (line.includes('Daily Totals') || line.includes('Totals')) {
        const numbers: number[] = [];
        for (const tok of line.split(/\s+/)) {
          if (isNumericToken(tok)) {
            const val = parseNum(tok);
            if (val !== null) numbers.push(val);
          }
        }
        if (numbers.length >= 4) {
          currentTotals.bareCosts.daily = numbers[numbers.length - 4];
          currentTotals.indSubsOP.daily = numbers[numbers.length - 3];
          currentTotals.costPerLaborHour.bare = numbers[numbers.length - 2];
          currentTotals.costPerLaborHour.inclOP = numbers[numbers.length - 1];
        } else if (numbers.length === 2) {
          currentTotals.bareCosts.daily = numbers[0];
          currentTotals.indSubsOP.daily = numbers[1];
        } else if (numbers.length === 3) {
          currentTotals.bareCosts.daily = numbers[0];
          currentTotals.indSubsOP.daily = numbers[1];
          currentTotals.costPerLaborHour.bare = numbers[2];
        }

        if (currentCrewId && currentItems.length > 0) {
          crews.push({
            crewId: currentCrewId,
            lineItems: [...currentItems],
            dailyTotals: { ...currentTotals },
          });
          currentItems = [];
          currentTotals = {
            bareCosts: { hourly: 0, daily: 0 },
            indSubsOP: { hourly: 0, daily: 0 },
            costPerLaborHour: { bare: 0, inclOP: 0 },
          };
          currentCrewId = null;
        }
        continue;
      }

      // Line item parse
      const tokens: string[] = [];
      for (const tok of line.split(/\s+/)) {
        const dollarIdx = tok.indexOf('$');
        if (dollarIdx > 0) {
          tokens.push(tok.slice(0, dollarIdx));
          tokens.push(tok.slice(dollarIdx));
        } else {
          tokens.push(tok);
        }
      }

      if (tokens.length < 2) continue;

      const numIndices: number[] = [];
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (isNumericToken(tokens[i])) {
          numIndices.unshift(i);
        } else {
          break;
        }
      }

      if (numIndices.length === 0 || numIndices[0] === 0) continue;

      const firstNumIdx = numIndices[0];
      const description = tokens.slice(0, firstNumIdx).join(' ');
      const numbers = numIndices.map((idx) => parseNum(tokens[idx]) ?? 0);

      const item: LineItem = {
        description,
        bareCosts: { hourly: 0, daily: 0 },
        indSubsOP: { hourly: 0, daily: 0 },
        costPerLaborHour: null,
      };

      if (numbers.length >= 6) {
        item.bareCosts.hourly = numbers[0];
        item.bareCosts.daily = numbers[1];
        item.indSubsOP.hourly = numbers[2];
        item.indSubsOP.daily = numbers[3];
        item.costPerLaborHour = { bare: numbers[4], inclOP: numbers[5] };
      } else if (numbers.length === 5) {
        item.bareCosts.hourly = numbers[0];
        item.bareCosts.daily = numbers[1];
        item.indSubsOP.hourly = numbers[2];
        item.indSubsOP.daily = numbers[3];
        item.costPerLaborHour = { bare: numbers[4], inclOP: 0 };
      } else if (numbers.length === 4) {
        const n0 = numbers[0];
        const n1 = numbers[1];
        if (n0 > 0 && n1 / n0 >= 7 && n1 / n0 <= 25) {
          item.bareCosts.hourly = numbers[0];
          item.bareCosts.daily = numbers[1];
          item.indSubsOP.hourly = numbers[2];
          item.indSubsOP.daily = numbers[3];
        } else {
          item.bareCosts.daily = numbers[0];
          item.indSubsOP.daily = numbers[1];
          item.costPerLaborHour = { bare: numbers[2], inclOP: numbers[3] };
        }
      } else if (numbers.length === 2) {
        item.bareCosts.daily = numbers[0];
        item.indSubsOP.daily = numbers[1];
      } else if (numbers.length === 1) {
        item.bareCosts.daily = numbers[0];
      }

      currentItems.push(item);
    }
  }

  if (currentCrewId && currentItems.length > 0) {
    crews.push({
      crewId: currentCrewId,
      lineItems: [...currentItems],
      dailyTotals: { ...currentTotals },
    });
  }

  return crews;
}

function extractLabourFromCrewsList(crews: CrewData[]): any[] {
  const map = new Map<string, any>();
  for (const crew of crews) {
    for (const item of crew.lineItems) {
      if (item.bareCosts.hourly === 0 && !item.costPerLaborHour) continue;
      if (!map.has(item.description)) {
        map.set(item.description, {
          description: item.description,
          bareCosts: { ...item.bareCosts },
          indSubsOP: { ...item.indSubsOP },
          costPerLaborHour: item.costPerLaborHour || {
            bare: item.bareCosts.hourly,
            inclOP: item.indSubsOP.hourly,
          },
        });
      }
    }
  }
  return Array.from(map.values());
}

// Health & Status
app.get('/api/status', (req, res) => {
  let zigVersion = 'unknown';
  const binaryExists = fs.existsSync(ZIG_BIN_PATH);

  if (binaryExists) {
    try {
      const out = execFileSync(ZIG_BIN_PATH, ['--version']);
      zigVersion = out.toString().trim();
    } catch (e: any) {
      zigVersion = `Error: ${e.message}`;
    }
  }

  res.json({
    status: 'ok',
    engine: 'Zig 0.13.0 Native Backend',
    binaryExists,
    binaryPath: ZIG_BIN_PATH,
    zigVersion,
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Sample lists
app.get('/api/samples', (req, res) => {
  res.json([
    {
      id: 'page1',
      name: 'RSMeans Crews - Standard (Page 1)',
      description: 'General construction crews A-1 to A-3F (21 crews, 2 columns, equipment & labor items)',
      pdfUrl: '/rsmeans_page1.pdf',
      jsonUrl: '/rsmeans_sample_extracted.json',
      ocrUrl: '/rsmeans_page1_ocr.txt',
      crewCount: 21,
      columnCount: 2,
    },
    {
      id: 'standard-crews',
      name: 'RSMeans Crews - Full Multi-Page Reference',
      description: 'Crews A-1 through A-3C reference layout with equipment and daily totals',
      pdfUrl: '/rsmeans_crews_sample.pdf',
      jsonUrl: '/rsmeans_sample_extracted.json',
      crewCount: 21,
      columnCount: 2,
    },
  ]);
});

// Extraction endpoint (Zig Backend with PDF text extraction & TS fallback)
app.post('/api/extract', upload.single('pdf') as any, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  let tempFilePath: string | null = null;
  let textFilePath: string | null = null;

  try {
    let rawText: string | null = null;

    if (req.file) {
      tempFilePath = req.file.path;
      const isPdf =
        req.file.originalname.toLowerCase().endsWith('.pdf') ||
        req.file.mimetype === 'application/pdf' ||
        (fs.existsSync(tempFilePath) && fs.readFileSync(tempFilePath, { encoding: 'latin1', flag: 'r' }).startsWith('%PDF'));

      if (isPdf) {
        // Extract layout text via PDFParse
        rawText = await extractTextFromPdf(tempFilePath);
        textFilePath = `${tempFilePath}.txt`;
        fs.writeFileSync(textFilePath, rawText);
      } else {
        textFilePath = tempFilePath;
      }
    } else if (req.body && req.body.text) {
      rawText = String(req.body.text);
      textFilePath = `/tmp/text_upload_${Date.now()}.txt`;
      fs.writeFileSync(textFilePath, rawText);
    } else {
      return res.status(400).json({
        error: 'No file uploaded or text provided. Send a multipart/form-data request with "pdf" field or JSON with "text" field.',
      });
    }

    let parsedJson: CrewData[] = [];
    let engine = 'Zig 0.13.0 Native Engine';

    // Attempt Zig binary execution on the prepared text file
    if (fs.existsSync(ZIG_BIN_PATH) && textFilePath) {
      try {
        const stdout = execFileSync(ZIG_BIN_PATH, [textFilePath], {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 30000,
        });
        const outputStr = stdout.toString().trim();
        if (outputStr) {
          const rawZigJson = JSON.parse(outputStr);
          if (Array.isArray(rawZigJson)) {
            parsedJson = rawZigJson.filter((crew: any) => {
              if (!crew || !crew.crewId) return false;
              const cleanId = String(crew.crewId).trim().toLowerCase();
              if (cleanId === 'crew no.' || cleanId === 'crew no' || cleanId === 'crew number') return false;
              if (cleanId.includes('cost per labor-hour') || cleanId.includes('bare costs')) return false;
              return Array.isArray(crew.lineItems) && crew.lineItems.length > 0;
            });
          }
        }
      } catch (zigErr: any) {
        console.warn('Zig binary execution encountered an issue, using TypeScript fallback:', zigErr.message);
      }
    }

    // If Zig execution produced no crews or wasn't available, run TypeScript fallback parser
    if (parsedJson.length === 0 && textFilePath) {
      const textToParse = rawText || fs.readFileSync(textFilePath, 'utf-8');
      parsedJson = parseCrewsFromText(textToParse);
      engine = 'TypeScript Parser Engine';
    }

    const durationMs = Date.now() - startTime;
    res.setHeader('X-Engine', engine);
    res.setHeader('X-Execution-Time-Ms', durationMs.toString());
    res.setHeader('X-Crews-Extracted', parsedJson.length.toString());

    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      error: 'Failed to extract crew data',
      message: error.message,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
    if (textFilePath && textFilePath !== tempFilePath && fs.existsSync(textFilePath)) {
      try {
        fs.unlinkSync(textFilePath);
      } catch (e) {}
    }
  }
});

// Unique Labour extraction endpoint
app.post('/api/extract-labour', upload.single('pdf') as any, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  let tempFilePath: string | null = null;
  let textFilePath: string | null = null;

  try {
    let rawText: string | null = null;

    if (req.file) {
      tempFilePath = req.file.path;
      const isPdf =
        req.file.originalname.toLowerCase().endsWith('.pdf') ||
        req.file.mimetype === 'application/pdf' ||
        (fs.existsSync(tempFilePath) && fs.readFileSync(tempFilePath, { encoding: 'latin1', flag: 'r' }).startsWith('%PDF'));

      if (isPdf) {
        rawText = await extractTextFromPdf(tempFilePath);
        textFilePath = `${tempFilePath}.txt`;
        fs.writeFileSync(textFilePath, rawText);
      } else {
        textFilePath = tempFilePath;
      }
    } else if (req.body && req.body.text) {
      rawText = String(req.body.text);
      textFilePath = `/tmp/text_upload_labour_${Date.now()}.txt`;
      fs.writeFileSync(textFilePath, rawText);
    } else {
      return res.status(400).json({
        error: 'No file uploaded or text provided. Send a multipart/form-data request with "pdf" field or JSON with "text" field.',
      });
    }

    let parsedJson: any[] = [];
    let engine = 'Zig 0.13.0 Native Engine';

    if (fs.existsSync(ZIG_BIN_PATH) && textFilePath) {
      try {
        const stdout = execFileSync(ZIG_BIN_PATH, ['--labour', textFilePath], {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 30000,
        });
        const outputStr = stdout.toString().trim();
        if (outputStr) {
          const rawZigJson = JSON.parse(outputStr);
          if (Array.isArray(rawZigJson)) {
            parsedJson = rawZigJson.filter((item: any) => {
              if (!item || !item.description) return false;
              const d = String(item.description).trim().toLowerCase();
              if (d.startsWith('crew no') || d.includes('bare costs') || d.includes('daily totals')) return false;
              return true;
            });
          }
        }
      } catch (zigErr: any) {
        console.warn('Zig binary execution encountered an issue, using TypeScript fallback:', zigErr.message);
      }
    }

    if (parsedJson.length === 0 && textFilePath) {
      const textToParse = rawText || fs.readFileSync(textFilePath, 'utf-8');
      const crews = parseCrewsFromText(textToParse);
      parsedJson = extractLabourFromCrewsList(crews);
      engine = 'TypeScript Parser Engine';
    }

    const durationMs = Date.now() - startTime;
    res.setHeader('X-Engine', engine);
    res.setHeader('X-Execution-Time-Ms', durationMs.toString());
    res.setHeader('X-Labour-Extracted', parsedJson.length.toString());

    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Labour extraction error:', error);
    return res.status(500).json({
      error: 'Failed to extract labour data',
      message: error.message,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
    if (textFilePath && textFilePath !== tempFilePath && fs.existsSync(textFilePath)) {
      try {
        fs.unlinkSync(textFilePath);
      } catch (e) {}
    }
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` PDF-to-JSON Crew Standard Extractor`);
    console.log(` Web Frontend: http://localhost:${PORT}`);
    console.log(` Zig Backend:  ${ZIG_BIN_PATH}`);
    console.log(` Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
