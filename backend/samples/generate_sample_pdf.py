import os
import zlib

def create_rsmeans_pdf(output_path):
    # Generates a valid multi-page PDF with RSMeans Standard Crews data
    # Each page has a clean 2-column layout
    pages_data = [
        # Page 1
        """Crews - Standard
Crew No.       Bare Costs       Incl. Subs O&P   Cost Per Labor-Hour      Crew No.       Bare Costs       Incl. Subs O&P   Cost Per Labor-Hour
               Hr.    Daily     Hr.    Daily     Bare    Incl. O&P                       Hr.    Daily     Hr.    Daily     Bare    Incl. O&P
Crew A-1                                                                 Crew A-2
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70    2 Laborers           $39.85  $637.60  $60.70  $971.20  $41.40  $62.80
1 Concrete Saw, Gas Manual    71.20            78.32    8.90    9.79    1 Truck Driver (light) 44.50  356.00   67.00   536.00
8 L.H., Daily Totals         $390.00          $563.92  $48.75  $70.49    1 Flatbed Truck, Gas, 1.5 Ton 188.40          207.24    7.85    8.63
                                                                         24 L.H., Daily Totals       $1182.00        $1714.44  $49.25  $71.44
Crew A-1A                                                                Crew A-2A
1 Skilled Worker     $52.35  $418.80  $80.15  $641.20  $52.35  $80.15    2 Laborers           $39.85  $637.60  $60.70  $971.20  $41.40  $62.80
1 Shot Blaster, 20"           214.80           236.28   26.85   29.54    1 Truck Driver (light) 44.50  356.00   67.00   536.00
8 L.H., Daily Totals         $633.60          $877.48  $79.20 $109.69    1 Flatbed Truck, Gas, 1.5 Ton 188.40          207.24
                                                                         1 Concrete Saw                102.40          112.64   12.12   13.33
Crew A-1B                                                                24 L.H., Daily Totals       $1284.40        $1827.08  $53.52  $76.13
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70
1 Concrete Saw                102.40           112.64   12.80   14.08    Crew A-2B
8 L.H., Daily Totals         $421.20          $598.24  $52.65  $74.78    1 Truck Driver (light)$44.50  $356.00  $67.00  $536.00  $44.50  $67.00
                                                                         1 Flatbed Truck, Gas, 1.5 Ton 188.40          207.24   23.55   25.91
Crew A-1C                                                                8 L.H., Daily Totals         $544.40         $743.24  $68.05  $92.91
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70
1 Chain Saw, Gas, 18"          27.80            30.58    3.48    3.82    Crew A-3A
8 L.H., Daily Totals         $346.60          $516.18  $43.33  $64.52    1 Equip. Oper. (light)$51.30  $410.40  $77.35  $618.80  $51.30  $77.35
                                                                         1 Pickup Truck, 4x4, 3/4 Ton  126.60          139.26   15.82   17.41
Crew A-1D                                                                8 L.H., Daily Totals         $537.00         $758.06  $67.13  $94.76
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70
1 Vibrating Plate, Gas, 18"    31.80            34.98    3.98    4.37    Crew A-3B
8 L.H., Daily Totals         $350.60          $520.58  $43.83  $65.07    1 Equip. Oper. (medium)$53.75 $430.00  $81.05  $648.40  $49.88  $75.17
                                                                         1 Truck Driver (heavy) 46.00  368.00   69.30   554.40
Crew A-1E                                                                1 Dump Truck, 12 C.Y., 400 H.P. 542.80        597.08
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70    1 F.E. Loader, W.M., 2.5 C.Y.  523.20        575.52   66.63   73.29
1 Vibrating Plate, Gas, 21"    40.60            44.66    5.08    5.58    16 L.H., Daily Totals       $1864.00        $2375.40 $116.50 $148.46
8 L.H., Daily Totals         $359.40          $530.26  $44.92  $66.28
                                                                         Crew A-3C
Crew A-1F                                                                1 Equip. Oper. (light)$51.30  $410.40  $77.35  $618.80  $51.30  $77.35
1 Building Laborer   $39.85  $318.80  $60.70  $485.60  $39.85  $60.70    1 Loader, Skid Steer, 78 H.P. 364.80          401.28   45.60   50.16
1 Rammer/Tamper, Gas, 8"       46.00            50.60    5.75    6.33    8 L.H., Daily Totals         $775.20        $1020.08  $96.90 $127.51
8 L.H., Daily Totals         $364.80          $536.20  $45.60  $67.03
""",
        # Page 2
        """Crews - Standard
Crew No.       Bare Costs       Incl. Subs O&P   Cost Per Labor-Hour      Crew No.       Bare Costs       Incl. Subs O&P   Cost Per Labor-Hour
               Hr.    Daily     Hr.    Daily     Bare    Incl. O&P                       Hr.    Daily     Hr.    Daily     Bare    Incl. O&P
Crew A-3G                                                                Crew A-4
1 Equip. Oper. (crane)$56.10  $448.80  $84.60  $676.80  $51.05  $76.95   2 Carpenters         $50.70  $811.20  $77.20 $1235.20  $47.98  $72.82
1 Truck Driver (heavy) 46.00  368.00   69.30   554.40                    1 Painter, Ordinary   42.55   340.40   64.05   512.40
1 Pickup Truck, 4x4, 3/4 Ton  126.60           139.26                    24 L.H., Daily Totals       $1151.60        $1747.60  $47.98  $72.82
1 Truck Tractor, 6x4, 450 H.P.583.40           641.74
1 Lowbed Trailer, 75 Ton      249.40           274.34   59.96   65.96    Crew A-5
16 L.H., Daily Totals       $1776.20         $2286.54 $111.01 $142.91    2 Laborers           $39.85  $637.60  $60.70  $971.20  $40.37  $61.40
                                                                         .25 Truck Driver (light)44.50 89.00    67.00   134.00
Crew A-3H                                                                .25 Flatbed Truck, Gas 47.10  51.81     2.62    2.88
1 Equip. Oper. (crane)$56.10  $448.80  $84.60  $676.80  $56.10  $84.60   18 L.H., Daily Totals        $773.70        $1157.01  $42.98  $64.28
1 Hyd. Crane, 12 Ton (Daily)  628.60           691.46   78.58   86.43
8 L.H., Daily Totals        $1077.40         $1368.26 $134.68 $171.03    Crew A-6
                                                                         1 Instrument Man     $52.35  $418.80  $80.15  $641.20  $50.42  $76.80
Crew A-3I                                                                1 Rodman/Chainman     48.50   388.00   73.45   587.60
1 Equip. Oper. (crane)$56.10  $448.80  $84.60  $676.80  $56.10  $84.60   1 Level, Electronic           50.40            55.44    3.15    3.46
1 Hyd. Crane, 25 Ton (Daily)  759.40           835.34   94.92  104.42    16 L.H., Daily Totals        $857.20        $1284.24  $53.58  $80.27
8 L.H., Daily Totals        $1208.20         $1512.14 $151.03 $189.02
                                                                         Crew B-1
Crew B-1A                                                                1 Labor Foreman (out)$41.85  $334.80  $63.75  $510.00  $40.52  $61.72
1 Labor Foreman (out)$41.85   $334.80  $63.75  $510.00  $40.52  $61.72   2 Laborers            39.85   637.60   60.70   971.20
2 Laborers            39.85   637.60   60.70   971.20                    24 L.H., Daily Totals        $972.40        $1481.20  $40.52  $61.72
2 Cutting Torches              25.20            27.72
2 Sets of Gases               336.00           369.60   15.05   16.56
24 L.H., Daily Totals       $1333.60         $1878.52  $55.57  $78.27
"""
    ]

    objects = []
    
    def add_object(content):
        objects.append(content)
        return len(objects)

    # Catalog & Pages forward declaration
    # Object 1: Catalog
    # Object 2: Pages
    # Object 3: Font
    font_obj = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")
    
    page_obj_ids = []
    content_obj_ids = []

    for page_text in pages_data:
        # Build text stream
        stream_lines = ["BT", "/F1 7.5 Tf", "36 756 Td", "9 TL"]
        for line in page_text.strip().split("\n"):
            # Escape parenthesis
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream_lines.append(f"({escaped}) Tj")
            stream_lines.append("T*")
        stream_lines.append("ET")
        stream_data = "\n".join(stream_lines).encode("latin1")
        
        c_obj = add_object(f"<< /Length {len(stream_data)} >>\nstream\n{stream_data.decode('latin1')}\nendstream")
        content_obj_ids.append(c_obj)

    # Pages object index will be 2
    # Create pages
    for i, c_obj in enumerate(content_obj_ids):
        p_obj = add_object(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {c_obj} 0 R /Resources << /Font << /F1 {font_obj} 0 R >> >> >>")
        page_obj_ids.append(p_obj)

    pages_kids = " ".join([f"{pid} 0 R" for pid in page_obj_ids])
    pages_obj = f"<< /Type /Pages /Kids [{pages_kids}] /Count {len(page_obj_ids)} >>"
    
    catalog_obj = "<< /Type /Catalog /Pages 2 0 R >>"

    # Assemble PDF
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    xref = [0] # 0 offset
    
    # We reserved obj 1 as catalog, obj 2 as pages
    all_objs = [catalog_obj, pages_obj] + objects

    for i, obj in enumerate(all_objs, 1):
        xref.append(len(out))
        out.extend(f"{i} 0 obj\n{obj}\nendobj\n".encode("latin1"))

    xref_offset = len(out)
    out.extend(f"xref\n0 {len(all_objs) + 1}\n0000000000 65535 f \n".encode("latin1"))
    for offset in xref[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("latin1"))

    out.extend(f"trailer\n<< /Size {len(all_objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("latin1"))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(out)
    print(f"Generated sample PDF at {output_path} ({len(out)} bytes)")

if __name__ == "__main__":
    create_rsmeans_pdf("/app/applet/backend/samples/rsmeans_crews_sample.pdf")
