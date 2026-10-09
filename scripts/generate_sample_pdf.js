import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSample() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pagesText = [
    // Page 1
    `Crews - Standard
Crew No.         Bare Costs         Incl. Subs O&P     Cost Per Labor-Hour
                 Hr.      Daily     Hr.      Daily     Bare      Incl. O&P
Crew A-1
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Concrete Saw, Gas Manual     71.20              78.32     8.90      9.79
8 L.H., Daily Totals          $390.00            $563.92   $48.75    $70.49

Crew A-1A
1 Skilled Worker     $52.35   $418.80   $80.15   $641.20   $52.35    $80.15
1 Shot Blaster, 20"           214.80             236.28    26.85     29.54
8 L.H., Daily Totals          $633.60            $877.48   $79.20   $109.69

Crew A-1B
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Concrete Saw                102.40             112.64    12.80     14.08
8 L.H., Daily Totals          $421.20            $598.24   $52.65    $74.78

Crew A-1C
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Chain Saw, Gas, 18"          27.80              30.58     3.48      3.82
8 L.H., Daily Totals          $346.60            $516.18   $43.33    $64.52

Crew A-1D
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Vibrating Plate, Gas, 18"    31.80              34.98     3.98      4.37
8 L.H., Daily Totals          $350.60            $520.58   $43.83    $65.07

Crew A-1E
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Vibrating Plate, Gas, 21"    40.60              44.66     5.08      5.58
8 L.H., Daily Totals          $359.40            $530.26   $44.92    $66.28

Crew A-1F
1 Building Laborer   $39.85   $318.80   $60.70   $485.60   $39.85    $60.70
1 Rammer/Tamper, Gas, 8"       46.00              50.60     5.75      6.33
8 L.H., Daily Totals          $364.80            $536.20   $45.60    $67.03`,

    // Page 1 Right Column
    `Crews - Standard
Crew No.         Bare Costs         Incl. Subs O&P     Cost Per Labor-Hour
                 Hr.      Daily     Hr.      Daily     Bare      Incl. O&P
Crew A-2
2 Laborers           $39.85   $637.60   $60.70   $971.20   $41.40    $62.80
1 Truck Driver (light) 44.50   356.00    67.00   536.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40             207.24     7.85      8.63
24 L.H., Daily Totals        $1182.00           $1714.44   $49.25    $71.44

Crew A-2A
2 Laborers           $39.85   $637.60   $60.70   $971.20   $41.40    $62.80
1 Truck Driver (light) 44.50   356.00    67.00   536.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40             207.24
1 Concrete Saw                102.40             112.64    12.12     13.33
24 L.H., Daily Totals        $1284.40           $1827.08   $53.52    $76.13

Crew A-2B
1 Truck Driver (light)$44.50  $356.00   $67.00   $536.00   $44.50    $67.00
1 Flatbed Truck, Gas, 1.5 Ton 188.40             207.24    23.55     25.91
8 L.H., Daily Totals          $544.40            $743.24   $68.05    $92.91

Crew A-3A
1 Equip. Oper. (light)$51.30  $410.40   $77.35   $618.80   $51.30    $77.35
1 Pickup Truck, 4x4, 3/4 Ton  126.60             139.26    15.82     17.41
8 L.H., Daily Totals          $537.00            $758.06   $67.13    $94.76

Crew A-3B
1 Equip. Oper. (medium)$53.75 $430.00   $81.05   $648.40   $49.88    $75.17
1 Truck Driver (heavy) 46.00   368.00    69.30   554.40
1 Dump Truck, 12 C.Y., 400 HP 542.80             597.08
1 F.E. Loader, W.M., 2.5 C.Y. 523.20             575.52    66.63     73.29
16 L.H., Daily Totals        $1864.00           $2375.40  $116.50   $148.46

Crew A-3C
1 Equip. Oper. (light)$51.30  $410.40   $77.35   $618.80   $51.30    $77.35
1 Loader, Skid Steer, 78 H.P. 364.80             401.28    45.60     50.16
8 L.H., Daily Totals          $775.20           $1020.08   $96.90   $127.51`
  ];

  for (const pageText of pagesText) {
    const page = pdfDoc.addPage([612, 792]);
    const lines = pageText.split('\n');
    let y = 750;
    for (const line of lines) {
      const isHeader = line.startsWith('Crews') || line.startsWith('Crew ');
      page.drawText(line, {
        x: 36,
        y,
        size: isHeader ? 8.5 : 7.5,
        font: isHeader ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 12;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outDir = path.resolve('public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'rsmeans_crews_sample.pdf'), pdfBytes);
  
  const backendSamplesDir = path.resolve('backend/samples');
  if (!fs.existsSync(backendSamplesDir)) fs.mkdirSync(backendSamplesDir, { recursive: true });
  fs.writeFileSync(path.join(backendSamplesDir, 'rsmeans_crews_sample.pdf'), pdfBytes);

  console.log(`Sample PDF created at public/rsmeans_crews_sample.pdf (${pdfBytes.length} bytes)`);
}

generateSample();
