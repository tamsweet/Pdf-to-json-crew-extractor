# PDF-to-JSON Crew Standard Extractor

High-performance tabular RSMeans construction crew standard extractor with a native **Zig** backend and **TypeScript / React** frontend.

Extracts complex two-column construction crew cost sheets (such as RSMeans "Crews - Standard" tables) from PDF documents and outputs structured JSON conforming to the strictly typed `CrewData[]` schema.

---

## Architecture Overview

```
├── backend/
│   ├── src/
│   │   ├── main.zig           # CLI & std.http Server entry point
│   │   ├── crew_parser.zig    # Two-column layout normalizer & state-machine parser
│   │   └── types.zig          # Strongly typed CrewData, CostPair, LineItem structures
│   ├── build.zig              # Zig build configuration
│   └── samples/               # Authentic RSMeans PDF and OCR benchmark files
├── src/
│   ├── components/
│   │   ├── Header.tsx         # Universal Top Bar contract & navigation
│   │   ├── FileUpload.tsx     # Drag-and-drop PDF & text uploader
│   │   ├── JsonViewer.tsx     # Collapsible tree viewer with search & syntax highlighting
│   │   ├── CrewTableView.tsx  # RSMeans technical table view with category filtering
│   │   ├── ZigTerminal.tsx    # Live Zig engine benchmark & CLI runner
│   │   └── SchemaDocumentation.tsx # Data contract & normalization rules
│   ├── services/
│   │   └── extractorService.ts # REST API integration client
│   ├── types/
│   │   └── crew.ts            # TypeScript interfaces
│   ├── App.tsx                # Main application interface
│   └── index.css              # Tailwind CSS styles
├── server.ts                  # Full-stack Express server with Vite middleware
└── package.json
```

---

## Tech Stack

* **Backend:** Zig 0.13.0 with `std.http` and `std.json`. Memory-safe parsing with `GeneralPurposeAllocator` and explicit `defer` statements.
* **PDF Interop:** Poppler (`pdftotext`) C-interop stream decoding with layout coordinate preservation.
* **Frontend:** TypeScript, React 19, Vite, Tailwind CSS, Lucide Icons, Motion.
* **API:** RESTful `POST /api/extract` accepting `multipart/form-data` with PDF files or JSON payloads.

---

## JSON Output Schema

```typescript
interface CrewData {
  crewId: string; // e.g., "Crew A-1"
  lineItems: {
    description: string; // e.g., "1 Building Laborer", "1 Concrete Saw"
    bareCosts: { 
      hourly: number; 
      daily: number; 
    };
    indSubsOP: { 
      hourly: number; 
      daily: number; 
    };
    costPerLaborHour?: { 
      bare: number; 
      inclOP: number; 
    }; // Present on items with labor-hour rates
  }[];
  dailyTotals: {
    bareCosts: { 
      hourly: number; 
      daily: number; 
    };
    indSubsOP: { 
      hourly: number; 
      daily: number; 
    };
    costPerLaborHour: { 
      bare: number; 
      inclOP: number; 
    };
  };
}
```

### Unique Labour Data Schema

Extracts and exports deduplicated labor rates for each unique description across all crews:

```typescript
interface LabourData {
  description: string; // e.g. "1 Equip. Oper. (crane)"
  bareCosts: {
    hourly: number;    // e.g. 56.10
    daily: number;     // e.g. 448.80
  };
  indSubsOP: {
    hourly: number;    // e.g. 84.60
    daily: number;     // e.g. 676.80
  };
  costPerLaborHour: {
    bare: number;      // e.g. 51.05
    inclOP: number;    // e.g. 76.95
  };
}
```

### Table Normalization Rules

1. **Header Normalization:** Left columns in RSMeans frequently repeat `"Bare Incl. O&P"` while right columns print `"Bare"` and `"Incl. O&P"`. The engine normalizes both into unified `bare` and `inclOP` properties.
2. **Two-Column Layout De-interleaving:** Identifies page gutter offsets and isolates left-side and right-side tables to ensure chronological line-item integrity without text interleaving.
3. **Daily Totals Row:** Closing rows (e.g. `8 L.H., Daily Totals $390.00 $563.92 $48.75 $70.49`) are extracted into `dailyTotals` with daily bare cost, daily O&P, and average cost per labor-hour.
4. **Equipment Rows:** Machinery rows without labor rates are accurately populated with daily rental values without throwing missing-hourly-wage errors.

---

## Installation & Setup

### Prerequisites

* **Linux / macOS / Windows (WSL2)**
* **Node.js** (v18+) and **npm**
* **Zig** (v0.13.0+)
* **Poppler utilities** (`pdftotext`)

On Debian / Ubuntu:
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

On macOS (Homebrew):
```bash
brew install poppler zig
```

### Building the Zig Backend

```bash
cd backend
zig build -Doptimize=ReleaseFast
```

This compiles the standalone native binary to `backend/zig-out/bin/crew-extractor`.

### Running Standalone Zig HTTP Server

```bash
./backend/zig-out/bin/crew-extractor --server 8080
```

### Running the Full-Stack Application

Install npm dependencies:
```bash
npm install
```

Start the unified development server on port 3000:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## API Documentation

### `POST /api/extract`

Accepts a PDF document or raw text and returns extracted crew data.

**Request:**
* `Content-Type: multipart/form-data` with `pdf` file field, OR
* `Content-Type: application/json` with `{ "text": "..." }`

**Response (`application/json`):**
```json
[
  {
    "crewId": "Crew A-1",
    "lineItems": [
      {
        "description": "1 Building Laborer",
        "bareCosts": { "hourly": 39.85, "daily": 318.8 },
        "indSubsOP": { "hourly": 60.7, "daily": 485.6 },
        "costPerLaborHour": { "bare": 39.85, "inclOP": 60.7 }
      },
      {
        "description": "1 Concrete Saw, Gas Manual",
        "bareCosts": { "hourly": 0, "daily": 71.2 },
        "indSubsOP": { "hourly": 0, "daily": 78.32 },
        "costPerLaborHour": { "bare": 8.9, "inclOP": 9.79 }
      }
    ],
    "dailyTotals": {
      "bareCosts": { "hourly": 0, "daily": 390 },
      "indSubsOP": { "hourly": 0, "daily": 563.92 },
      "costPerLaborHour": { "bare": 48.75, "inclOP": 70.49 }
    }
  }
]
```

### `GET /api/status`

Returns Zig backend engine status, binary verification, and environment details.

---

## License

Apache-2.0
