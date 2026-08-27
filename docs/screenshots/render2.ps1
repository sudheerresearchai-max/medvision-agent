# MedVision Agent UI mockup renderer (research prototype).
# Pure-ASCII PowerShell 5.1-compatible. Outputs PNGs next to this script.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Col([int]$r,[int]$g,[int]$b,[int]$a=255){ [System.Drawing.Color]::FromArgb($a,$r,$g,$b) }
$BG=Col 247 250 252; $CARD=Col 255 255 255; $BORDER=Col 222 229 238
$TEXT=Col 23 32 43; $MUTED=Col 110 123 138; $PRIMARY=Col 11 110 153
$PRIM_BG=Col 240 249 255; $RED=Col 194 38 38; $RED_BG=Col 254 242 242
$RED_BRD=Col 254 202 202; $AMBER_TXT=Col 146 64 14; $GREEN=Col 5 150 105
$GRAY_FILL=Col 241 245 249; $CODE_BG=Col 238 242 247

$script:FB = { param($sz,$st) New-Object System.Drawing.Font('Segoe UI',$sz,$st,[System.Drawing.GraphicsUnit]::Pixel) }
function Brush($c){ New-Object System.Drawing.SolidBrush($c) }
function PenC($c,[single]$w){ if($null -eq $w){$w=1}; New-Object System.Drawing.Pen($c,[single]$w) }
function RPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){ if($r -le 0){ $p=New-Object System.Drawing.Drawing2D.GraphicsPath; $p.AddRectangle([System.Drawing.RectangleF]::new($x,$y,$w,$h)); return $p }
  $p=New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x,$y,$r,$r,180,90); $p.AddArc($x+$w-$r,$y,$r,$r,270,90)
  $p.AddArc($x+$w-$r,$y+$h-$r,$r,$r,0,90); $p.AddArc($x,$y+$h-$r,$r,$r,90,90)
  $p.CloseFigure(); return $p
}
function FRR($g,$x,$y,$w,$h,$r,$col){ $p=RPath $x $y $w $h $r; $g.FillPath((Brush $col),$p); $p.Dispose() }
function SRR($g,$x,$y,$w,$h,$r,$col,$wd){ if($null -eq $wd){$wd=1}; $p=RPath $x $y $w $h $r; $g.DrawPath((PenC $col $wd),$p); $p.Dispose() }
function T($g,$s,$x,$y,$sz,$col,$st){
  if($null -eq $st){$st='Regular'}
  $ft=& $script:FB $sz $st; $g.DrawString($s,$ft,(Brush $col),$x,$y); $ft.Dispose()
}
function TW($g,$s,$sz,$st){ if($null -eq $st){$st='Regular'}; $ft=& $script:FB $sz $st; $w=$g.MeasureString($s,$ft).Width; $ft.Dispose(); return $w }
function CenterT($g,$s,$cx,$y,$sz,$col,$st){
  if($null -eq $st){$st='Regular'}; $w=TW $g $s $sz $st; T $g $s ($cx-$w/2) $y $sz $col $st
}
function WarningTri($g,$x,$y,$s){
  $pts=New-Object 'System.Drawing.PointF[]' 3
  $pts[0]=[System.Drawing.PointF]::new(($x+$s/2),$y)
  $pts[1]=[System.Drawing.PointF]::new(($x+$s),($y+$s*0.87))
  $pts[2]=[System.Drawing.PointF]::new($x,($y+$s*0.87))
  $g.FillPolygon((Brush (Col 217 119 6)),$pts)
  $g.FillRectangle((Brush (Col 255 255 255)),($x+$s/2-1.4),($y+$s*0.33),2.8,($s*0.3))
  $g.FillRectangle((Brush (Col 255 255 255)),($x+$s/2-1.4),($y+$s*0.66),2.8,2.8)
}
function CheckCircle($g,$cx,$cy,$r){
  $g.FillEllipse((Brush $GREEN),($cx-$r),($cy-$r),(2*$r),(2*$r))
  $p=PenC (Col 255 255 255) 2
  $g.DrawLine($p,($cx-$r*0.45),$cy,($cx-$r*0.08),($cy+$r*0.38))
  $g.DrawLine($p,($cx-$r*0.08),($cy+$r*0.38),($cx+$r*0.5),($cy-$r*0.35))
  $p.Dispose()
}
function PendingCircle($g,$cx,$cy,$r){ $g.DrawEllipse((PenC (Col 176 188 204) 2),($cx-$r),($cy-$r),(2*$r),(2*$r)) }

function Header($g,[int]$W){
  $g.FillRectangle((Brush (Col 254 226 226)),0,0,$W,34)
  WarningTri $g 122 9 16
  T $g 'Research prototype only -- This is a research prototype and not approved for clinical diagnosis.' 150 8 12.5 (Col 153 27 27) 'Bold'
  $g.FillRectangle((Brush $CARD),0,34,$W,58)
  $g.DrawLine((PenC $BORDER 1),0,92,$W,92)
  $g.FillEllipse((Brush $PRIMARY),120,52,22,22)
  T $g 'MedVision Agent' 152 50 17 $TEXT 'Bold'
  FRR $g 306 51 82 21 10 (Col 254 243 199)
  CenterT $g 'RESEARCH' 347 55 10 $AMBER_TXT 'Bold'
  T $g 'Home'   1010 57 14 $MUTED
  T $g 'Upload' 1085 57 14 $TEXT
  T $g 'Docs'   1172 57 14 $MUTED
}
function OrganIcon($g,$kind,$x,$y){
  if($kind -eq 'brain'){
    $g.FillEllipse((Brush (Col 236 180 210)),$x,$y,30,26)
    $p=PenC (Col 157 88 128) 2
    $g.DrawArc($p,($x+4),($y+4),10,10,90,180); $g.DrawArc($p,($x+15),($y+10),11,10,200,200); $p.Dispose()
  } elseif($kind -eq 'lung'){
    $g.FillEllipse((Brush (Col 147 197 235)),$x,($y+6),13,22)
    $g.FillEllipse((Brush (Col 147 197 235)),($x+17),($y+6),13,22)
    $p=PenC (Col 70 110 150) 2; $g.DrawLine($p,($x+15),$y,($x+15),($y+10)); $p.Dispose()
  } else {
    $m=New-Object System.Drawing.Drawing2D.Matrix
    $m.RotateAt(-25,[System.Drawing.PointF]::new(($x+15),($y+14)))
    $g.Transform=$m
    $g.FillEllipse((Brush (Col 250 200 130)),$x,($y+4),30,18)
    $p=PenC (Col 170 110 40) 2; $g.DrawArc($p,($x+7),($y+8),16,9,20,320); $p.Dispose()
    $g.ResetTransform()
  }
}
$pipeline=@(
  @('validateImage','Validate image input'), @('validatePdf','Validate PDF input'),
  @('extractPdfText','Extract PDF text'), @('extractClinicalInfo','Extract clinical information'),
  @('detectOrganAndModality','Detect organ + modality'), @('routeToModel','Route to model'),
  @('runModel','Run tumor model inference'), @('postprocessMask','Post-process mask'),
  @('calculateMeasurements','Calculate measurements'), @('generateStructuredReport','Generate structured report'),
  @('addSafetyWarnings','Apply safety warnings')
)

# ================= PAGE 1 : UPLOAD =================
$W=1440; $H=1500
$bmp=New-Object System.Drawing.Bitmap($W,$H)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'; $g.TextRenderingHint='AntiAliasGridFit'
$g.Clear($BG)
Header $g $W

T $g 'New analysis' 120 114 24 $TEXT 'Bold'
T $g 'The agent validates inputs, extracts text, routes to the right model, and produces a structured report. Typical time: 5-30 s.' 120 152 13.5 $MUTED

FRR $g 120 196 1200 268 12 $CARD; SRR $g 120 196 1200 268 12 $BORDER
T $g '1 - Target organ' 148 218 18 $TEXT 'Bold'
T $g 'Leave on Auto-detect to let the agent infer organ and modality from your text/PDF/filename - or force a model below.' 148 246 13 $MUTED
$organs=@(
  @('brain','Brain','MRI - BraTS-style axial slices',$true),
  @('lung','Lung','CT - nodule/tumor slices',$false),
  @('pancreas','Pancreas','CT/MRI - abdominal slices',$false)
)
for($i=0;$i -lt 3;$i++){
  $ox=148+($i*392)
  if($organs[$i][3]){ FRR $g $ox 282 368 96 10 $PRIM_BG; SRR $g $ox 282 368 96 10 $PRIMARY 2 }
  else { FRR $g $ox 282 368 96 10 $CARD; SRR $g $ox 282 368 96 10 $BORDER }
  OrganIcon $g $organs[$i][0] ($ox+22) 310
  T $g $organs[$i][1] ($ox+66) 304 15 $TEXT 'Bold'
  T $g $organs[$i][2] ($ox+66) 330 12 $MUTED
}
T $g 'Routing mode' 148 414 13.5 $TEXT
FRR $g 252 404 250 38 8 $CARD; SRR $g 252 404 250 38 8 $BORDER
T $g 'Auto-detect (agent decides)' 264 414 13 $TEXT
$ch=PenC $MUTED 2
$pts=New-Object 'System.Drawing.PointF[]' 3
$pts[0]=[System.Drawing.PointF]::new(476,419); $pts[1]=[System.Drawing.PointF]::new(483,426); $pts[2]=[System.Drawing.PointF]::new(490,419)
$g.DrawLines($ch,$pts); $ch.Dispose()

FRR $g 120 488 1200 566 12 $CARD; SRR $g 120 488 1200 566 12 $BORDER
T $g '2 - Inputs' 148 510 18 $TEXT 'Bold'
T $g 'Scan image required for inference; clinical text and/or PDF optional but improve routing. Use de-identified data only.' 148 538 13 $MUTED
T $g 'Medical scan image *' 148 570 13.5 $TEXT

FRR $g 148 596 1144 168 10 (Col 251 253 255)
$dp=New-Object System.Drawing.Pen((Col 203 213 225),2); $dp.DashStyle='Dash'
$p=RPath 148 596 1144 168 10; $g.DrawPath($dp,$p); $p.Dispose(); $dp.Dispose()
$cx=720
$g.DrawEllipse((PenC (Col 148 163 184) 2),($cx-27),620,54,54)
$ar=PenC (Col 148 163 184) 3
$g.DrawLine($ar,$cx,662,$cx,638)
$ap=New-Object 'System.Drawing.PointF[]' 3
$ap[0]=[System.Drawing.PointF]::new(($cx-9),648); $ap[1]=[System.Drawing.PointF]::new($cx,634); $ap[2]=[System.Drawing.PointF]::new(($cx+9),648)
$g.DrawLines($ar,$ap); $ar.Dispose()
CenterT $g 'Drop a scan here or click to browse' $cx 692 14.5 $TEXT 'Bold'
CenterT $g '.png  .jpg  .jpeg  .dcm  .nii  .nii.gz   --   max 4 MB per file' $cx 716 12 $MUTED

T $g 'Report PDF (optional)' 148 788 13.5 $TEXT
SRR $g 148 814 132 38 8 $CARD; SRR $g 148 814 132 38 8 $BORDER
CenterT $g 'Choose PDF...' 214 824 13 $TEXT
T $g 'Radiology report, referral, or prior-study summary. Scanned PDFs are flagged OCR_REQUIRED.' 296 824 12.5 $MUTED

T $g 'Clinical text (optional)' 148 874 13.5 $TEXT
FRR $g 148 900 1144 96 8 $CARD; SRR $g 148 900 1144 96 8 $BORDER
T $g 'e.g.  58-year-old male, progressive headaches and one seizure episode.' 162 912 12.5 (Col 148 163 184)
T $g 'MRI brain requested. Prior note mentions left frontal enhancing lesion.' 162 934 12.5 (Col 148 163 184)
T $g 'Symptoms, doctor notes, history - used for routing and the report. Never enter identifying patient information.' 148 1006 12 $MUTED

FRR $g 120 1078 280 48 10 $PRIMARY
CenterT $g 'Run agentic analysis' 260 1092 15 $CARD 'Bold'

FRR $g 424 1078 896 356 12 $CARD; SRR $g 424 1078 896 356 12 $BORDER
T $g 'Agent workflow' 448 1098 15 $TEXT 'Bold'
T $g '0/11 steps' 1244 1101 12 $MUTED
FRR $g 448 1128 848 8 4 $GRAY_FILL
$yy=1156
foreach($s in $pipeline){
  PendingCircle $g 462 ($yy+9) 7
  T $g $s[1] 482 ($yy+1) 13 $TEXT
  $yy+=29
}
$g.DrawLine((PenC $BORDER 1),0,1470,$W,1470)
T $g 'This is a research prototype and not approved for clinical diagnosis.' 120 1480 12 $TEXT 'Bold'

$bmp.Save("$outDir\upload-page.png",[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host 'upload-page.png done'

# ================= PAGE 2 : CASE RESULT =================
$W=1440; $H=1870
$bmp=New-Object System.Drawing.Bitmap($W,$H)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'; $g.TextRenderingHint='AntiAliasGridFit'
$g.Clear($BG)
Header $g $W

T $g 'Case' 120 112 20 $TEXT 'Bold'
FRR $g 172 110 132 26 6 $CODE_BG
$mono=New-Object System.Drawing.Font('Consolas',13,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('9f3ac21b48e2',$mono,(Brush $TEXT),182,114)
SRR $g 1252 108 168 36 8 $CARD; SRR $g 1252 108 168 36 8 $BORDER
CenterT $g '<-  New analysis' 1336 118 13 $TEXT
T $g 'Analyzed 8/25/2026, 10:42 PM  -  storage: demo memory (ephemeral)' 120 146 13 $MUTED

FRR $g 120 178 1200 46 10 $CARD; SRR $g 120 178 1200 46 10 $BORDER
$g.FillEllipse((Brush $PRIMARY),140,192,16,16)
function Badge($x,$label,$bgc,$fgc){
  $w=TW $g $label 11.5 'Bold'; $w=$w+20
  FRR $g $x 190 $w 22 11 $bgc
  CenterT $g $label ($x+$w/2) 195 11.5 $fgc 'Bold'
  return ($x+$w+10)
}
$nx=Badge 170 'lung' $PRIMARY $CARD
$nx=Badge $nx 'CT' $GRAY_FILL $TEXT
$nx=Badge $nx 'manual selection' $GRAY_FILL $TEXT
$nx=Badge $nx 'synthetic output' $RED $CARD
T $g 'lung + CT -> lung_unet.onnx' $nx 195 13 $MUTED

FRR $g 120 238 1200 58 10 $RED_BG; SRR $g 120 238 1200 58 10 $RED_BRD
WarningTri $g 142 256 20
T $g 'Research prototype - not a medical device.' 174 246 14 $RED 'Bold'
T $g 'This is a research prototype and not approved for clinical diagnosis. Never use these outputs for patient care. Do not upload PHI.' 174 270 12.5 (Col 127 29 29)

# left column: mask overlay card
FRR $g 120 316 776 640 12 $CARD; SRR $g 120 316 776 640 12 $BORDER
T $g 'Predicted mask overlay' 144 336 15.5 $TEXT 'Bold'
$b1=TW $g 'lung_unet.onnx' 11.5 'Bold'; $b1=$b1+20
FRR $g (872-$b1) 338 $b1 22 11 $GRAY_FILL; CenterT $g 'lung_unet.onnx' (872-$b1/2) 343 11.5 $TEXT 'Bold'
$cTxt='confidence(p)=0.61 (placeholder)'
$b2=TW $g $cTxt 11.5 'Bold'; $b2=$b2+20
FRR $g (872-$b1-10-$b2) 338 $b2 22 11 (Col 254 243 199); CenterT $g $cTxt (872-$b1-10-$b2/2) 343 11.5 $AMBER_TXT 'Bold'

$vx=144; $vy=372; $vw=728; $vh=380
for($ry2=0;$ry2 -lt 24;$ry2++){ for($rx=0;$rx -lt 46;$rx++){
  if((($ry2+$rx)%2) -eq 0){ $g.FillRectangle((Brush (Col 228 228 232)),($vx+$rx*16),($vy+$ry2*16),16,16) }
}}
SRR $g $vx $vy $vw $vh 0 $BORDER
$sx=$vx+184; $sy=$vy+10; $ss=360
FRR $g $sx $sy $ss $ss 6 (Col 24 24 28)
$g.FillEllipse((Brush (Col 62 62 68)),($sx+40),($sy+30),280,300)
$g.FillEllipse((Brush (Col 30 30 34)),($sx+86),($sy+96),84,180)
$g.FillEllipse((Brush (Col 30 30 34)),($sx+190),($sy+96),84,180)
$p=PenC (Col 96 96 104) 2
$g.DrawArc($p,($sx+120),($sy+60),120,120,200,140)
$g.DrawArc($p,($sx+150),($sy+90),60,60,0,160)
$p.Dispose()
$les=RPath ($sx+196) ($sy+128) 74 62 30
$lb=New-Object System.Drawing.SolidBrush((Col 200 248 72 72))
$g.FillPath($lb,$les); $lb.Dispose()
$lp=PenC (Col 255 210 60) 3
$g.DrawPath($lp,$les); $lp.Dispose(); $les.Dispose()

T $g 'Mask opacity' 144 778 12 $MUTED
T $g '60%' 232 778 12 $MUTED
FRR $g 144 800 320 6 3 $GRAY_FILL
FRR $g 144 800 192 6 3 $PRIMARY
$g.FillEllipse((Brush $CARD),328,793,20,20); $g.DrawEllipse((PenC $PRIMARY 2),328,793,20,20)
FRR $g 700 788 152 32 8 $PRIM_BG; SRR $g 700 788 152 32 8 $PRIMARY
CenterT $g 'Hide mask' 776 796 13 $PRIMARY

FRR $g 144 844 728 62 8 $GRAY_FILL
$mcells=@(
  @('Lesion area','512 px^2'), @('Slice coverage','0.78 %'),
  @('Eq. diameter','25.5 px'), @('Bounding box','1,600 px^2'))
for($i=0;$i -lt 4;$i++){
  $mx=160+($i*180)
  T $g $mcells[$i][0] $mx 854 11 $MUTED
  T $g $mcells[$i][1] $mx 872 14 $TEXT 'Bold'
}
T $g '[!] SYNTHETIC DEMO OUTPUT - no trained model was executed (mock inference mode).' 144 918 12 (Col 180 83 9)

FRR $g 120 976 776 470 12 $CARD; SRR $g 120 976 776 470 12 $BORDER
T $g 'Original scan' 144 996 15.5 $TEXT 'Bold'
T $g 'sample_ct_lung.png - 512 KB' 144 1022 12.5 $MUTED
$vx=144; $vy=1050; $vw=728; $vh=376
for($ry2=0;$ry2 -lt 24;$ry2++){ for($rx=0;$rx -lt 46;$rx++){
  if((($ry2+$rx)%2) -eq 0){ $g.FillRectangle((Brush (Col 228 228 232)),($vx+$rx*16),($vy+$ry2*16),16,16) }
}}
$sx=$vx+184; $sy=$vy+8
FRR $g $sx $sy $ss $ss 6 (Col 24 24 28)
$g.FillEllipse((Brush (Col 62 62 68)),($sx+40),($sy+30),280,300)
$g.FillEllipse((Brush (Col 30 30 34)),($sx+86),($sy+96),84,180)
$g.FillEllipse((Brush (Col 30 30 34)),($sx+190),($sy+96),84,180)

# right column
FRR $g 920 316 400 500 12 $CARD; SRR $g 920 316 400 500 12 $BORDER
T $g 'Agent workflow' 944 336 15 $TEXT 'Bold'
T $g '11/11 steps' 1244 339 12 $MUTED
FRR $g 944 364 352 8 4 $GRAY_FILL
FRR $g 944 364 352 8 4 $GREEN
$durs=@('3 ms','1 ms','skip','12 ms','8 ms','2 ms','61 ms','4 ms','1 ms','3 ms','1 ms')
$yy=392
for($i=0;$i -lt 11;$i++){
  CheckCircle $g 956 ($yy+9) 8
  T $g $pipeline[$i][1] 974 ($yy+1) 12.5 $TEXT
  $dw=TW $g $durs[$i] 10.5
  T $g $durs[$i] (1296-$dw) ($yy+3) 10.5 $MUTED
  $yy+=37
}

FRR $g 920 836 400 348 12 $CARD; SRR $g 920 836 400 348 12 $BORDER
T $g 'Extracted clinical info' 944 856 15 $TEXT 'Bold'
FRR $g 1108 854 118 22 11 $GRAY_FILL; CenterT $g 'method: rules' 1167 858 11 $TEXT
$jsonLines=@(
'{'
'  "organsMentioned": ["lung"],'
'  "modalitiesMentioned": ["CT"],'
'  "symptoms": ['
'    "cough", "hemoptysis",'
'    "weight loss"'
'  ],'
'  "findings": ["nodule", "mass"],'
'  "laterality": "right",'
'  "patientAgeYears": 58,'
'  "patientSex": "male",'
'  "suspectedConditions": []'
'}')
FRR $g 944 888 352 276 8 $CODE_BG
$jy=898
foreach($ln in $jsonLines){ $g.DrawString($ln,$mono,(Brush (Col 51 65 85)),956,$jy); $jy+=21 }

FRR $g 920 1204 400 242 12 $CARD; SRR $g 920 1204 400 242 12 $BORDER
T $g 'Measurements' 944 1224 15 $TEXT 'Bold'
$rows=@(
  @('Lesion area','512 px^2'), @('Slice coverage','0.78 %'),
  @('Equivalent diameter','25.5 px'), @('Bounding box','1,600 px^2'))
$ry=1262
foreach($r in $rows){
  T $g $r[0] 944 $ry 12.5 $MUTED
  $rw=TW $g $r[1] 13 'Bold'
  T $g $r[1] (1296-$rw) $ry 13 $TEXT 'Bold'
  $g.DrawLine((PenC $BORDER 1),944,($ry+26),1296,($ry+26))
  $ry+=42
}

FRR $g 120 1466 1200 380 12 $CARD; SRR $g 120 1466 1200 380 12 $BORDER
T $g 'Final structured report' 144 1486 15.5 $TEXT 'Bold'
SRR $g 1080 1484 108 32 8 $CARD; SRR $g 1080 1484 108 32 8 $BORDER; CenterT $g 'Copy MD' 1134 1493 12.5 $TEXT
FRR $g 1196 1484 100 32 8 $CARD; SRR $g 1196 1484 100 32 8 $BORDER; CenterT $g 'Download' 1246 1493 12.5 $TEXT
FRR $g 144 1526 1132 40 8 $RED_BG; SRR $g 144 1526 1132 40 8 $RED_BRD
T $g 'This is a research prototype and not approved for clinical diagnosis. Do not use these outputs for patient care.' 160 1537 12.5 $RED 'Bold'

$sections=@(
  @('TECHNIQUE','Routed model: lung_unet.onnx (MOCK - synthetic demo output). Analyzed 2-D slice resized to 256x256 px; threshold 0.5.'),
  @('FINDINGS','Segmentation produced a candidate region covering 0.78% of the analyzed slice. Symptoms: cough, hemoptysis, weight loss.'),
  @('IMPRESSION','UNVERIFIED MACHINE OUTPUT - NOT A DIAGNOSIS. A qualified clinician must review original imaging with full clinical context.')
)
$sy2=1586
foreach($sec in $sections){
  FRR $g 144 $sy2 1132 74 8 $CARD; SRR $g 144 $sy2 1132 74 8 $BORDER
  T $g $sec[0] 160 ($sy2+10) 11 $PRIMARY 'Bold'
  T $g $sec[1] 160 ($sy2+30) 12 $TEXT
  $sy2+=84
}
T $g 'End of automated report.' 144 $sy2 11.5 $MUTED

$bmp.Save("$outDir\case-result.png",[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host 'case-result.png done'
