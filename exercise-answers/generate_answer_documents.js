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
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} = require("docx");

const root = __dirname;
const navy = "17365D";
const blue = "2F5597";
const paleBlue = "DCE6F1";
const paleGreen = "E2F0D9";
const paleYellow = "FFF2CC";
const codeGray = "F2F2F2";

const sharedScenario = [
  "יחידת SIGIT היא יחידת מודיעין טכנולוגית בדיונית. היא עוקבת אחר רשת BLACK VEIL ומנסה לעצור את מבצע NIGHTFALL, שנועד לפגוע במערך החשמל לשעת חירום המספק גיבוי לבתי חולים.",
  "אחד המחשבים בסביבת האימון מכיל קבצים עם מועד הפעולה, האזור והוראות הביצוע. לרשותכם API מדומה בלבד; אין גישה למחשבים אמיתיים.",
  "המטרה המצטברת היא לבנות אוטומציה ב-Python שמאתרת את המחשב, מחפשת את קובצי NIGHTFALL, יוצרת חבילת ראיות ומאמתת את שלמותה.",
];

const setupCode = [
  "import requests",
  "",
  "BASE_URL = \"http://127.0.0.1:8000\"",
  "session = requests.Session()",
  "response = session.post(",
  "    f\"{BASE_URL}/auth/login\",",
  "    json={\"username\": \"sigitattacker\", \"password\": \"LamaLoKapara\"},",
  "    timeout=10,",
  ")",
  "response.raise_for_status()",
  "token = response.json()[\"access_token\"]",
  "session.headers[\"Authorization\"] = f\"Bearer {token}\"",
];

const exercises = [
  {
    part: 1,
    folder: "01 - איתור מחשב היעד",
    title: "איתור מחשב היעד",
    context: "חלון הזמן נפתח. מזהה מחשב היעד אינו ידוע, ולכן יש לאתר אותו מתוך רשימת המחשבים ללא ניחוש וללא מזהה שהוכן מראש.",
    goal: "כתבו תוכנת Python שמזדהה, מקבלת את כל המחשבים ומאתרת אוטומטית את מחשב NIGHTFALL.",
    requirements: [
      {
        text: "הזדהו עם שם המשתמש sigitattacker והסיסמה LamaLoKapara.",
        words: "שולחים POST ל-/auth/login עם גוף JSON. raise_for_status מונע המשך אם פרטי ההתחברות שגויים.",
        code: setupCode.slice(0, 10),
      },
      {
        text: "שמרו את אסימון הגישה והשתמשו בו בבקשות המוגנות.",
        words: "שומרים את access_token ומגדירים אותו פעם אחת בכותרת ברירת המחדל של Session. אין להדפיס את האסימון.",
        code: setupCode.slice(10),
      },
      {
        text: "אתרו מחשב מחובר המשתמש ב-Windows, מסומן SUSPICIOUS, בעל רמת סיכון גבוהה ונושא CASE-NIGHTFALL.",
        words: "מקבלים GET /computers ומסננים את הנתונים. בפתרון זה רמת סיכון גבוהה מוגדרת כ-80 ומעלה. דורשים התאמה יחידה כדי לא לבחור יעד בצורה שרירותית.",
        code: [
          "response = session.get(f\"{BASE_URL}/computers\", timeout=10)",
          "response.raise_for_status()",
          "computers = response.json()",
          "matches = [c for c in computers if (",
          "    c[\"online\"]",
          "    and c[\"operating_system\"].startswith(\"Windows\")",
          "    and c[\"activity_status\"] == \"SUSPICIOUS\"",
          "    and c[\"risk_level\"] >= 80",
          "    and \"CASE-NIGHTFALL\" in c[\"tags\"]",
          ")]",
          "if len(matches) != 1:",
          "    raise RuntimeError(f\"Expected one target, found {len(matches)}\")",
          "target = matches[0]",
        ],
      },
      {
        text: "הדפיסו את מזהה המחשב, שם המחשב ומערכת ההפעלה.",
        words: "מדפיסים רק את שלושת השדות שהתבקשו, ולא את כל תשובת ה-JSON.",
        code: [
          "print(\"id:\", target[\"id\"])",
          "print(\"hostname:\", target[\"hostname\"])",
          "print(\"os:\", target[\"operating_system\"])",
        ],
      },
      {
        text: "אל תקבעו מראש את מזהה מחשב היעד בקוד.",
        words: "הערך נלקח מהאובייקט שנמצא בסינון. PC-104 אינו מופיע בקוד הלקוח.",
        code: ["computer_id = target[\"id\"]  # discovered, not hard-coded"],
      },
    ],
  },
  {
    part: 2,
    folder: "02 - חשיפת תמונת המצב",
    title: "חשיפת תמונת המצב",
    context: "המחשב החשוד אותר, אך המידע הכללי אינו מספיק. יש לבדוק אותו לעומק ולחלץ את המיקומים שבהם יתבצע החיפוש.",
    goal: "הרחיבו את התוכנית כך שתקבל את פרטי מחשב היעד ותשמור את הנתונים הדרושים לחיפוש.",
    requirements: [
      {
        text: "השתמשו במזהה שהתגלה בחלק הקודם כדי לקבל מידע מפורט.",
        words: "בונים את הנתיב מה-computer_id שנמצא בחלק 1 ושולחים GET. אין לכתוב PC-104.",
        code: [
          "computer_id = target[\"id\"]",
          "response = session.get(",
          "    f\"{BASE_URL}/computers/{computer_id}\", timeout=10",
          ")",
          "response.raise_for_status()",
          "detail = response.json()",
        ],
      },
      {
        text: "ודאו שהמחשב מחובר ושפעולות מרוחקות זמינות בו.",
        words: "עוצרים לפני החיפוש אם אחד משני התנאים שקרי.",
        code: [
          "if not detail[\"online\"]:",
          "    raise RuntimeError(\"Target computer is offline\")",
          "if not detail[\"remote_operations_available\"]:",
          "    raise RuntimeError(\"Remote operations are unavailable\")",
        ],
      },
      {
        text: "חלצו את המשתמש הפעיל, התהליכים, האינדיקציות והמיקומים האחרונים.",
        words: "קוראים רק את השדות הדרושים. התהליכים הם רשימת אובייקטים עם name ו-pid.",
        code: [
          "user = detail[\"logged_in_user\"]",
          "processes = detail[\"running_processes\"]",
          "indicators = detail[\"suspicious_indicators\"]",
          "locations = detail[\"recent_directories\"]",
        ],
      },
      {
        text: "שמרו את רשימת המיקומים כדי להשתמש בה בשלב החיפוש.",
        words: "שומרים עותק של הרשימה במשתנה locations; הוא יעבור כפי שהוא לבקשת החיפוש.",
        code: ["locations = list(detail[\"recent_directories\"])"],
      },
      {
        text: "הציגו סיכום ממוקד ולא את תשובת ה-JSON המלאה.",
        words: "מציגים ערכים שימושיים בלבד, ואת שמות התהליכים במקום כל המבנה.",
        code: [
          "print(\"user:\", user)",
          "print(\"processes:\", [p[\"name\"] for p in processes])",
          "print(\"indicators:\", indicators)",
          "print(\"locations:\", locations)",
        ],
      },
      {
        text: "אל תכתבו מראש בקוד את מיקומי החיפוש.",
        words: "הנתיבים מגיעים מ-recent_directories. כך הקוד נשאר תקין גם אם הנתונים משתנים.",
        code: ["search_locations = detail[\"recent_directories\"]"],
      },
    ],
  },
  {
    part: 3,
    folder: "03 - איתור קובצי NIGHTFALL",
    title: "איתור קובצי NIGHTFALL",
    context: "האינדיקציות מאשרות מעורבות. כעת יש לבצע חיפוש ממוקד ולבחור רק קבצים בעלי רלוונטיות גבוהה.",
    goal: "שלחו חיפוש מרוחק אחר NIGHTFALL ובחרו אוטומטית את תוצאות HIGH.",
    requirements: [
      {
        text: "שלחו חיפוש עם מילת המפתח NIGHTFALL.",
        words: "משתמשים ב-POST /computers/{computer_id}/file-searches ובשדה query.",
        code: [
          "response = session.post(",
          "    f\"{BASE_URL}/computers/{computer_id}/file-searches\",",
          "    json={\"query\": \"NIGHTFALL\", \"locations\": locations},",
          "    timeout=10,",
          ")",
          "response.raise_for_status()",
          "search = response.json()",
        ],
      },
      {
        text: "השתמשו במיקומים שהתקבלו מבדיקת המחשב.",
        words: "השרת מקבל רק ערכים שהופיעו ב-recent_directories. מעבירים את locations מחלק 2 ללא החלפה ידנית.",
        code: ["payload = {\"query\": \"NIGHTFALL\", \"locations\": locations}"],
      },
      {
        text: "קבלו תוצאות באותה תגובה; אין polling או המתנה למזהה משימה.",
        words: "התוצאה הסופית נמצאת מיד בשדה matches. אין endpoint של status ואין לולאת המתנה.",
        code: ["matches = search[\"matches\"]"],
      },
      {
        text: "בחרו רק קבצים שרמת הרלוונטיות שלהם HIGH.",
        words: "מסננים את matches לפי relevance בדיוק שווה HIGH.",
        code: ["high = [item for item in matches if item[\"relevance\"] == \"HIGH\"]"],
      },
      {
        text: "שמרו את מזהי הקבצים והדפיסו את שמותיהם ואת הנתיבים.",
        words: "file_ids ישמש בשלב יצירת החבילה. ההדפסה עוזרת לאמת מה נבחר.",
        code: [
          "file_ids = [item[\"file_id\"] for item in high]",
          "for item in high:",
          "    print(item[\"name\"], \"->\", item[\"path\"])",
        ],
      },
      {
        text: "עצרו עם הודעה ברורה אם לא נמצאו קבצים רלוונטיים.",
        words: "בודקים לפני יצירת החבילה כדי לא לשלוח רשימה ריקה.",
        code: [
          "if not high:",
          "    raise RuntimeError(\"No HIGH relevance NIGHTFALL files found\")",
        ],
      },
    ],
  },
  {
    part: 4,
    folder: "04 - איסוף חבילת הראיות",
    title: "איסוף חבילת הראיות",
    context: "קובצי NIGHTFALL אותרו. יש לאסוף את הקבצים שנבחרו לחבילה אחת מוכנה להורדה.",
    goal: "צרו אוטומטית חבילת NIGHTFALL_EVIDENCE מכל קובצי HIGH שנבחרו.",
    requirements: [
      {
        text: "השתמשו במזהי הקבצים שנבחרו בתוצאת החיפוש.",
        words: "file_ids נבנה מתוצאות HIGH ולא ממזהים שנכתבו ידנית.",
        code: ["file_ids = [item[\"file_id\"] for item in high]"],
      },
      {
        text: "צרו חבילה בשם NIGHTFALL_EVIDENCE.",
        words: "שולחים POST ל-evidence-packages עם שם החבילה ורשימת המזהים.",
        code: [
          "response = session.post(",
          "    f\"{BASE_URL}/computers/{computer_id}/evidence-packages\",",
          "    json={",
          "        \"package_name\": \"NIGHTFALL_EVIDENCE\",",
          "        \"file_ids\": file_ids,",
          "    },",
          "    timeout=10,",
          ")",
          "response.raise_for_status()",
          "package = response.json()",
        ],
      },
      {
        text: "קבלו את החבילה במצב READY באותה תגובה; אין polling.",
        words: "התגובה של POST היא התוצאה הסופית. מאמתים status ולא פונים ל-endpoint נוסף.",
        code: [
          "if package[\"status\"] != \"READY\":",
          "    raise RuntimeError(\"Evidence package is not READY\")",
        ],
      },
      {
        text: "שמרו את package_id שהוחזר.",
        words: "המזהה נוצר בזמן הריצה וישמש בכתובת ההורדה.",
        code: ["package_id = package[\"package_id\"]"],
      },
      {
        text: "ודאו שמספר הקבצים בחבילה תואם למספר שבחרתם.",
        words: "השוואה פשוטה מזהה חבילה חלקית לפני ההורדה.",
        code: [
          "if package[\"file_count\"] != len(file_ids):",
          "    raise RuntimeError(\"Package file count mismatch\")",
        ],
      },
      {
        text: "הציגו את מזהה החבילה, מספר הקבצים וגודל החבילה.",
        words: "מדפיסים את שדות הסיכום שהשרת החזיר.",
        code: [
          "print(\"package_id:\", package_id)",
          "print(\"file_count:\", package[\"file_count\"])",
          "print(\"size_bytes:\", package[\"total_size_bytes\"])",
        ],
      },
    ],
  },
  {
    part: 5,
    folder: "05 - אימות המידע הקריטי",
    title: "אימות המידע הקריטי",
    context: "חבילת הראיות מוכנה, אך אין להשתמש בה לפני שהוכח שהתקבלה בשלמותה.",
    goal: "הורידו את החבילה, אמתו SHA-256 ושמרו רק JSON מאומת בשם nightfall_evidence.json.",
    requirements: [
      {
        text: "הורידו באמצעות מזהה המחשב ומזהה החבילה שהתגלו במהלך הריצה.",
        words: "שני המזהים נלקחים משלבים קודמים ומשולבים בנתיב ההורדה.",
        code: [
          "response = session.get(",
          "    f\"{BASE_URL}/computers/{computer_id}/\"",
          "    f\"evidence-packages/{package_id}/download\",",
          "    timeout=10,",
          ")",
          "response.raise_for_status()",
          "download = response.json()",
        ],
      },
      {
        text: "פענחו את data מ-Base64 לבתים.",
        words: "Base64 הוא קידוד טקסטואלי. validate=True גורם לכשל על נתון שאינו Base64 תקין.",
        code: [
          "import base64",
          "evidence_bytes = base64.b64decode(download[\"data\"], validate=True)",
        ],
      },
      {
        text: "חשבו SHA-256 והשוו ל-checksum שהשרת החזיר.",
        words: "מחשבים את ה-hash על הבתים לפני פענוח UTF-8. compare_digest מבצע השוואה בטוחה.",
        code: [
          "import hashlib, hmac",
          "actual = hashlib.sha256(evidence_bytes).hexdigest()",
          "verified = hmac.compare_digest(actual, download[\"checksum\"])",
        ],
      },
      {
        text: "אם הערכים שונים, עצרו ואל תשמרו את המידע.",
        words: "בדיקת האימות מתבצעת לפני פתיחת קובץ לכתיבה.",
        code: [
          "if not verified:",
          "    raise RuntimeError(\"Evidence checksum verification failed\")",
        ],
      },
      {
        text: "אם הערכים זהים, פענחו UTF-8, קראו JSON ושמרו nightfall_evidence.json.",
        words: "לאחר אימות ה-hash ממירים את הבתים לאובייקט JSON. את הכתיבה מבצעים מיד אחרי בדיקת case/status בדרישה הבאה.",
        code: [
          "import json",
          "evidence = json.loads(evidence_bytes.decode(\"utf-8\"))",
        ],
      },
      {
        text: "ודאו שהתוכן מתייחס ל-NIGHTFALL ושמצבו EVIDENCE_RECOVERED.",
        words: "מאמתים את המשמעות של הקובץ לפני השמירה. בפועל יש לבצע בדיקה זו לפני open.",
        code: [
          "if evidence.get(\"case\") != \"NIGHTFALL\":",
          "    raise RuntimeError(\"Unexpected evidence case\")",
          "if evidence.get(\"status\") != \"EVIDENCE_RECOVERED\":",
          "    raise RuntimeError(\"Evidence is not recovered\")",
          "with open(\"nightfall_evidence.json\", \"w\", encoding=\"utf-8\") as f:",
          "    json.dump(evidence, f, ensure_ascii=False, indent=2)",
        ],
      },
    ],
    finalNote: "סדר בטוח: Base64 → SHA-256 → השוואה → UTF-8/JSON → בדיקת case/status → שמירה.",
  },
  {
    part: 6,
    folder: "06 - מבצע NIGHTFALL המלא",
    title: "מבצע NIGHTFALL המלא",
    context: "אין זמן להעביר מזהים בין תוכניות. נדרש לקוח אחד שמבצע את כל הזרימה באופן אוטומטי.",
    goal: "בנו תוכנת Python אחת מהזדהות ועד שמירת הראיות המאומתות.",
    requirements: [
      {
        text: "הזדהו בשם sigitattacker ובסיסמה LamaLoKapara.",
        words: "פותחים Session, מתחברים ושומרים את ה-token בכותרת.",
        code: setupCode,
      },
      {
        text: "אתרו את מחשב היעד ובדקו אותו לעומק.",
        words: "מסננים את GET /computers, דורשים התאמה יחידה ואז קוראים GET /computers/{id}.",
        code: [
          "computers = session.get(f\"{BASE_URL}/computers\", timeout=10)",
          "computers.raise_for_status()",
          "targets = [c for c in computers.json() if (",
          "    c[\"online\"] and c[\"activity_status\"] == \"SUSPICIOUS\"",
          "    and \"CASE-NIGHTFALL\" in c[\"tags\"]",
          ")]",
          "if len(targets) != 1: raise RuntimeError(\"Target selection failed\")",
          "target = targets[0]",
          "detail_response = session.get(",
          "    f\"{BASE_URL}/computers/{target['id']}\", timeout=10",
          ")",
          "detail_response.raise_for_status()",
          "detail = detail_response.json()",
        ],
      },
      {
        text: "השתמשו במיקומים שהתקבלו כדי לחפש NIGHTFALL ולבחור HIGH.",
        words: "מעבירים recent_directories ישירות לבקשה ומסננים את matches.",
        code: [
          "search_response = session.post(",
          "    f\"{BASE_URL}/computers/{target['id']}/file-searches\",",
          "    json={\"query\": \"NIGHTFALL\",",
          "          \"locations\": detail[\"recent_directories\"]},",
          "    timeout=10,",
          ")",
          "search_response.raise_for_status()",
          "high = [m for m in search_response.json()[\"matches\"]",
          "        if m[\"relevance\"] == \"HIGH\"]",
          "if not high: raise RuntimeError(\"No HIGH files found\")",
        ],
      },
      {
        text: "צרו NIGHTFALL_EVIDENCE והורידו אותה.",
        words: "יוצרים חבילה מה-file_ids שנמצאו ומשתמשים ב-package_id של אותה תגובה.",
        code: [
          "package_response = session.post(",
          "    f\"{BASE_URL}/computers/{target['id']}/evidence-packages\",",
          "    json={\"package_name\": \"NIGHTFALL_EVIDENCE\",",
          "          \"file_ids\": [m[\"file_id\"] for m in high]},",
          "    timeout=10,",
          ")",
          "package_response.raise_for_status()",
          "package = package_response.json()",
          "download_response = session.get(",
          "    f\"{BASE_URL}/computers/{target['id']}/evidence-packages/\"",
          "    f\"{package['package_id']}/download\", timeout=10",
          ")",
          "download_response.raise_for_status()",
        ],
      },
      {
        text: "אמתו SHA-256 לפני פענוח ושמירת JSON.",
        words: "אותו סדר בטוח מחלק 5; אין כתיבה לפני שה-hash והתוכן תקינים.",
        code: [
          "import base64, hashlib, json",
          "raw = base64.b64decode(download_response.json()[\"data\"], validate=True)",
          "expected = download_response.json()[\"checksum\"]",
          "if hashlib.sha256(raw).hexdigest() != expected:",
          "    raise RuntimeError(\"Checksum mismatch\")",
          "evidence = json.loads(raw.decode(\"utf-8\"))",
          "if evidence[\"case\"] != \"NIGHTFALL\" or evidence[\"status\"] != \"EVIDENCE_RECOVERED\":",
          "    raise RuntimeError(\"Unexpected evidence content\")",
        ],
      },
      {
        text: "השתמשו ב-requests.Session וב-timeout בכל בקשה.",
        words: "Session ממחזר חיבור וכותרות. אפשר לעטוף את הפעולות בפונקציה שמחייבת timeout.",
        code: [
          "def api(session, method, url, **kwargs):",
          "    response = session.request(method, url, timeout=10, **kwargs)",
          "    response.raise_for_status()",
          "    return response.json()",
        ],
      },
      {
        text: "טפלו בכשל HTTP בהודעה ברורה, ללא polling או לולאות המתנה.",
        words: "תופסים RequestException פעם אחת ברמת main ומדווחים. ה-endpoints סינכרוניים.",
        code: [
          "try:",
          "    main()",
          "except requests.RequestException as exc:",
          "    raise SystemExit(f\"API request failed: {exc}\")",
        ],
      },
      {
        text: "אל תקבעו מזהים מראש ואל תדפיסו סיסמה או אסימון מלא.",
        words: "כל מזהה מגיע מתגובה קודמת. בלוגים כוללים רק שלב ומזהים שאינם סודיים.",
        code: [
          "computer_id = target[\"id\"]",
          "file_ids = [item[\"file_id\"] for item in high]",
          "package_id = package[\"package_id\"]",
          "# Never print password or token",
        ],
      },
      {
        text: "בסיום הציגו סיכום קצר עם היעד, מספר הקבצים, האימות ומיקום הקובץ.",
        words: "שומרים לקובץ ואז מדפיסים מידע תפעולי קצר.",
        code: [
          "from pathlib import Path",
          "output = Path(\"nightfall_evidence.json\").resolve()",
          "output.write_text(json.dumps(evidence, indent=2), encoding=\"utf-8\")",
          "print({",
          "    \"target\": target[\"hostname\"],",
          "    \"file_count\": len(high),",
          "    \"verified\": True,",
          "    \"evidence_path\": str(output),",
          "})",
        ],
      },
    ],
  },
  {
    part: 7,
    folder: "07 - שחזור ציר הזמן",
    title: "שחזור ציר הזמן של NIGHTFALL",
    context: "זהו חלק מתקדם: יש לאסוף אירועי פעילות מעומדים, לקבץ אותם להפעלות ולזהות את ההפעלה החשודה לפי כללים מפורשים.",
    goal: "אספו את כל activity-events, זהו הפעלה אחת של NIGHTFALL ושמרו nightfall_timeline.json.",
    exerciseNotes: [
      "נקודת הקצה מופיעה בבלוק הקוד הבא.",
      "מתחילים ב-cursor=0, משתמשים ב-next_cursor שהשרת מחזיר ועוצרים כאשר הוא null. limit חייב להיות בין 2 ל-10.",
      "הפעלה חשודה כוללת, לפי הסדר: powershell.exe; פתיחת nightfall_plan.json; פתיחת nightfall_notes.txt; יצירת nightfall_payload.zip; וחיבור ל-198.51.100.42:8443.",
    ],
    exerciseCode: ["GET /computers/{computer_id}/activity-events?cursor=0&limit=5"],
    requirements: [
      {
        text: "אספו את כל העמודים באמצעות next_cursor והגבילו ל-100 עמודים.",
        words: "אין לחשב cursor. בכל סיבוב משתמשים בערך שהשרת החזיר ועוצרים ב-null.",
        code: [
          "cursor, pages, events = 0, 0, {}",
          "while cursor is not None:",
          "    if pages >= 100: raise RuntimeError(\"Too many pages\")",
          "    response = session.get(",
          "        f\"{BASE_URL}/computers/{computer_id}/activity-events\",",
          "        params={\"cursor\": cursor, \"limit\": 5}, timeout=10)",
          "    response.raise_for_status()",
          "    page = response.json()",
          "    for event in page[\"events\"]:",
          "        events.setdefault(event[\"event_id\"], event)",
          "    cursor = page[\"next_cursor\"]",
          "    pages += 1",
        ],
      },
      {
        text: "מנעו כפילויות לפי event_id.",
        words: "מילון לפי event_id שומר רק את ההופעה הראשונה ומגן מפני עמוד שחוזר על אירוע.",
        code: ["unique_events = {e[\"event_id\"]: e for e in collected}"],
      },
      {
        text: "המירו timestamp, מיינו וקבצו לפי session_id.",
        words: "ממירים Z ל-+00:00, ממיינים בזמן ומקבצים עם defaultdict.",
        code: [
          "from collections import defaultdict",
          "from datetime import datetime",
          "ordered = sorted(events.values(), key=lambda e:",
          "    datetime.fromisoformat(e[\"timestamp\"].replace(\"Z\", \"+00:00\")))",
          "sessions = defaultdict(list)",
          "for event in ordered:",
          "    sessions[event[\"session_id\"]].append(event)",
        ],
      },
      {
        text: "זהו את ההפעלה לפי כל חמשת התנאים ובסדר הכרונולוגי.",
        words: "מגדירים פונקציות התאמה, מחפשים את האינדקס הראשון לכל תנאי ודורשים סדר עולה.",
        code: [
          "rules = [",
          "    lambda e: e[\"event_type\"] == \"PROCESS_START\"",
          "              and e[\"details\"].get(\"process\") == \"powershell.exe\",",
          "    lambda e: e[\"event_type\"] == \"FILE_OPEN\"",
          "              and e[\"details\"].get(\"path\", \"\").endswith(\"nightfall_plan.json\"),",
          "    lambda e: e[\"event_type\"] == \"FILE_OPEN\"",
          "              and e[\"details\"].get(\"path\", \"\").endswith(\"nightfall_notes.txt\"),",
          "    lambda e: e[\"event_type\"] == \"ARCHIVE_CREATE\"",
          "              and e[\"details\"].get(\"path\", \"\").endswith(\"nightfall_payload.zip\"),",
          "    lambda e: e[\"event_type\"] == \"NETWORK_CONNECTION\"",
          "              and e[\"details\"].get(\"destination\") == \"198.51.100.42:8443\",",
          "]",
          "def is_nightfall(items):",
          "    positions = [next((i for i, e in enumerate(items) if rule(e)), -1)",
          "                 for rule in rules]",
          "    return -1 not in positions and positions == sorted(positions)",
        ],
      },
      {
        text: "דרשו בדיוק הפעלה אחת שמתאימה.",
        words: "אפס התאמות אינן הוכחה; שתי התאמות הן עמימות. בשני המקרים עוצרים.",
        code: [
          "candidates = [(sid, items) for sid, items in sessions.items()",
          "              if is_nightfall(items)]",
          "if len(candidates) != 1:",
          "    raise RuntimeError(f\"Expected one session, found {len(candidates)}\")",
          "session_id, suspicious_events = candidates[0]",
        ],
      },
      {
        text: "שמרו nightfall_timeline.json עם כל אירועי ההפעלה החשודה.",
        words: "הפלט כולל מזהים, טווח זמן, מונה ואת הרשימה המלאה בסדר כרונולוגי.",
        code: [
          "import json",
          "from pathlib import Path",
          "timeline = {",
          "    \"computer_id\": computer_id,",
          "    \"session_id\": session_id,",
          "    \"started_at\": suspicious_events[0][\"timestamp\"],",
          "    \"ended_at\": suspicious_events[-1][\"timestamp\"],",
          "    \"event_count\": len(suspicious_events),",
          "    \"events\": suspicious_events,",
          "}",
          "Path(\"nightfall_timeline.json\").write_text(",
          "    json.dumps(timeline, indent=2), encoding=\"utf-8\")",
        ],
      },
      {
        text: "אל תקבעו computer_id, session_id, event_id או cursor; השתמשו ב-timeout וב-raise_for_status.",
        words: "כל הערכים מגיעים מה-API. cursor מתחיל רק ב-0 לפי החוזה וממשיך מ-next_cursor.",
        code: [
          "response = session.get(url, params=params, timeout=10)",
          "response.raise_for_status()",
        ],
      },
      {
        text: "כתבו ארבע בדיקות: מספר עמודים, עמוד אחרון, כפילות ושתי הפעלות חשודות.",
        words: "מבודדים את פונקציות collect_events ו-find_session ומזריקים להן תגובות או רשימות.",
        code: [
          "def test_duplicate_event_is_kept_once():",
          "    result = deduplicate([event, event])",
          "    assert len(result) == 1",
          "",
          "def test_two_matching_sessions_fail():",
          "    with pytest.raises(RuntimeError):",
          "        find_session({\"a\": matching, \"b\": matching})",
        ],
      },
      {
        text: "הדפיסו סיכום של מספר האירועים, ההפעלות, ההפעלה החשודה וטווח הזמנים.",
        words: "הסיכום אינו מדפיס את כל האירועים.",
        code: [
          "print({\"events\": len(events), \"sessions\": len(sessions),",
          "       \"nightfall_session\": session_id,",
          "       \"from\": timeline[\"started_at\"], \"to\": timeline[\"ended_at\"]})",
        ],
      },
    ],
  },
  {
    part: 8,
    folder: "08 - העברה מקוטעת מאומתת",
    title: "הורדה מקבילית, חידוש ואימות",
    context: "במקום תגובת הורדה אחת, יש להוריד את החבילה במקטעים, לאמת כל מקטע ואת החבילה השלמה ולתמוך בחידוש.",
    goal: "הורידו את כל chunks במקביל, אמתו SHA-256, הרכיבו לפי אינדקס ושמרו nightfall_evidence_advanced.json.",
    exerciseNotes: [
      "תחילה יוצרים NIGHTFALL_EVIDENCE ושומרים package_id.",
      "נקודות הקצה של manifest ושל מקטע מופיעות בבלוק הקוד הבא.",
    ],
    exerciseCode: [
      "GET /computers/{computer_id}/evidence-packages/{package_id}/transfer-manifest",
      "GET /computers/{computer_id}/evidence-packages/{package_id}/chunks/{chunk_index}",
    ],
    requirements: [
      {
        text: "בדקו את ה-manifest: sha256, מספר מקטעים ורשימת chunks.",
        words: "ה-manifest הוא מקור האמת לאינדקסים, לגדלים ול-checksums.",
        code: [
          "manifest = api_get(manifest_url)",
          "if manifest[\"checksum_algorithm\"] != \"sha256\":",
          "    raise RuntimeError(\"Unsupported checksum\")",
          "if len(manifest[\"chunks\"]) != manifest[\"chunk_count\"]:",
          "    raise RuntimeError(\"Manifest chunk count mismatch\")",
        ],
      },
      {
        text: "הורידו במקביל עם ThreadPoolExecutor ו-max_workers=4.",
        words: "כל משימה מחזירה זוג של אינדקס ובתים. סדר סיום המשימות אינו סדר ההרכבה.",
        code: [
          "from concurrent.futures import ThreadPoolExecutor, as_completed",
          "parts = {}",
          "with ThreadPoolExecutor(max_workers=4) as pool:",
          "    futures = {pool.submit(download_chunk, c): c[\"chunk_index\"]",
          "               for c in manifest[\"chunks\"]}",
          "    for future in as_completed(futures):",
          "        index, data = future.result()",
          "        parts[index] = data",
        ],
      },
      {
        text: "אמתו package_id, computer_id ו-chunk_index בכל תגובה.",
        words: "מונעים חיבור של מקטע מחבילה או מחשב אחר.",
        code: [
          "if chunk[\"package_id\"] != package_id: raise RuntimeError(\"Wrong package\")",
          "if chunk[\"computer_id\"] != computer_id: raise RuntimeError(\"Wrong computer\")",
          "if chunk[\"chunk_index\"] != expected[\"chunk_index\"]:",
          "    raise RuntimeError(\"Wrong chunk index\")",
        ],
      },
      {
        text: "פענחו Base64, בדקו גודל ואמתו את שני ה-checksums של המקטע.",
        words: "ה-hash חייב להתאים גם לתגובה וגם לרשומה המקבילה ב-manifest.",
        code: [
          "raw = base64.b64decode(chunk[\"data\"], validate=True)",
          "if len(raw) != expected[\"size_bytes\"]: raise RuntimeError(\"Wrong size\")",
          "actual = hashlib.sha256(raw).hexdigest()",
          "if actual != chunk[\"checksum\"] or actual != expected[\"checksum\"]:",
          "    raise RuntimeError(\"Chunk checksum mismatch\")",
        ],
      },
      {
        text: "שמרו מקטע רק לאחר אימות ועדכנו מצב מקומי.",
        words: "כותבים את בתי המקטע ואז מוסיפים את האינדקס לרשימת completed.",
        code: [
          "part_path = parts_dir / f\"{index:05d}.part\"",
          "part_path.write_bytes(raw)",
          "state[\"completed\"] = sorted(set(state[\"completed\"]) | {index})",
          "write_json_atomic(state_path, state)",
        ],
      },
      {
        text: "הרכיבו לפי chunk_index עולה ואמתו אורך ו-SHA-256 כוללים.",
        words: "ממיינים אינדקסים במפורש, מחברים בתים ומשווים ל-total_size_bytes ול-checksum.",
        code: [
          "assembled = b\"\".join(parts[i] for i in range(manifest[\"chunk_count\"]))",
          "if len(assembled) != manifest[\"total_size_bytes\"]:",
          "    raise RuntimeError(\"Total size mismatch\")",
          "if hashlib.sha256(assembled).hexdigest() != manifest[\"checksum\"]:",
          "    raise RuntimeError(\"Package checksum mismatch\")",
        ],
      },
      {
        text: "רק לאחר האימות פענחו UTF-8 ושמרו JSON.",
        words: "אין לכתוב פלט סופי אם האימות הכולל נכשל.",
        code: [
          "evidence = json.loads(assembled.decode(\"utf-8\"))",
          "Path(\"nightfall_evidence_advanced.json\").write_text(",
          "    json.dumps(evidence, indent=2), encoding=\"utf-8\")",
        ],
      },
      {
        text: "תמכו בחידוש עם package_id, checksum ואינדקסים מאומתים.",
        words: "טוענים מצב רק אם הוא שייך לאותו manifest. כל קובץ מקומי נבדק שוב לפני דילוג.",
        code: [
          "same_transfer = (state.get(\"package_id\") == package_id",
          "                 and state.get(\"checksum\") == manifest[\"checksum\"])",
          "if not same_transfer:",
          "    state = {\"package_id\": package_id,",
          "             \"checksum\": manifest[\"checksum\"], \"completed\": []}",
        ],
      },
      {
        text: "כתבו מצב אטומי ונקו קבצי ביניים רק לאחר הצלחה.",
        words: "os.replace מחליף את קובץ המצב בפעולה אחת. ניקוי מוקדם ימנע חידוש.",
        code: [
          "def write_json_atomic(destination, value):",
          "    temporary = destination.with_suffix(\".tmp\")",
          "    temporary.write_text(json.dumps(value), encoding=\"utf-8\")",
          "    os.replace(temporary, destination)",
          "# After final verification: shutil.rmtree(parts_dir); state_path.unlink()",
        ],
      },
      {
        text: "נסו שוב עד שלוש פעמים רק עבור timeout, connection error או 5xx.",
        words: "מבצעים ניסיון ראשון ועוד עד שלושה ניסיונות חוזרים. 4xx אינה משתפרת בניסיון חוזר; ההמתנות הן 0.5, 1 ו-2 שניות.",
        code: [
          "delays = [0.5, 1, 2]",
          "for attempt in range(len(delays) + 1):",
          "    try:",
          "        response = session.get(url, timeout=10)",
          "        if 400 <= response.status_code < 500: response.raise_for_status()",
          "        response.raise_for_status()",
          "        break",
          "    except (requests.Timeout, requests.ConnectionError):",
          "        if attempt == len(delays): raise",
          "        time.sleep(delays[attempt])",
          "    except requests.HTTPError as exc:",
          "        if exc.response.status_code < 500 or attempt == len(delays): raise",
          "        time.sleep(delays[attempt])",
        ],
      },
      {
        text: "בדקו סדר אקראי, checksum שגוי, חידוש, checksum כולל ו-404 מול 503.",
        words: "מזריקים downloader מזויף כדי לבדוק את האלגוריתם בלי רשת אמיתית.",
        code: [
          "@pytest.mark.parametrize(\"status,calls\", [(404, 1), (503, 4)])",
          "def test_retry_policy(status, calls):",
          "    fake = FakeSession(status)",
          "    with pytest.raises(requests.HTTPError): download_with_retry(fake, \"/x\")",
          "    assert fake.calls == calls",
        ],
      },
    ],
  },
  {
    part: 9,
    folder: "09 - לקוח NIGHTFALL עמיד",
    title: "פרויקט מסכם: לקוח עמיד וניתן לבדיקה",
    context: "נדרש כלי שורת פקודה אחד שמשלב את כל הזרימה, ציר הזמן, ההעברה המקוטעת, checkpoint, לוגים ובדיקות.",
    goal: "בנו לקוח מודולרי שמסיים ריצה נקייה, ממשיך ריצה שנקטעה ומפיק report.json וקובץ ראיות מאומת.",
    exerciseNotes: [
      "פקודת ההרצה המלאה מופיעה בבלוק הקוד הבא.",
      "את הסיסמה קוראים מ-NIGHTFALL_PASSWORD. אין לקבל או לקבע token, computer_id, file_id, session_id או package_id.",
      "קודי יציאה: 0 הצלחה, 2 קלט, 3 API, 4 אימות, 5 קובץ מקומי.",
    ],
    exerciseCode: [
      "python nightfall.py --base-url http://127.0.0.1:8000 \\",
      "  --username sigitattacker --output-dir ./output --workers 4",
    ],
    requirements: [
      {
        text: "ממשו CLI וקראו את הסיסמה ממשתנה סביבה.",
        words: "argparse מטפל בארגומנטים שאינם סודיים. הסיסמה אינה מופיעה בהיסטוריית הפקודות.",
        code: [
          "parser = argparse.ArgumentParser()",
          "parser.add_argument(\"--base-url\", required=True)",
          "parser.add_argument(\"--username\", required=True)",
          "parser.add_argument(\"--output-dir\", type=Path, required=True)",
          "parser.add_argument(\"--workers\", type=int, default=4)",
          "args = parser.parse_args()",
          "password = os.environ.get(\"NIGHTFALL_PASSWORD\")",
          "if not password: parser.error(\"NIGHTFALL_PASSWORD is required\")",
        ],
      },
      {
        text: "בצעו את כל זרימת ה-API לפי הסדר, ללא מזהים מוכנים מראש.",
        words: "כל פונקציה מחזירה את הערך לשלב הבא. orchestration רק מחבר בין השלבים.",
        code: [
          "token = client.login(username, password)",
          "target = discover_target(client.list_computers())",
          "detail = client.get_computer(target.id)",
          "events = collect_events(client, target.id)",
          "timeline = find_nightfall_session(events)",
          "files = search_high_files(client, target.id, detail.recent_directories)",
          "package = client.create_package(target.id, files)",
          "evidence, sha256 = transfer.download(package)",
        ],
      },
      {
        text: "הפרידו config, api_client, discovery, transfer, models, nightfall ו-tests.",
        words: "כל מודול מקבל אחריות אחת. nightfall.py אינו מכיל פרטי HTTP או checksum.",
        code: [
          "# nightfall.py",
          "def run(config, client, checkpoint_store):",
          "    target = discovery.discover_target(client.list_computers())",
          "    return workflow.complete(config, client, target, checkpoint_store)",
        ],
      },
      {
        text: "רכזו HTTP ב-api_client עם timeout=10 ומיפוי שגיאות.",
        words: "מעטפת אחת מונעת שכחת timeout ומתרגמת את error של השרת לחריגה ברורה.",
        code: [
          "class ApiClient:",
          "    def request(self, method, path, **kwargs):",
          "        response = self.session.request(",
          "            method, self.base_url + path, timeout=10, **kwargs)",
          "        if not response.ok:",
          "            body = response.json()",
          "            raise ApiError(method, path, response.status_code, body.get(\"error\"))",
          "        return response.json()",
        ],
      },
      {
        text: "שמרו checkpoint אטומי אחרי כל שלב, ללא token או סיסמה.",
        words: "ה-checkpoint מכיל schema_version, base_url, המזהים שהתגלו, checksum, completed_stage ו-updated_at.",
        code: [
          "checkpoint = {",
          "    \"schema_version\": 1, \"base_url\": config.base_url,",
          "    \"computer_id\": target.id, \"session_id\": timeline.session_id,",
          "    \"file_ids\": file_ids, \"package_id\": package_id,",
          "    \"manifest_checksum\": checksum,",
          "    \"completed_stage\": \"package_created\",",
          "    \"updated_at\": datetime.now(UTC).isoformat(),",
          "}",
          "write_json_atomic(config.output_dir / \"checkpoint.json\", checkpoint)",
        ],
      },
      {
        text: "אמתו checkpoint בחידוש וטפלו ב-PACKAGE_NOT_FOUND מחזרה לשלב יצירת החבילה.",
        words: "גרסה, base_url ושדות חובה חייבים להתאים. package שנעלם אינו מחייב גילוי מחדש.",
        code: [
          "if checkpoint[\"schema_version\"] != 1: raise InputError(\"Unsupported checkpoint\")",
          "if checkpoint[\"base_url\"] != config.base_url: raise InputError(\"Wrong base URL\")",
          "try:",
          "    manifest = client.get_manifest(checkpoint[\"package_id\"])",
          "except ApiError as exc:",
          "    if exc.error != \"PACKAGE_NOT_FOUND\": raise",
          "    package = client.create_package(checkpoint[\"computer_id\"], checkpoint[\"file_ids\"])",
        ],
      },
      {
        text: "אמתו case, status, operation_location ו-planned_time.",
        words: "checksum מוכיח שלמות; בדיקת השדות מוכיחה שקיבלנו את המסמך הנכון.",
        code: [
          "if evidence.get(\"case\") != \"NIGHTFALL\": raise VerificationError()",
          "if evidence.get(\"status\") != \"EVIDENCE_RECOVERED\": raise VerificationError()",
          "for key in (\"operation_location\", \"planned_time\"):",
          "    if not evidence.get(key): raise VerificationError(f\"Missing {key}\")",
        ],
      },
      {
        text: "כתבו report.json במבנה שנדרש והדפיסו סיכום ללא סודות.",
        words: "הדוח מרכז את המחשב, ציר הזמן, החבילה והפעולה. אין בו token, password או Base64.",
        code: [
          "report = {",
          "  \"status\": \"SUCCESS\",",
          "  \"computer\": {\"id\": target.id, \"hostname\": target.hostname},",
          "  \"timeline\": {\"session_id\": timeline.session_id,",
          "                 \"event_count\": len(timeline.events)},",
          "  \"evidence\": {\"file_count\": len(file_ids), \"package_id\": package_id,",
          "               \"sha256\": checksum, \"path\": str(evidence_path)},",
          "  \"operation\": {\"location\": evidence[\"operation_location\"],",
          "                \"planned_time\": evidence[\"planned_time\"]},",
          "}",
          "write_json_atomic(output_dir / \"report.json\", report)",
        ],
      },
      {
        text: "השתמשו ב-logging; בכל שגיאה כללו stage/method/path/status/error בלי תוכן סודי.",
        words: "מעבירים רק מטא-נתונים בטוחים ללוג. הסיכום הסופי לבדו נכתב ל-stdout.",
        code: [
          "logger.error(\"api_failure stage=%s method=%s path=%s status=%s error=%s\",",
          "             stage, exc.method, exc.path, exc.status_code, exc.error)",
          "# Do not log headers, password, token, data or complete response bodies.",
        ],
      },
      {
        text: "החזירו קודי יציאה 0, 2, 3, 4 ו-5 לפי סוג הכשל.",
        words: "main מחזיר מספר; נקודת הכניסה מעבירה אותו ל-SystemExit.",
        code: [
          "try: return run(config)",
          "except InputError: return 2",
          "except ApiError: return 3",
          "except VerificationError: return 4",
          "except OSError: return 5",
          "# success returns 0",
        ],
      },
      {
        text: "כתבו את מערך הבדיקות המינימלי ובדיקת אינטגרציה מלאה.",
        words: "מפרידים בדיקות בחירה, pagination, transfer, checkpoint וסודות; לבסוף מריצים זרימה מלאה מול TestClient או שרת מקומי.",
        code: [
          "def test_full_run_creates_verified_outputs(api_server, tmp_path, monkeypatch):",
          "    monkeypatch.setenv(\"NIGHTFALL_PASSWORD\", \"LamaLoKapara\")",
          "    code = main([\"--base-url\", api_server, \"--username\", \"sigitattacker\",",
          "                 \"--output-dir\", str(tmp_path)])",
          "    assert code == 0",
          "    assert (tmp_path / \"report.json\").exists()",
          "    assert (tmp_path / \"nightfall_evidence_advanced.json\").exists()",
        ],
      },
      {
        text: "הגישו קוד מודולרי, requirements.txt, README ופלט pytest.",
        words: "ה-README מסביר התקנה, משתנה סביבה, הרצה, חידוש ובדיקות. requirements כולל רק תלויות בשימוש.",
        code: [
          "python -m pip install -r requirements.txt",
          "$env:NIGHTFALL_PASSWORD = \"LamaLoKapara\"",
          "python nightfall.py --base-url http://127.0.0.1:8000 --username sigitattacker --output-dir output",
          "python -m pytest -q",
        ],
      },
    ],
    finalNote: "הפתרון המלא אינו פונקציה ארוכה אחת: הוא שילוב של לקוח HTTP, לוגיקת גילוי, לוגיקת transfer, checkpoint ו-orchestrator קטן שניתן לבדיקה.",
    appendixTitle: "מבנה מסירה מוצע",
    appendixCode: [
      "nightfall-client/",
      "  config.py",
      "  api_client.py",
      "  discovery.py",
      "  transfer.py",
      "  models.py",
      "  nightfall.py",
      "  requirements.txt",
      "  README.md",
      "  tests/",
      "    test_discovery.py",
      "    test_transfer.py",
      "    test_checkpoint.py",
      "    test_integration.py",
    ],
    appendixNotes: [
      "הריצו pytest לפני ההגשה ושמרו את הפלט.",
      "הריצו פעם אחת מתיקיית output ריקה ופעם נוספת כדי לבדוק חידוש.",
      "חפשו ב-logs וב-checkpoint את המילים password, token ו-data וודאו שאין ערכים סודיים.",
    ],
  },
];

function mixedRuns(text, options = {}) {
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
    keepNext: options.keepNext,
    pageBreakBefore: options.pageBreakBefore,
    spacing: { before: options.before || 0, after: options.after ?? 100, line: options.line || 285 },
    shading: options.shading,
    border: options.border,
    indent: options.indent,
    numbering: options.numbering,
    children: mixedRuns(text, options),
  });
}

function heading(text, level = 1, pageBreakBefore = false) {
  return rtl(text, {
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    bold: true,
    color: level === 1 ? navy : blue,
    size: level === 1 ? 32 : 26,
    before: level === 1 ? 220 : 150,
    after: 100,
    keepNext: true,
    pageBreakBefore,
  });
}

function code(lines) {
  return lines.map((line, index) => new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: false,
    keepNext: index < lines.length - 1,
    spacing: { before: 0, after: 0, line: 235 },
    shading: { fill: codeGray, type: ShadingType.CLEAR },
    indent: { left: 180, right: 180 },
    children: [new TextRun({ text: line || " ", font: "Consolas", size: 17 })],
  }));
}

function note(text, fill = paleYellow) {
  return rtl(text, {
    shading: { fill, type: ShadingType.CLEAR },
    border: { right: { style: BorderStyle.SINGLE, size: 10, color: blue, space: 6 } },
    indent: { right: 160, left: 160 },
    after: 130,
  });
}

function bullet(text, reference) {
  return rtl(text, {
    numbering: { reference, level: 0 },
    indent: { right: 700, hanging: 320 },
    after: 65,
  });
}

function requirementAnswer(item, index) {
  return [
    rtl(`דרישה ${index + 1}: ${item.text}`, {
      bold: true,
      color: navy,
      size: 24,
      before: 170,
      after: 75,
      keepNext: true,
      shading: { fill: paleBlue, type: ShadingType.CLEAR },
      indent: { right: 100, left: 100 },
    }),
    rtl(`במילים: ${item.words}`, { after: 70, keepNext: item.code.length > 0 }),
    ...code(item.code),
  ];
}

function makeDocument(exercise) {
  const numberRef = `requirements-${exercise.part}`;
  const bulletRef = `notes-${exercise.part}`;
  const children = [
    rtl(`SIGIT | חלק ${exercise.part} | תרגיל ופתרון מלא`, {
      bold: true,
      color: "FFFFFF",
      size: 23,
      shading: { fill: navy, type: ShadingType.CLEAR },
      after: 180,
    }),
    rtl(exercise.title, { bold: true, color: navy, size: 42, after: 70 }),
    note("מסמך תשובות למדריך: תחילה מופיע התרגיל המלא, ולאחריו פתרון קצר ומוסבר לכל דרישה.", paleGreen),
    heading("התרחיש"),
    ...sharedScenario.map((text) => rtl(text)),
    rtl(exercise.context),
    heading("התרגיל המלא"),
    rtl(exercise.goal, { bold: true }),
  ];

  if (exercise.exerciseNotes) {
    children.push(heading("חוזה ה-API וכללי החלק", 2));
    for (const text of exercise.exerciseNotes) children.push(bullet(text, bulletRef));
    if (exercise.exerciseCode) children.push(...code(exercise.exerciseCode));
  }

  children.push(heading("הדרישות", 2));
  for (const item of exercise.requirements) {
    children.push(rtl(item.text, {
      numbering: { reference: numberRef, level: 0 },
      indent: { right: 700, hanging: 320 },
      after: 65,
    }));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading("פתרון מוסבר", 1));
  children.push(note("קטעי הקוד ממוקדים בדרישה הנוכחית. משתנים כגון session, computer_id, locations, file_ids ו-package_id מתקבלים מהשלבים הקודמים ואינם ערכים שיש לקבע מראש.", paleBlue));
  exercise.requirements.forEach((item, index) => children.push(...requirementAnswer(item, index)));

  children.push(heading("בדיקת סיום"));
  children.push(note(exercise.finalNote || "הפתרון עומד בדרישה כאשר כל הערכים מגיעים מתגובות ה-API, כל בקשה נבדקת, אין סודות בפלט ותוצאת השלב נשמרת לשלב הבא.", paleGreen));
  if (exercise.appendixTitle) {
    children.push(heading(exercise.appendixTitle, 2));
    children.push(...code(exercise.appendixCode));
    for (const text of exercise.appendixNotes || []) children.push(bullet(text, bulletRef));
  }

  return new Document({
    creator: "OpenAI Codex",
    title: `NIGHTFALL part ${exercise.part} exercise and answer`,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, language: { bidirectional: "he-IL" } },
          paragraph: { spacing: { after: 100, line: 285 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 32, bold: true, color: navy },
          paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 0, keepNext: true },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 26, bold: true, color: blue },
          paragraph: { spacing: { before: 150, after: 90 }, outlineLevel: 1, keepNext: true },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: numberRef,
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.RIGHT,
            style: { paragraph: { indent: { right: 700, hanging: 320 } } },
          }],
        },
        {
          reference: bulletRef,
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.RIGHT,
            style: { paragraph: { indent: { right: 700, hanging: 320 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 960, bottom: 900, left: 960 },
        },
      },
      headers: {
        default: new Header({ children: [rtl(`NIGHTFALL | חלק ${exercise.part} | תרגיל ופתרון`, {
          size: 17,
          color: "666666",
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "B4C6E7", space: 3 } },
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "SIGIT Answer Key  |  ", font: "Arial", size: 17, color: "666666" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 17, color: "666666" }),
          ],
        })] }),
      },
      children,
    }],
  });
}

async function main() {
  for (const exercise of exercises) {
    const folder = path.join(root, exercise.folder);
    fs.mkdirSync(folder, { recursive: true });
    const filename = `חלק ${exercise.part} - תרגיל ופתרון.docx`;
    const buffer = await Packer.toBuffer(makeDocument(exercise));
    fs.writeFileSync(path.join(folder, filename), buffer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
