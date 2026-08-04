const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} = require("docx");

const outputRoot = __dirname;
const blue = "17365D";
const lightBlue = "DCE6F1";
const gray = "F2F2F2";

function runs(text, options = {}) {
  const pieces = text.split(/([A-Za-z0-9_./{}<>?&=:+,\-[\]"'\\]+)/g).filter(Boolean);
  return pieces.map((piece) => {
    const latin = /[A-Za-z0-9]/.test(piece);
    return new TextRun({
      text: piece,
      font: options.font || "Arial",
      size: options.size,
      bold: options.bold,
      color: options.color,
      rightToLeft: !latin,
      language: !latin ? { bidirectional: "he-IL" } : undefined,
    });
  });
}

function rtl(text, options = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment || AlignmentType.RIGHT,
    heading: options.heading,
    spacing: { before: options.before || 0, after: options.after ?? 120, line: 300 },
    border: options.border,
    shading: options.shading,
    indent: options.indent,
    numbering: options.numbering,
    children: runs(text, options),
  });
}

function code(lines) {
  return lines.map((line) => new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: false,
    spacing: { after: 0, line: 260 },
    shading: { fill: gray, type: ShadingType.CLEAR },
    indent: { left: 240, right: 240 },
    children: [new TextRun({ text: line || " ", font: "Consolas", size: 19 })],
  }));
}

function heading(text, level = 1) {
  return rtl(text, {
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    bold: true,
    color: blue,
    size: level === 1 ? 34 : 28,
    before: level === 1 ? 260 : 180,
    after: 140,
  });
}

function note(text) {
  return rtl(text, {
    shading: { fill: lightBlue, type: ShadingType.CLEAR },
    border: {
      right: { style: BorderStyle.SINGLE, size: 12, color: blue, space: 8 },
    },
    indent: { right: 180, left: 180 },
    after: 180,
  });
}

function numbered(text, ref) {
  return rtl(text, {
    numbering: { reference: ref, level: 0 },
    indent: { right: 720, hanging: 360 },
    after: 90,
  });
}

function bullet(text, ref) {
  return rtl(text, {
    numbering: { reference: ref, level: 0 },
    indent: { right: 720, hanging: 360 },
    after: 80,
  });
}

function title(part, titleText, estimate) {
  return [
    rtl(`SIGIT | חלק ${part} | מסלול מתקדם`, {
      bold: true,
      color: "FFFFFF",
      size: 24,
      shading: { fill: blue, type: ShadingType.CLEAR },
      after: 220,
    }),
    rtl(titleText, { bold: true, size: 46, color: blue, after: 80 }),
    rtl(`זמן עבודה מומלץ לסטודנט חזק: ${estimate}`, { bold: true, size: 24, after: 220 }),
    note("זהו חלק מתקדם. כללי הבחירה, מבנה הנתונים ותנאי הסיום מפורטים במסמך. הקושי נובע מהיקף המימוש, הבדיקות והעמידות — לא מניחוש של התנהגות ה-API."),
  ];
}

function makeDocument(part, children) {
  const numbers = `numbers-${part}`;
  const bullets = `bullets-${part}`;
  return new Document({
    creator: "OpenAI Codex",
    title: `NIGHTFALL advanced part ${part}`,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 23, language: { bidirectional: "he-IL" } },
          paragraph: { spacing: { after: 120, line: 300 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 34, bold: true, color: blue },
          paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 28, bold: true, color: blue },
          paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: numbers,
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.RIGHT,
            style: { paragraph: { indent: { right: 720, hanging: 360 } } },
          }],
        },
        {
          reference: bullets,
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.RIGHT,
            style: { paragraph: { indent: { right: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [rtl(`מבצע NIGHTFALL | מסלול מתקדם | חלק ${part}`, {
            size: 18,
            color: "666666",
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "B4C6E7", space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "SIGIT Training  |  ", font: "Arial", size: 18, color: "666666" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "666666" }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

async function writePart(part, folder, file, children) {
  const destination = path.join(outputRoot, folder);
  fs.mkdirSync(destination, { recursive: true });
  const buffer = await Packer.toBuffer(makeDocument(part, children));
  fs.writeFileSync(path.join(destination, file), buffer);
}

async function main() {
  const n7 = "numbers-7";
  const b7 = "bullets-7";
  await writePart(7, "07 - שחזור ציר הזמן", "חלק 7 - שחזור ציר הזמן.docx", [
    ...title(7, "שחזור ציר הזמן של NIGHTFALL", "2–4 שעות"),
    heading("מטרת החלק"),
    rtl("כתבו תוכנית שאוספת את כל אירועי הפעילות של מחשב היעד, מטפלת בעימוד באמצעות cursor, מקבצת אירועים לפי session_id ומזהה את ההפעלה של NIGHTFALL לפי כללים מפורשים."),
    heading("נקודת הקצה", 2),
    ...code([
      "GET /computers/{computer_id}/activity-events?cursor=0&limit=5",
      "Authorization: Bearer YOUR_ACCESS_TOKEN",
    ]),
    rtl("הפרמטר cursor הוא היסט אפס-מבוסס. הפרמטר limit חייב להיות בין 2 ל-10. התחילו ב-cursor=0. בכל תגובה השתמשו בערך next_cursor לבקשה הבאה. כאשר next_cursor הוא null — האיסוף הסתיים."),
    heading("דוגמת תגובה", 2),
    ...code([
      "{",
      "  \"computer_id\": \"PC-104\",",
      "  \"events\": [",
      "    {",
      "      \"event_id\": \"EVT-001\",",
      "      \"timestamp\": \"2042-06-18T16:58:00Z\",",
      "      \"session_id\": \"SESSION-A12\",",
      "      \"event_type\": \"LOGIN\",",
      "      \"details\": {\"user\": \"field_operator\"}",
      "    }",
      "  ],",
      "  \"next_cursor\": 5",
      "}",
    ]),
    heading("אלגוריתם האיסוף — בדיוק מה לבצע"),
    numbered("צרו requests.Session והגדירו בו Authorization: Bearer <token>.", n7),
    numbered("שלחו את הבקשה הראשונה עם cursor=0 ו-limit=5.", n7),
    numbered("בכל עמוד, הוסיפו את events לאוסף לפי event_id כדי למנוע כפילויות.", n7),
    numbered("אם next_cursor אינו null, הציבו אותו כ-cursor של הבקשה הבאה. אין לחשב cursor באופן עצמאי.", n7),
    numbered("עצרו רק כאשר next_cursor הוא null. הוסיפו הגנה של עד 100 עמודים כדי למנוע לולאה אינסופית במקרה של שרת פגום.", n7),
    numbered("המירו timestamp ל-datetime מודע לאזור זמן, מיינו את כל האירועים בסדר עולה וקבצו אותם לפי session_id.", n7),
    heading("הכלל לזיהוי ההפעלה החשודה"),
    rtl("session_id הוא חשוד אם ורק אם כל חמשת התנאים הבאים מתקיימים בתוך אותה הפעלה. אין להשתמש בשם SESSION שמוכן מראש:"),
    bullet("קיים PROCESS_START שבו details.process שווה powershell.exe.", b7),
    bullet("קיים FILE_OPEN שהנתיב שלו מסתיים ב-nightfall_plan.json.", b7),
    bullet("קיים FILE_OPEN שהנתיב שלו מסתיים ב-nightfall_notes.txt.", b7),
    bullet("קיים ARCHIVE_CREATE שהנתיב שלו מסתיים ב-nightfall_payload.zip.", b7),
    bullet("קיים NETWORK_CONNECTION שבו details.destination שווה 198.51.100.42:8443.", b7),
    rtl("לאחר הזיהוי, ודאו שחמשת האירועים מופיעים בסדר הכרונולוגי המפורט למעלה. אם אין בדיוק הפעלה אחת שמתאימה — התוכנית תיכשל עם הודעה ברורה."),
    heading("קובץ הפלט"),
    rtl("שמרו nightfall_timeline.json במבנה הבא. events יכיל את כל אירועי ההפעלה החשודה בסדר כרונולוגי, לא רק את חמשת אירועי ההתאמה."),
    ...code([
      "{",
      "  \"computer_id\": \"...\",",
      "  \"session_id\": \"...\",",
      "  \"started_at\": \"...\",",
      "  \"ended_at\": \"...\",",
      "  \"event_count\": 0,",
      "  \"events\": []",
      "}",
    ]),
    heading("דרישות איכות ובדיקות"),
    bullet("אין לקבע computer_id, session_id, event_id או cursor בקוד.", b7),
    bullet("בכל בקשה: timeout=10 ו-response.raise_for_status().", b7),
    bullet("כתבו לפחות ארבע בדיקות יחידה: מספר עמודים משתנה, עמוד אחרון, event_id כפול, ושתי הפעלות חשודות שגורמות לכשל.", b7),
    bullet("הדפיסו סיכום: מספר אירועים, מספר הפעלות, ההפעלה החשודה וטווח הזמנים.", b7),
    heading("תנאי הצלחה"),
    note("התוכנית אספה עד next_cursor=null, זיהתה הפעלה אחת לפי כל חמשת הכללים, שמרה JSON תקין ועברה את ארבע בדיקות היחידה."),
  ]);

  const n8 = "numbers-8";
  const b8 = "bullets-8";
  await writePart(8, "08 - העברה מקוטעת מאומתת", "חלק 8 - העברה מקוטעת מאומתת.docx", [
    ...title(8, "הורדה מקבילית, חידוש ואימות", "3–5 שעות"),
    heading("מטרת החלק"),
    rtl("במקום להוריד את החבילה בתגובה אחת, הורידו אותה במקטעים, אמתו SHA-256 לכל מקטע, הרכיבו את הבתים לפי הסדר, אמתו את החבילה השלמה ותמכו בחידוש ריצה שנקטעה."),
    heading("שלב מקדים"),
    rtl("צרו חבילת NIGHTFALL_EVIDENCE באמצעות POST /computers/{computer_id}/evidence-packages ושמרו את package_id. השתמשו רק ב-file_ids שתוצאת החיפוש סימנה כ-HIGH."),
    heading("1. קבלת manifest", 2),
    ...code([
      "GET /computers/{computer_id}/evidence-packages/{package_id}/transfer-manifest",
      "Authorization: Bearer YOUR_ACCESS_TOKEN",
    ]),
    ...code([
      "{",
      "  \"package_id\": \"PKG-...\",",
      "  \"computer_id\": \"PC-104\",",
      "  \"chunk_size_bytes\": 96,",
      "  \"chunk_count\": 9,",
      "  \"total_size_bytes\": 812,",
      "  \"checksum_algorithm\": \"sha256\",",
      "  \"checksum\": \"...\",",
      "  \"chunks\": [",
      "    {\"chunk_index\": 0, \"size_bytes\": 96, \"checksum\": \"...\"}",
      "  ]",
      "}",
    ]),
    note("המספרים בדוגמה להמחשה בלבד. הסתמכו תמיד על chunk_count, total_size_bytes ורשימת chunks שהשרת החזיר בפועל."),
    heading("2. הורדת מקטע", 2),
    ...code([
      "GET /computers/{computer_id}/evidence-packages/{package_id}/chunks/{chunk_index}",
      "Authorization: Bearer YOUR_ACCESS_TOKEN",
    ]),
    ...code([
      "{",
      "  \"package_id\": \"PKG-...\",",
      "  \"computer_id\": \"PC-104\",",
      "  \"chunk_index\": 0,",
      "  \"encoding\": \"base64\",",
      "  \"checksum_algorithm\": \"sha256\",",
      "  \"checksum\": \"...\",",
      "  \"data\": \"ewogICJjYXNlI...\"",
      "}",
    ]),
    heading("אלגוריתם החובה"),
    numbered("קבלו manifest ובדקו ש-checksum_algorithm הוא sha256 ושמספר הרשומות ב-chunks שווה chunk_count.", n8),
    numbered("הפעילו ThreadPoolExecutor עם max_workers=4 והורידו במקביל כל chunk_index שעדיין אינו שמור במצב המקומי.", n8),
    numbered("לכל תגובה, ודאו שה-package_id, computer_id ו-chunk_index זהים לבקשה.", n8),
    numbered("פענחו data מ-Base64 לבתים. ודאו שאורך הבתים שווה size_bytes שב-manifest.", n8),
    numbered("חשבו SHA-256 על בתי המקטע והשוו גם ל-checksum בתגובה וגם ל-checksum של אותו מקטע ב-manifest.", n8),
    numbered("רק אחרי אימות מלא שמרו את המקטע בתיקיית .nightfall-parts ואת האינדקס בקובץ מצב.", n8),
    numbered("הרכיבו את המקטעים לפי chunk_index עולה. אין לחבר לפי סדר סיום ה-threads.", n8),
    numbered("ודאו שהאורך הכולל שווה total_size_bytes וש-SHA-256 של הבתים השלמים שווה checksum של ה-manifest.", n8),
    numbered("רק לאחר האימות הכולל פענחו UTF-8, קראו JSON ושמרו nightfall_evidence_advanced.json.", n8),
    heading("חידוש ריצה"),
    rtl("שמרו קובץ .nightfall-transfer-state.json המכיל package_id, checksum ורשימת chunk_indices מאומתים. בתחילת ריצה חדשה:"),
    bullet("אם package_id או checksum שונים מה-manifest הנוכחי — מחקו רק את מצב ההעברה הישן והתחילו מחדש.", b8),
    bullet("לכל מקטע שמסומן כהושלם, קראו את הקובץ המקומי ואמתו שוב SHA-256 לפני דילוג על ההורדה.", b8),
    bullet("כתבו את קובץ המצב באופן אטומי: קובץ זמני ולאחר מכן os.replace.", b8),
    bullet("לאחר הצלחה מלאה, מחקו את קבצי המקטעים ואת קובץ המצב והשאירו רק את קובץ הראיות.", b8),
    heading("טיפול בשגיאות"),
    rtl("מותר לבצע עד שלושה ניסיונות למקטע רק עבור requests.Timeout, requests.ConnectionError או HTTP 5xx. אין לנסות שוב עבור 4xx. השתמשו בהמתנה של 0.5, 1 ו-2 שניות. לאחר כשל סופי, בטלו משימות שטרם התחילו והשאירו את המצב לצורך חידוש."),
    heading("בדיקות חובה"),
    bullet("מקטעים מסיימים בסדר אקראי אך מורכבים נכון; מקטע עם checksum שגוי אינו נשמר.", b8),
    bullet("ריצה שנייה מדלגת על מקטע מקומי תקין ומורידה מחדש מקטע פגום; checksum כולל שגוי מונע יצירת JSON.", b8),
    bullet("HTTP 404 אינו גורם לניסיון חוזר; HTTP 503 כן גורם לניסיון חוזר.", b8),
    heading("תנאי הצלחה"),
    note("כל מקטע אומת, החיבור בוצע לפי אינדקס, האורך וה-checksum הכוללים אומתו, חידוש ריצה עובד וכל חמש הבדיקות עוברות."),
  ]);

  const n9 = "numbers-9";
  const b9 = "bullets-9";
  await writePart(9, "09 - לקוח NIGHTFALL עמיד", "חלק 9 - לקוח NIGHTFALL עמיד.docx", [
    ...title(9, "פרויקט מסכם: לקוח עמיד וניתן לבדיקה", "5–8 שעות"),
    heading("מטרת הפרויקט"),
    rtl("בנו כלי שורת פקודה אחד שמבצע את כל חלקי NIGHTFALL מתחילתם ועד סופם, כולל שחזור ציר הזמן וההעברה המקוטעת. המסמך מגדיר את הזרימה במלואה; עליכם לתכנן קוד מודולרי, בדיקות, רישום אירועים וחידוש בטוח."),
    heading("ממשק שורת הפקודה"),
    ...code([
      "python nightfall.py --base-url http://127.0.0.1:8000 \\",
      "  --username sigitattacker --output-dir ./output --workers 4",
    ]),
    rtl("את הסיסמה קראו מהמשתנה NIGHTFALL_PASSWORD. אין לקבל token, computer_id, file_id, session_id או package_id כארגומנט, ואין לקבע אותם בקוד."),
    heading("הזרימה המדויקת"),
    numbered("POST /auth/login — קבלו access_token והגדירו אותו ב-requests.Session.", n9),
    numbered("GET /computers — בחרו בדיוק מחשב אחד שהוא online, Windows, activity_status=SUSPICIOUS, risk_level לפחות 80 ובעל התג CASE-NIGHTFALL.", n9),
    numbered("GET /computers/{computer_id} — ודאו remote_operations_available ושמרו recent_directories.", n9),
    numbered("GET /computers/{computer_id}/activity-events — אספו את כל העמודים וזהו הפעלה לפי חמשת הכללים בחלק 7.", n9),
    numbered("POST /computers/{computer_id}/file-searches — שלחו query=NIGHTFALL ואת recent_directories; בחרו רק relevance=HIGH.", n9),
    numbered("POST /computers/{computer_id}/evidence-packages — שלחו package_name=NIGHTFALL_EVIDENCE ואת ה-file_ids שנבחרו.", n9),
    numbered("GET transfer-manifest ולאחר מכן GET chunks/{chunk_index} — בצעו הורדה מקבילית, חידוש ואימות לפי חלק 8.", n9),
    numbered("בדקו שב-JSON הסופי case=NIGHTFALL, status=EVIDENCE_RECOVERED, וש-operation_location ו-planned_time קיימים.", n9),
    numbered("כתבו report.json והדפיסו סיכום קצר שאינו כולל סיסמה, token או Base64.", n9),
    heading("מבנה מומלץ — חובה להפריד אחריות"),
    bullet("config.py — argparse, משתני סביבה ואימות ערכים.", b9),
    bullet("api_client.py — כל קריאות HTTP במקום אחד, timeout ברירת מחדל 10 שניות ומיפוי שגיאות.", b9),
    bullet("discovery.py — בחירת מחשב, איסוף אירועים ובחירת קבצים.", b9),
    bullet("transfer.py — manifest, threads, checksum, מצב מקומי והרכבה.", b9),
    bullet("models.py — dataclasses או מודלים מקומיים לתוצאות ביניים.", b9),
    bullet("nightfall.py — orchestration בלבד; ללא פרטי HTTP או חישובי checksum.", b9),
    bullet("tests/ — בדיקות יחידה ובדיקת אינטגרציה אחת מול FastAPI TestClient או שרת מקומי.", b9),
    heading("Checkpoint וחידוש"),
    rtl("אחרי כל שלב שמרו checkpoint.json באופן אטומי. הקובץ יכיל schema_version=1, base_url, computer_id, session_id, file_ids, package_id, manifest_checksum, completed_stage ו-updated_at. אין לשמור token או סיסמה."),
    rtl("בעת חידוש, אמתו שכל הערכים הדרושים לשלב הבא קיימים. אם checkpoint פגום, גרסתו לא נתמכת או base_url שונה — עצרו עם הודעה ברורה. package_id עשוי להיעלם לאחר אתחול השרת; במקרה של PACKAGE_NOT_FOUND יש לחזור רק לשלב יצירת החבילה, לא להתחיל את כל התהליך."),
    heading("דוח סופי"),
    ...code([
      "{",
      "  \"status\": \"SUCCESS\",",
      "  \"computer\": {\"id\": \"...\", \"hostname\": \"...\"},",
      "  \"timeline\": {\"session_id\": \"...\", \"event_count\": 0},",
      "  \"evidence\": {",
      "    \"file_count\": 0,",
      "    \"package_id\": \"...\",",
      "    \"sha256\": \"...\",",
      "    \"path\": \"...\"",
      "  },",
      "  \"operation\": {\"location\": \"...\", \"planned_time\": \"...\"}",
      "}",
    ]),
    heading("רישום ושגיאות"),
    bullet("השתמשו ב-logging ולא ב-print עבור הודעות תפעוליות; הסיכום הסופי בלבד יודפס ל-stdout.", b9),
    bullet("כל שגיאה תכלול stage, method, path, status_code אם קיים, ו-error מהשרת. אין לרשום headers או גוף המכיל token/data.", b9),
    bullet("קוד היציאה יהיה 0 בהצלחה, 2 לשגיאת קלט, 3 לשגיאת API, 4 לכשל אימות ו-5 לכשל קובץ מקומי.", b9),
    heading("מערך בדיקות מינימלי"),
    bullet("התחברות נכשלת; נמצאו אפס או שני מחשבי יעד; מחשב אינו זמין לפעולות מרוחקות.", b9),
    bullet("עימוד אירועים תקין ועימוד שחוזר על cursor; אפס או שתי הפעלות מתאימות.", b9),
    bullet("אפס קובצי HIGH; יצירת חבילה נכשלת; package נעלם בזמן חידוש.", b9),
    bullet("חמישה תרחישי ההעברה מחלק 8.", b9),
    bullet("Checkpoint תקין ממשיך מהשלב הבא; checkpoint פגום נעצר; אין סודות בלוג או ב-checkpoint.", b9),
    bullet("בדיקת אינטגרציה מלאה יוצרת report.json וקובץ ראיות מאומת.", b9),
    heading("הגשה"),
    bullet("קוד המקור לפי המבנה המפורט.", b9),
    bullet("requirements.txt ללא תלויות שאינן בשימוש.", b9),
    bullet("README קצר עם פקודת התקנה, הגדרת NIGHTFALL_PASSWORD, הרצה, חידוש והרצת בדיקות.", b9),
    bullet("פלט pytest שמראה שכל הבדיקות עברו.", b9),
    heading("תנאי הצלחה"),
    note("הרצה נקייה משלימה את כל הזרימה; הרצה שנקטעה ממשיכה בבטחה; package שנעלם נוצר מחדש; כל checksum מאומת; report.json תקין; אין סודות בפלט; ומערך הבדיקות מכסה את תרחישי הכשל המפורטים."),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
