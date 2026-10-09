import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { execFileSync } from 'child_process';

const page1Text = `Crew A-1 Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Concrete Saw, Gas Manual 71.20 78.32 8.90 9.79
8 L.H., Daily Totals $390.00 $563.92 $48.75 $70.49
Crew A-1A Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Skilled Worker $52.35 $418.80 $80.15 $641.20 $52.35 $80.15
1 Shot Blaster, 20" 214.80 236.28 26.85 29.54
8 L.H., Daily Totals $633.60 $877.48 $79.20 $109.69
Crew A-1B Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Concrete Saw 102.40 112.64 12.80 14.08
8 L.H., Daily Totals $421.20 $598.24 $52.65 $74.78
Crew A-1C Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Chain Saw, Gas, 18" 27.80 30.58 3.48 3.82
8 L.H., Daily Totals $346.60 $516.18 $43.33 $64.52
Crew A-1D Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Vibrating Plate, Gas, 18" 31.80 34.98 3.98 4.37
8 L.H., Daily Totals $350.60 $520.58 $43.83 $65.07
Crew A-1E Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Vibrating Plate, Gas, 21" 40.60 44.66 5.08 5.58
8 L.H., Daily Totals $359.40 $530.26 $44.92 $66.28
Crew A-1F Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Rammer/Tamper, Gas, 8" 46.00 50.60 5.75 6.33
8 L.H., Daily Totals $364.80 $536.20 $45.60 $67.03
Crew A-1G Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Rammer/Tamper, Gas, 15" 52.00 57.20 6.50 7.15
8 L.H., Daily Totals $370.80 $542.80 $46.35 $67.85
Crew A-1H Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Exterior Steam Cleaner 74.80 82.28 9.35 10.29
8 L.H., Daily Totals $393.60 $567.88 $49.20 $70.98
Crew A-1J Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Cultivator, Walk-Behind, 5 H.P. 63.50 69.85 7.94 8.73
8 L.H., Daily Totals $382.30 $555.45 $47.79 $69.43
Crew A-1K Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Cultivator, Walk-Behind, 8 H.P. 74.60 82.06 9.32 10.26
8 L.H., Daily Totals $393.40 $567.66 $49.17 $70.96
Crew A-1M Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70
1 Snow Blower, Walk-Behind 70.10 77.11 8.76 9.64
8 L.H., Daily Totals $388.90 $562.71 $48.61 $70.34
Crew A-2 Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
2 Laborers $39.85 $637.60 $60.70 $971.20 $41.40 $62.80
1 Truck Driver (light) 44.50 356.00 67.00 536.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40 207.24 7.85 8.63
24 L.H., Daily Totals $1182.00 $1714.44 $49.25 $71.44
Crew A-2A Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
2 Laborers $39.85 $637.60 $60.70 $971.20 $41.40 $62.80
1 Truck Driver (light) 44.50 356.00 67.00 536.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40 207.24
1 Concrete Saw 102.40 112.64 12.12 13.33
24 L.H., Daily Totals $1284.40 $1827.08 $53.52 $76.13
Crew A-2B Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Truck Driver (light) $44.50 $356.00 $67.00 $536.00 $44.50 $67.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40 207.24 23.55 25.91
8 L.H., Daily Totals $544.40 $743.24 $68.05 $92.91
Crew A-3A Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Equip. Oper. (light) $51.30 $410.40 $77.35 $618.80 $51.30 $77.35
1 Pickup Truck, 4x4, 3/4 Ton 126.60 139.26 15.82 17.41
8 L.H., Daily Totals $537.00 $758.06 $67.13 $94.76
Crew A-3B Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Equip. Oper. (medium) $53.75 $430.00 $81.05 $648.40 $49.88 $75.17
1 Truck Driver (heavy) 46.00 368.00 69.30 554.40
1 Dump Truck, 12 C.Y., 400 H.P. 542.80 597.08
1 F.E. Loader, W.M., 2.5 C.Y. 523.20 575.52 66.63 73.29
16 L.H., Daily Totals $1864.00 $2375.40 $116.50 $148.46
Crew A-3C Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Equip. Oper. (light) $51.30 $410.40 $77.35 $618.80 $51.30 $77.35
1 Loader, Skid Steer, 78 H.P. 364.80 401.28 45.60 50.16
8 L.H., Daily Totals $775.20 $1020.08 $96.90 $127.51
Crew A-3D Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Truck Driver (light) $44.50 $356.00 $67.00 $536.00 $44.50 $67.00
1 Pickup Truck, 4x4, 3/4 Ton 126.60 139.26
1 Flatbed Trailer, 25 Ton 133.00 146.30 32.45 35.70
8 L.H., Daily Totals $615.60 $821.56 $76.95 $102.69
Crew A-3E Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Equip. Oper. (crane) $56.10 $448.80 $84.60 $676.80 $51.05 $76.95
1 Truck Driver (heavy) 46.00 368.00 69.30 554.40
1 Pickup Truck, 4x4, 3/4 Ton 126.60 139.26 7.91 8.70
16 L.H., Daily Totals $943.40 $1370.46 $58.96 $85.65
Crew A-3F Hr. Daily Hr. Daily
Bare
Costs
Incl.
O&P
1 Equip. Oper. (crane) $56.10 $448.80 $84.60 $676.80 $51.05 $76.95
1 Truck Driver (heavy) 46.00 368.00 69.30 554.40
1 Pickup Truck, 4x4, 3/4 Ton 126.60 139.26
1 Truck Tractor, 6x4, 380 H.P. 476.20 523.82
1 Lowbed Trailer, 75 Ton 249.40 274.34 53.26 58.59
16 L.H., Daily Totals $1669.00 $2168.62 $104.31 $135.54`;

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(path.join(publicDir, 'rsmeans_page1_ocr.txt'), page1Text);

  // Run Zig binary on page1 text to get canonical JSON
  const zigBin = path.resolve('backend/zig-out/bin/crew-extractor');
  let extractedJson = '[]';
  try {
    const stdout = execFileSync(zigBin, [path.join(publicDir, 'rsmeans_page1_ocr.txt')]);
    extractedJson = stdout.toString();
    // Parse and pretty print with normal floating point values
    const parsed = JSON.parse(extractedJson);
    fs.writeFileSync(
      path.join(publicDir, 'rsmeans_sample_extracted.json'),
      JSON.stringify(parsed, null, 2)
    );
    console.log(`Saved extracted JSON with ${parsed.length} crews!`);
  } catch (err) {
    console.error('Failed to run Zig extractor:', err);
  }

  // Create clean formatted PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const page = pdfDoc.addPage([612, 792]);
  const lines = page1Text.split('\n');
  let y = 760;
  for (const line of lines) {
    const isCrew = line.startsWith('Crew ');
    page.drawText(line, {
      x: 36,
      y,
      size: isCrew ? 8.5 : 7,
      font: isCrew ? boldFont : font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 11.5;
    if (y < 40) break;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(publicDir, 'rsmeans_page1.pdf'), pdfBytes);
  console.log(`Generated public/rsmeans_page1.pdf (${pdfBytes.length} bytes)`);
}

main();
