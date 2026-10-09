import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFileSync, execFile } from 'child_process';
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

const upload = multer({
  dest: '/tmp/crew_uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const ZIG_BIN_PATH = path.resolve(__dirname, 'backend/zig-out/bin/crew-extractor');

// Health & Status
app.get('/api/status', (req, res) => {
  let zigVersion = 'unknown';
  let binaryExists = fs.existsSync(ZIG_BIN_PATH);
  
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

// Extraction endpoint (Zig Backend)
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  let tempFilePath: string | null = null;
  let textInput: string | null = null;

  try {
    if (req.file) {
      tempFilePath = req.file.path;
      // If filename didn't preserve .pdf extension, rename so Zig/pdftotext recognizes it
      if (req.file.originalname.toLowerCase().endsWith('.pdf') && !tempFilePath.endsWith('.pdf')) {
        const renamedPath = `${tempFilePath}.pdf`;
        fs.renameSync(tempFilePath, renamedPath);
        tempFilePath = renamedPath;
      }
    } else if (req.body && req.body.text) {
      const textContent = String(req.body.text);
      tempFilePath = `/tmp/text_upload_${Date.now()}.txt`;
      fs.writeFileSync(tempFilePath, textContent);
    } else {
      return res.status(400).json({
        error: 'No file uploaded or text provided. Send a multipart/form-data request with "pdf" field or JSON with "text" field.',
      });
    }

    if (!fs.existsSync(ZIG_BIN_PATH)) {
      return res.status(500).json({
        error: `Zig extractor binary not found at ${ZIG_BIN_PATH}. Please run "npm run build:zig" first.`,
      });
    }

    // Call Zig binary
    const stdout = execFileSync(ZIG_BIN_PATH, [tempFilePath], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 30000,
    });

    const outputStr = stdout.toString().trim();
    if (!outputStr) {
      return res.status(500).json({ error: 'Zig parser returned empty output' });
    }

    const rawJson = JSON.parse(outputStr);
    // Sanitize: ensure no table headers like "Crew No" or items without lineItems leak into the results
    const parsedJson = Array.isArray(rawJson)
      ? rawJson.filter((crew: any) => {
          if (!crew || !crew.crewId) return false;
          const cleanId = String(crew.crewId).trim().toLowerCase();
          if (cleanId === 'crew no.' || cleanId === 'crew no' || cleanId === 'crew number') return false;
          if (cleanId.includes('cost per labor-hour') || cleanId.includes('bare costs')) return false;
          return Array.isArray(crew.lineItems) && crew.lineItems.length > 0;
        })
      : [];
    const durationMs = Date.now() - startTime;

    res.setHeader('X-Engine', 'Zig-0.13.0');
    res.setHeader('X-Execution-Time-Ms', durationMs.toString());
    res.setHeader('X-Crews-Extracted', parsedJson.length.toString());

    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      error: 'Failed to extract crew data',
      message: error.message,
      stderr: error.stderr ? error.stderr.toString() : undefined,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // ignore cleanup error
      }
    }
  }
});

// Unique Labour extraction endpoint (Zig Backend)
app.post('/api/extract-labour', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  let tempFilePath: string | null = null;

  try {
    if (req.file) {
      tempFilePath = req.file.path;
      if (req.file.originalname.toLowerCase().endsWith('.pdf') && !tempFilePath.endsWith('.pdf')) {
        const renamedPath = `${tempFilePath}.pdf`;
        fs.renameSync(tempFilePath, renamedPath);
        tempFilePath = renamedPath;
      }
    } else if (req.body && req.body.text) {
      const textContent = String(req.body.text);
      tempFilePath = `/tmp/text_upload_labour_${Date.now()}.txt`;
      fs.writeFileSync(tempFilePath, textContent);
    } else {
      return res.status(400).json({
        error: 'No file uploaded or text provided. Send a multipart/form-data request with "pdf" field or JSON with "text" field.',
      });
    }

    if (!fs.existsSync(ZIG_BIN_PATH)) {
      return res.status(500).json({
        error: `Zig extractor binary not found at ${ZIG_BIN_PATH}. Please run "npm run build:zig" first.`,
      });
    }

    // Call Zig binary with --labour flag
    const stdout = execFileSync(ZIG_BIN_PATH, ['--labour', tempFilePath], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 30000,
    });

    const outputStr = stdout.toString().trim();
    if (!outputStr) {
      return res.status(500).json({ error: 'Zig parser returned empty output' });
    }

    const rawJson = JSON.parse(outputStr);
    const parsedJson = Array.isArray(rawJson)
      ? rawJson.filter((item: any) => {
          if (!item || !item.description) return false;
          const d = String(item.description).trim().toLowerCase();
          if (d.startsWith('crew no') || d.includes('bare costs') || d.includes('daily totals')) return false;
          return true;
        })
      : [];
    const durationMs = Date.now() - startTime;

    res.setHeader('X-Engine', 'Zig-0.13.0');
    res.setHeader('X-Execution-Time-Ms', durationMs.toString());
    res.setHeader('X-Labour-Extracted', parsedJson.length.toString());

    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Labour extraction error:', error);
    return res.status(500).json({
      error: 'Failed to extract labour data',
      message: error.message,
      stderr: error.stderr ? error.stderr.toString() : undefined,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // ignore cleanup error
      }
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
