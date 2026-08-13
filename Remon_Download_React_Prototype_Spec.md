# Remon Download — مواصفات Prototype (React)
## المرحلة الأولى: بناء الواجهة وتجربة المستخدم قبل التحويل إلى Electron

---

## 1. الهدف من هذه المرحلة

هذه المرحلة **Prototype / UI MVP** وليست النسخة النهائية.

الهدف: بناء وتجربة واجهة البرنامج وتجربة المستخدم (UX) باستخدام React فقط، قبل تحويل المشروع لاحقًا إلى تطبيق Desktop حقيقي عبر **Electron**.

**قواعد صارمة لهذه المرحلة:**
- ❌ لا تحويل للمشروع إلى Electron الآن
- ❌ لا بناء Backend حقيقي الآن
- ❌ لا ربط فعلي بـ yt-dlp أو FFmpeg
- ✅ استخدام Mock Data وMock Services لمحاكاة التحليل، التحميل، التقدم، والأخطاء
- ✅ بنية المشروع منظمة بحيث يمكن لاحقًا نقل منطق التطبيق إلى Electron + Node.js **دون إعادة بناء الواجهة من الصفر**

---

## 2. التقنيات المطلوبة

| التقنية | الاستخدام |
|---|---|
| React | مكتبة الواجهة الأساسية |
| TypeScript | Type Safety عبر المشروع بالكامل |
| Vite | أداة البناء والتشغيل |
| Tailwind CSS | التنسيق والتصميم |
| React Router | التنقل بين الصفحات |
| Zustand | إدارة الحالة (State Management) |
| Lucide React | مكتبة الأيقونات |

**ممنوع استخدامه في هذه المرحلة:** Vue، Next.js، أي Backend، Electron.

**قرار محسوم بخصوص إدارة الحالة:** يُستخدم **Zustand** حصريًا (وليس Context API)، لأن المشروع يحتوي على حالة معقدة ومترابطة عبر عدة نطاقات (Queue، Downloads، History، Favorites، Scheduler، Settings)، وZustand أنسب من Context API لهذا الحجم من الـ State من ناحية الأداء (تجنّب Re-renders غير ضرورية) وسهولة التنظيم (Stores منفصلة لكل نطاق).

**قرار محسوم بخصوص بيئة Node.js:** يُستخدم **Node.js 20 LTS أو 22 LTS حصريًا**. لا يجوز استخدام أي إصدار غير LTS (مثل الإصدارات الفردية/التجريبية)، لضمان الاستقرار طويل المدى للمشروع.

**قرار محسوم بخصوص TypeScript:** يجب تفعيل **TypeScript Strict Mode** (`"strict": true` في `tsconfig.json`) منذ بداية المشروع. **لا يُستخدم `any`** إلا في حالة استثنائية موثّقة بتعليق يشرح السبب مباشرة فوق مكان الاستخدام. هذا الالتزام مهم بشكل خاص لأن المشروع سيكبر تدريجيًا (خصوصًا في طبقتَي الـ Services والـ Stores)، والـ Strict Mode يمنع أخطاء كثيرة أثناء الانتقال لاحقًا إلى Electron.

---

## 3. مهم جدًا — لا يوجد Login

البرنامج **Desktop Application مستقل** يعمل بدون حساب، ولا يحتوي إطلاقًا على:

- Login / Register
- User Account / Profile
- Email Authentication / Password
- Cloud Account
- Subscription Account

**لا يُنشأ أي شاشة Login أو Register أو Profile.**

---

## 4. الهوية البصرية

**اسم البرنامج:** Remon Download

التصميم يجب أن يكون:
- Clean / Modern / Professional / Minimal / Fast-looking
- مناسب لبرنامج **Download Manager**، وليس تصميم موقع ويب تقليدي

**عناصر الواجهة الأساسية:**
- Sidebar
- Top Bar
- Main Content
- Cards
- Tables / Lists
- Progress Indicators
- Toast Notifications
- Modal Dialogs

**الثيمات المدعومة:** Dark Mode / Light Mode / System Theme
**التصميم:** Responsive قدر الإمكان (مُحسَّن أساسًا لأحجام Desktop)

---

## 5. اللغة والتوطين (Localization)

البرنامج يدعم: **العربية** و**English**

- تصميم الواجهة من البداية بحيث تدعم **RTL** و**LTR**
- عدم وضع النصوص داخل المكونات بشكل يصعب ترجمته لاحقًا
- إنشاء نظام Localization بسيط من البداية (i18n)

---

## 6. صفحات البرنامج

1. Dashboard
2. Downloads / Queue
3. History
4. Favorites
5. Scheduler
6. Settings
7. About

---

## 7. Dashboard (الصفحة الرئيسية)

### Quick Add URL
حقل كبير للصق رابط YouTube. عند إدخال الرابط والضغط على **Analyze**:

- محاكاة تحليل الفيديو (Mock)
- عرض بيانات Mock:

| الحقل | مثال |
|---|---|
| Thumbnail | صورة مصغرة |
| Title | Amazing Nature Documentary |
| Channel | Example Channel |
| Duration | 12:34 |
| Views | 1.2M |
| Quality | 2160p / 1440p / 1080p / 720p / 480p / 360p |
| Formats | MP4 / MKV / WEBM |
| Audio | MP3 / M4A / WAV / FLAC |

### 7.1 التحقق من صحة الرابط (URL Validation)

يجب معالجة الحالات التالية بشكل صريح في حقل Quick Add URL:

| الحالة | السلوك المطلوب |
|---|---|
| حقل فارغ عند الضغط على Analyze | رسالة واضحة تطلب إدخال رابط (Validation Message تحت الحقل، ليست Toast) |
| رابط بصيغة غير صحيحة (ليس URL صالحًا) | Validation Error فوري، بدون إرسال طلب تحليل |
| رابط صحيح لكن من منصة غير مدعومة (غير يوتيوب) | رسالة "Unsupported URL" واضحة |
| أثناء التحليل (Analyzing) | زر Analyze يتحول لحالة **Loading/Disabled**، مع مؤشر تحميل داخل الزر |
| محاولة إرسال نفس الطلب أكثر من مرة أثناء التحليل | **يُمنع** إرسال طلب تحليل جديد حتى ينتهي الطلب الحالي أو يفشل |

---

## 8. تحليل نوع الرابط

محاكاة اكتشاف نوع الرابط تلقائيًا:

- Video
- Shorts
- Playlist
- Video inside Playlist
- Channel

**يجب عرض نوع الرابط المكتشف للمستخدم**، مثال:

> "تم اكتشاف فيديو داخل قائمة تشغيل — سيتم تحميل هذا الفيديو فقط."

### في حالة Playlist، تُعرض:
- Playlist Title
- عدد الفيديوهات
- قائمة الفيديوهات (Thumbnail / Title / Duration / Selection Checkbox)
- أزرار: Select All / Deselect All / Download Selected / Download Entire Playlist

---

## 9. Download Queue

Download Manager UI حقيقي من ناحية التفاعل، باستخدام Mock Data.

**كل Download Item يحتوي على:**
Thumbnail, Title, Quality, Format, File Size, Downloaded Size, Speed, ETA, Progress, Status

**الحالات (Status):**
`Queued → Analyzing → Downloading → Paused → Merging → Converting → Completed / Failed / Canceled / Retrying`

**الأزرار:** Pause / Resume / Cancel / Retry / Remove

**إضافي:** دعم Drag & Drop لإعادة ترتيب عناصر الـ Queue

**ملاحظة تقنية:** يجب تنفيذ Drag & Drop باستخدام **مكتبة React مستقرة ومناسبة لهذا الغرض** (مثال: مكتبات Drag & Drop المعروفة والمُختبرة جيدًا في نظام React البيئي). **لا يُبنى نظام Drag & Drop معقد يدويًا من الصفر بدون ضرورة واضحة.** اختيار المكتبة المحددة قرار تقني قابل للمراجعة لاحقًا (يُدوَّن في `DECISIONS.md` عند اتخاذه)، ولا داعي لتثبيت اسم مكتبة بعينها في هذه المواصفات.

---

## 10. محاكاة التحميل

عند الضغط على Download: بدء **Progress Simulation** (مثال: 0% → 10% → 25% → 40% → 60% → 80% → 100%)

**تُعرض أثناء التحميل:** Download Speed, ETA, Downloaded/Total

**عند الوصول لـ 100%:**
`Downloading → Merging → Converting → Completed`

استخدام حالات واضحة ومتحركة. **لا تحميل حقيقي في هذه المرحلة.**

---

## 11. Concurrent Downloads

إعداد "عدد التحميلات المتزامنة" في الواجهة:
- الخيارات: 1 / 2 / 3 / 4 / 5 / 10
- **الافتراضي: 3**
- محاكاة أن 3 عناصر فقط يمكن أن تكون Downloading في نفس الوقت

---

## 12. Speed Limiter

**الخيارات:** 500 KB/s / 1 MB/s / 5 MB/s / 10 MB/s / Unlimited

يظهر في Settings وفي Download UI عند الحاجة.

---

## 13. History

صفحة تحتوي على تحميلات: **Completed / Failed / Canceled**

**كل عنصر:** Thumbnail, Title, Date, Quality, Format, File Size, Status
**الأزرار:** Re-download / Open Folder / Remove

(استخدام Mock Data)

---

## 14. Favorites

**كل عنصر:** Thumbnail, Title, Channel, Date Added
**الأزرار:** Download / Remove Favorite

---

## 15. Scheduler

إنشاء جدولة تحميل (Scheduled Download):

**الحقول:** URL, Date, Time, Repeat (Once / Daily / Weekly)

عرض قائمة بكل الجدولات القائمة.

**ملاحظة:** لا تنفيذ فعلي للجدولة في هذه المرحلة — UI + State Simulation فقط.

---

## 16. Settings

تنظيم الإعدادات في أقسام (Sections):

### General
- Download Folder
- Start with Windows
- Minimize to Tray

### Appearance
- Light / Dark / System

### Language
- Arabic / English

### Downloads
- Concurrent Downloads
- Speed Limit
- Default Quality
- Default Video Format
- Default Audio Format

### Notifications
- Enable Notifications
- Notification when completed
- Notification when failed

### Clipboard
- Clipboard Monitoring
- Ask before downloading

### Advanced
- yt-dlp path
- FFmpeg path
- Proxy

**ملاحظة:** في مرحلة الـ Prototype، تُحفظ إعدادات الواجهة باستخدام `localStorage` فقط، لضمان استمرارية التجربة بين جلسات المتصفح. **لا يُستخدم SQLite أو أي تخزين على مستوى نظام التشغيل** في هذه المرحلة — هذا سيُستبدل لاحقًا بتخزين حقيقي (SQLite) عند التحويل إلى Electron.

---

## 17. Smart File Naming

قسم في Settings لتعديل **File Name Template**:

**مثال Template:**
```
%(uploader)s - %(title)s [%(resolution)s].%(ext)s
```

**مع Live Preview، مثال:**
```
Example Channel - Amazing Nature Documentary [1080p].mp4
```

---

## 18. Video Info (معلومات متقدمة)

عند تحليل الفيديو، تُعرض (Mock Data):
Resolution, FPS, Video Codec, Audio Codec, Video Bitrate, Audio Bitrate, Container, File Size, Upload Date, Views

---

## 19. Notifications (Toast)

إشعارات لكل من:
- Download Started
- Download Completed
- Download Failed
- Download Paused
- Download Resumed

بتصميم احترافي.

---

## 20. About

**اسم البرنامج:** Remon Download

وصف مختصر: البرنامج مخصص لتنزيل وإدارة الفيديوهات والملفات الإعلامية بطريقة منظمة وسهلة.

**تُعرض:** Version / Developer / Contact

**ملاحظة:** بدون أي Login أو Account.

---

## 21. Taskbar / Desktop Features (تحضير فقط)

في هذه المرحلة **لا تنفيذ فعلي** لوظائف Windows، لكن يُصمَّم الـ UI بحيث يمكن لاحقًا دعم:

- Taskbar Progress
- System Tray
- Native Notifications
- Auto Start
- Clipboard Monitoring

---

## 22. البنية المعمارية للمشروع (Architecture)

تنظيم قابل للتحويل لاحقًا إلى Electron:

```
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── stores/
├── services/
├── types/
├── utils/
├── i18n/
├── mock/
└── assets/
```

**Interfaces واضحة للـ Services:**
- `DownloadService`
- `MetadataService`
- `HistoryService`
- `FavoritesService`
- `SchedulerService`
- `SettingsService`

في هذه المرحلة، تُستخدم **Mock Implementations فقط** لهذه الـ interfaces.

### 22.1 نماذج البيانات الأساسية (Data Models)

لضمان وجود **مصدر واحد للحقيقة (Single Source of Truth)** لشكل البيانات عبر المشروع بالكامل — بدلاً من أن يخترع كل جزء من الكود (أو كل AI جديد) شكل البيانات بطريقته الخاصة — يجب تعريف الـ Entities الأساسية التالية داخل مجلد `src/types/` منذ بداية المشروع:

| Entity | الوصف المختصر |
|---|---|
| `VideoMetadata` | بيانات الفيديو بعد التحليل (العنوان، القناة، المدة، الجودات المتاحة، إلخ) |
| `DownloadItem` | عنصر داخل قائمة الانتظار/التحميل (الحالة، التقدم، السرعة، ETA، إلخ) |
| `Playlist` | بيانات قائمة تشغيل (العنوان، عدد الفيديوهات) |
| `PlaylistItem` | عنصر مفرد داخل قائمة تشغيل |
| `HistoryItem` | عنصر في سجل التحميلات (مكتمل/فاشل/ملغى) |
| `FavoriteItem` | عنصر في المفضلة |
| `ScheduledDownload` | عنصر جدولة تحميل مستقبلي |
| `AppSettings` | كائن الإعدادات الكامل (كل الحقول المذكورة في قسم 16) |
| `AppNotification` | كائن إشعار Toast (النوع، الرسالة، الإجراء المرتبط إن وجد) |

**ملاحظة مهمة:** لا يلزم في هذه المرحلة تحديد كل خاصية (Property) بالتفصيل الدقيق لكل Entity — يكفي تعريف الـ Models الرئيسية بحقولها الأساسية المنطقية (بناءً على ما ورد وصفه في أقسام الميزات أعلاه)، بحيث تُستخدم هذه الأنواع (Types) بشكل موحّد من قِبل كل من: الـ Mock Services، الـ Stores، والـ Components — دون تكرار أو تعارض في تعريف البيانات.

---

## 23. مهم جدًا — فصل UI عن Business Logic

لا تحتوي React Components على منطق التطبيق بالكامل. التدفق **الإلزامي**:

```
React / UI (Components)
    ↓
Store / Hook
    ↓
Service Interface
    ↓
Mock Service (Implementation)
```

**قاعدة صارمة:** لا يجوز لأي React Component استدعاء الـ Mock Implementation مباشرة (مثال: استيراد `mockDownloadService` داخل Component). كل استدعاء لأي Service يجب أن يمرّ **حصريًا** عبر طبقة Store/Hook. الهدف من هذا القيد أن تتعامل الـ Components فقط مع الـ Store، دون أي معرفة بوجود Mock من الأساس — بحيث عند استبدال الـ Mock لاحقًا بتنفيذ حقيقي (Electron IPC)، **لا يتغيّر أي سطر داخل الـ Components**.

**لاحقًا** ستُستبدل Mock Services بـ:
Electron IPC, Node.js, yt-dlp, FFmpeg, SQLite

**بدون تغيير كبير في الواجهة.**

---

## 24. State Machine لحالة التحميل

```
Queued
  ↓
Analyzing
  ↓
Downloading
  ↓
Paused ⇄ Downloading
  ↓
Merging
  ↓
Converting
  ↓
Completed
```

**حالات إضافية:** Failed / Canceled / Retrying

**قاعدة صارمة:** يجب ألا يسمح الـ UI بانتقالات غير منطقية بين الحالات.

---

## 25. Error Simulation

محاكاة أخطاء لاختبار الـ UI:

- Network Error
- Video Unavailable
- Disk Full
- Permission Denied
- yt-dlp Error
- FFmpeg Error

تُعرض عبر Error Modal أو Error Toast مناسب.

### 25.1 طبقة موحدة لمعالجة الأخطاء (Global Error Handling)

**لا يجوز** أن تُنشئ كل صفحة نظام Error Handling خاص بها بشكل منفصل. يجب وجود **طبقة موحدة واحدة** للتعامل مع كل الأخطاء داخل التطبيق، بالتدفق التالي:

```
Service Error
    ↓
Error Mapper (تحويل الخطأ إلى شكل موحد قابل للعرض)
    ↓
Store
    ↓
Toast / Modal (حسب نوع الخطأ وخطورته)
```

هذا التوحيد مهم بشكل خاص لأنه، عند التحويل لاحقًا إلى Electron، ستأتي الأخطاء الحقيقية من مصادر متعددة (yt-dlp، FFmpeg، نظام الملفات، الشبكة) بأشكال مختلفة تمامًا — والـ Error Mapper هو الطبقة الوحيدة التي تحتاج تعديل، بينما تبقى Store والـ UI كما هي دون تغيير.

### 25.2 نظام محاكاة الأخطاء عند الطلب (Mock Scenario System)

بدلًا من انتظار حدوث الأخطاء بشكل عشوائي أثناء الاختبار، يجب توفير **آلية داخلية للمطوّر** لاختبار كل سيناريو عند الطلب (مثال: زر أو قائمة اختيار مخفية في وضع التطوير فقط، أو دالة يمكن استدعاؤها من الـ Mock Service مباشرة)، تسمح باختيار:

- Success (نجاح كامل)
- Network Error
- Video Unavailable
- Disk Full
- Permission Denied
- yt-dlp Error
- FFmpeg Error

هذا يسمح باختبار كل حالة من حالات الـ UI (Error Modal، Toast، Retry، إلخ) بشكل موثوق ومتكرر، بدلاً من الاعتماد على عشوائية الـ Mock الافتراضية.

---

## 26. Empty States

كل صفحة تحتوي على Empty State احترافي، مثال:
- "No downloads yet"
- "No favorites yet"
- "No scheduled downloads"
- "No history yet"

---

## 27. Loading States

استخدام **Skeleton Loaders** أثناء:
- Analyzing
- Loading Playlist
- Loading History
- Loading Favorites

---

## 28. Responsive Desktop Layout

التصميم أساسًا لتطبيق Desktop، بالمقاسات الشائعة:
- 1280×720
- 1366×768
- 1920×1080

**يجب ألا تنهار الواجهة في الشاشات الأصغر.**

---

## 29. Accessibility

- Semantic HTML
- Keyboard Navigation
- Focus States
- ARIA Labels عند الحاجة

---

## 30. Performance

**تجنب:**
- Unnecessary Re-renders
- Huge Components
- Duplicated State
- Heavy Dependencies بدون داعٍ

**استخدام:** Componentization جيد.

---

### 30.1 Testing

حتى في مرحلة الـ Prototype، يجب تضمين مستوى أساسي من الاختبارات — **ليس** المطلوب اختبار كل تفصيلة بصرية (Pixel) في الواجهة، لكن المطلوب تغطية الأجزاء التي يعتمد عليها استقرار التطبيق:

| نوع الاختبار | الهدف |
|---|---|
| Unit Tests للـ Services | التأكد من أن كل Mock Service يُرجع البيانات والأخطاء بالشكل المتوقع |
| Unit Tests للـ State/Stores | التأكد من صحة التحديثات على حالة Zustand عبر مختلف الإجراءات |
| Tests للـ State Machine | التأكد من عدم السماح بانتقالات غير منطقية بين حالات التحميل (راجع قسم 24) |
| Tests للـ URL Validation | تغطية كل حالات التحقق من الرابط المذكورة في القسم 7.1 |
| Tests للـ Download Transitions | محاكاة دورة تحميل كاملة (Queued → ... → Completed/Failed) والتأكد من صحة كل انتقال |
| Tests أساسية للـ UI Interactions | اختبارات تفاعل بسيطة (Smoke Tests) للتأكد أن الأزرار والنماذج الأساسية تستجيب بشكل صحيح |

هذا المستوى من الاختبارات يحمي المشروع من الانكسار عند أي تعديل مستقبلي، خصوصًا عند تسليم العمل بين عدة AI Agents (راجع القسم 36) أو عند التحويل لاحقًا إلى Electron.

---

## 31. تحضيرات أمنية (Security Preparation)

حتى في مرحلة الـ Prototype:
- ❌ عدم استخدام `dangerouslySetInnerHTML`
- ❌ عدم تنفيذ Shell Commands
- ❌ عدم السماح للمستخدم بتنفيذ JavaScript عبر الـ UI

(ستُضاف طبقات Electron Security في مرحلة لاحقة)

---

## 32. ما لا يُنفَّذ في هذه المرحلة

| البند | الحالة |
|---|---|
| Electron | ❌ لاحقًا |
| yt-dlp / FFmpeg | ❌ لاحقًا |
| SQLite | ❌ لاحقًا |
| Backend | ❌ لاحقًا |
| Authentication / Login / Registration | ❌ غير مطلوب إطلاقًا |
| Cloud Sync / Payment / Subscription | ❌ غير مطلوب إطلاقًا |
| Real Downloads | ❌ لاحقًا (Mock فقط الآن) |
| Real Clipboard OS Integration | ❌ لاحقًا |
| Real Windows Taskbar Integration | ❌ لاحقًا |

---

## 33. ترتيب التنفيذ المطلوب

بناء Prototype كامل وقابل للتشغيل فعليًا، بالترتيب التالي:

1. Dashboard
2. Queue
3. History
4. Favorites
5. Scheduler
6. Settings
7. About

**باستخدام Mock Data واقعية، وبدون ترك أي TODO في الأجزاء الأساسية.**

### يجب أن يعمل فعليًا (وليس Static HTML أو Screenshots):
- Navigation ✅
- Buttons ✅
- Modals ✅
- Forms ✅
- State Management ✅
- Mock Downloads ✅
- Progress Animation ✅
- Pause / Resume ✅
- Retry ✅
- Remove ✅
- Favorites ✅
- History Updates ✅
- Scheduler UI ✅
- Settings (تحفظ الحالة عبر `localStorage`) ✅
- Dark / Light Mode ✅
- Arabic / English ✅
- RTL / LTR ✅

---

## 34. قاعدة مهمة جدًا — القرارات المعمارية

**لا تُتخذ قرارات معمارية جوهرية بشكل منفرد إذا كانت ستؤثر على الـ Architecture العام أو على قابلية تحويل المشروع إلى Electron لاحقًا.**

- **إذا كان القرار سيؤثر بشكل جوهري على الـ Architecture أو على قابلية التحويل إلى Electron** (مثال: اختيار مكتبة أساسية جديدة، تغيير بنية الـ Services، تغيير طريقة الفصل بين UI وBusiness Logic) → **التوقف والسؤال قبل التنفيذ**
- **أما القرارات التقنية الصغيرة القابلة للعكس بسهولة** (مثال: تسمية مكوّن، تنظيم ملف فرعي، تفاصيل تنسيق بسيطة) → تُختار فيها أفضل حل احترافي مباشرة **ويُدوَّن القرار في `docs/DECISIONS.md`** دون الحاجة للتوقف والسؤال

هذا التمييز يمنع توقف عملية التطوير بسبب تفاصيل صغيرة، مع الحفاظ على ضمان عدم اتخاذ قرارات جوهرية دون موافقة.

**⚠️ قاعدة إضافية مهمة:** إذا اكتشف الـ AI أثناء التنفيذ أن قرارًا سابقًا **منصوصًا عليه في هذه الوثيقة** (مثال: استخدام Zustand، بنية الـ Services، آلية الفصل بين UI وMock) يسبب مشكلة تقنية حقيقية، **فلا يقوم بتغييره مباشرة بحجة "أفضل ممارسة" أو تفضيل شخصي**. بدلًا من ذلك، يجب أن:
1. يشرح المشكلة التقنية بوضوح
2. يعرض الحلول البديلة الممكنة
3. يوضّح تأثير كل بديل على الـ Architecture العام
4. **ينتظر موافقة المستخدم** قبل أي تغيير فعلي

هذه القاعدة تحديدًا تمنع أي AI جديد من تغيير قرارات معمارية أساسية (مثل استبدال Zustand، أو تغيير طبقة الـ Services) دون علم أو موافقة صريحة.

---

## 35. النتيجة النهائية المطلوبة

Prototype احترافي يُشعر المستخدم أنه يستخدم برنامج Desktop حقيقي اسمه **Remon Download**، حتى لو كانت عمليات التحميل نفسها Mock بالكامل.

### بعد الانتهاء، يجب توضيح:
1. ما الذي تم تنفيذه؟
2. Structure المشروع
3. المكونات الرئيسية
4. كيف تم فصل Mock Services عن UI؟
5. كيف يمكن تحويله لاحقًا إلى Electron + yt-dlp + FFmpeg + SQLite؟
6. أي قرارات معمارية تحتاج موافقة قبل الانتقال للمرحلة الثانية؟

**ملاحظة ختامية: لا يتم الانتقال إلى Electron في هذه المرحلة.**

---

## 36. AI Handoff & Continuation Protocol

هذا المشروع يجب أن يكون قابلًا للاستكمال بواسطة أي AI Coding Agent آخر في أي وقت، بدون الاعتماد على ذاكرة الـ AI السابق أو المحادثة السابقة.

### 36.1 قاعدة أساسية

يجب ألا يعتمد المشروع على معلومات موجودة داخل Chat فقط.

كل معلومة مهمة عن:

- Architecture
- Features
- Decisions
- Current Progress
- Completed Tasks
- Pending Tasks
- Known Issues
- Technical Decisions

يجب أن تكون محفوظة داخل ملفات المشروع.

---

### 36.2 ملفات استمرارية المشروع

أنشئ داخل جذر المشروع مجلد:

```
docs/
```

ويحتوي على:

```
docs/
├── SPEC.md
├── ARCHITECTURE.md
├── DEVELOPMENT_STATUS.md
├── DECISIONS.md
├── CHANGELOG.md
├── KNOWN_ISSUES.md
└── AI_HANDOFF.md
```

**بالإضافة إلى ذلك**، يوجد ملف `README.md` في **جذر المشروع** (خارج `docs/`)، بصفته أول نقطة دخول لأي مطوّر أو AI جديد — التفاصيل في القسم 36.2.1 أدناه.

#### SPEC.md
يحتوي على المواصفات الأساسية للمشروع. يجب أن يبقى متزامنًا مع المواصفات الحالية.

**⚠️ قاعدة مهمة:** عند بدء المشروع، يجب إنشاء `docs/SPEC.md` كنسخة كاملة من هذه الوثيقة نفسها (Remon Download — مواصفات Prototype). بعد ذلك، يُعتبر `docs/SPEC.md` هو **المرجع الأساسي للمواصفات** أثناء التطوير — وليس هذه المحادثة أو أي نسخة خارج المشروع. إذا تغيّرت المواصفات لاحقًا بموافقة المستخدم، يجب تحديث `docs/SPEC.md` مباشرة ليعكس آخر نسخة معتمدة. هذا يضمن أن المشروع نفسه مستقل تمامًا عن ذاكرة المحادثة أو الـ AI الذي بدأ العمل عليه.

#### ARCHITECTURE.md
يحتوي على:
- Project Architecture
- Folder Structure
- State Management
- Service Architecture
- Component Architecture
- Data Flow
- أهم القرارات التقنية

#### DEVELOPMENT_STATUS.md
هذا الملف هو **أهم ملف للاستمرار**. يجب أن يحتوي دائمًا على:

```
Current Phase:
Current Version:

Completed:
- ...

In Progress:
- ...

Pending:
- ...

Blocked:
- ...

Known Bugs:
- ...

Next Recommended Task:
- ...
```

يجب تحديثه بعد كل مرحلة كبيرة من التطوير.

#### DECISIONS.md
يحتوي على القرارات التقنية المهمة التي تم اتخاذها، مثال:

```
Decision:
Use Zustand for global state.

Reason:
Simple and scalable for the current application.

Date:
YYYY-MM-DD
```

لا تُغيَّر أي قرار معماري سابق دون توضيح السبب في هذا الملف.

#### CHANGELOG.md
سجل التغييرات المهمة في المشروع، مثال:

```
## 0.2.0

Added:
- Download Queue
- Mock Progress Simulation
- Favorites

Changed:
- Dashboard layout

Fixed:
- Queue state synchronization
```

#### KNOWN_ISSUES.md
يحتوي على المشاكل المعروفة التي لم يتم حلها. لكل مشكلة:

```
Issue:
Description:
Steps to reproduce:
Expected:
Actual:
Priority:
Status:
```

#### AI_HANDOFF.md
هذا الملف مخصص مباشرة لأي AI Coding Agent جديد، ويحتوي على ملخص سريع جدًا للحالة الحالية للمشروع، مثال:

```
PROJECT:
Remon Download

CURRENT PHASE:
React Prototype

TECH STACK:
React
TypeScript
Vite
Tailwind CSS
Zustand

NOT USING:
Electron
yt-dlp
FFmpeg
SQLite
Backend
Authentication

CURRENT STATUS:
Dashboard completed
Queue completed
History in progress

LAST COMPLETED TASK:
Implemented Queue drag & drop.

CURRENT TASK:
Finish History page.

NEXT TASK:
Implement Favorites.

IMPORTANT DECISIONS:
- No Login
- React only during Prototype
- Mock Services
- localStorage for prototype settings
- Architecture must remain Electron-ready

KNOWN ISSUES:
- ...

DO NOT:
- Start Electron
- Add Backend
- Add Authentication
- Replace React
- Rewrite existing architecture without reason
```

---

### 36.2.1 README.md (ملف إضافي في جذر المشروع)

بالإضافة إلى مجلد `docs/`، يجب أن يحتوي **جذر المشروع** على ملف `README.md`، لأن أي AI جديد (أو مطوّر) غالبًا سيبدأ بقراءته أولاً قبل حتى الدخول إلى `docs/`.

**يحتوي `README.md` على:**
- اسم المشروع (Remon Download)
- وصف مختصر للمشروع
- طريقة تشغيل المشروع
- المتطلبات (Node.js version، إلخ)
- أمر `npm install`
- أمر `npm run dev`
- أمر الـ Build
- رابط مباشر إلى `docs/AI_HANDOFF.md`
- رابط مباشر إلى `docs/DEVELOPMENT_STATUS.md`

**مثال مبسّط للمحتوى:**

```markdown
# Remon Download

واجهة Prototype لبرنامج Remon Download، تم تطويرها باستخدام React
كمرحلة أولى قبل تحويلها إلى تطبيق Desktop باستخدام Electron.

## المتطلبات
- Node.js 20 LTS أو أحدث

## التشغيل
npm install
npm run dev

## البناء
npm run build

## للمطورين / AI Agents
قبل أي تعديل، اقرأ:
- docs/AI_HANDOFF.md
- docs/DEVELOPMENT_STATUS.md
```

---

### 36.3 قاعدة تحديث حالة المشروع

بعد الانتهاء من كل Feature رئيسية:

1. حدّث `DEVELOPMENT_STATUS.md`
2. حدّث `CHANGELOG.md`
3. أضف أي مشكلة جديدة إلى `KNOWN_ISSUES.md`
4. إذا تم اتخاذ قرار معماري، حدّث `DECISIONS.md`
5. حدّث `AI_HANDOFF.md`

---

### 36.4 عند بدء العمل بواسطة AI جديد

قبل تعديل أي كود، يجب على الـ AI الجديد قراءة:

```
docs/SPEC.md
docs/ARCHITECTURE.md
docs/DEVELOPMENT_STATUS.md
docs/DECISIONS.md
docs/AI_HANDOFF.md
```

ثم فحص:

```
package.json
src/
```

بعد ذلك يجب أن يحدد:
- ما تم إنجازه
- ما هو قيد التنفيذ
- ما هو المطلوب التالي
- المشاكل الموجودة

**ولا يبدأ بإعادة بناء المشروع من الصفر.**

---

### 36.5 قاعدة عدم إعادة الكتابة

إذا كان Feature موجودًا ويعمل: لا تُعاد كتابته بالكامل لمجرد أن المنفّذ AI جديد.

يجب فهم الكود الحالي ثم تنفيذ التعديل المطلوب فقط، **بدون** تغيير الـ Architecture أو الـ Libraries الأساسية إلا إذا كان هناك سبب تقني واضح.

---

### 36.6 عند انتهاء حصة AI

إذا كان من **المتوقع** توقف العمل أو الانتقال إلى AI آخر، يجب تنفيذ **"Handoff Update"** قبل التوقف، بتحديث:

```
DEVELOPMENT_STATUS.md
AI_HANDOFF.md
CHANGELOG.md
```

بحيث يستطيع AI آخر استكمال العمل مباشرة.

**⚠️ ومع ذلك، يجب ألا يعتمد المشروع على هذا التحديث وحده.** لا يمكن للـ AI تنفيذ أي إجراء بعد انتهاء الكوتة فعليًا، وقد تنتهي الكوتة فجأة وبدون سابق إنذار دون أن يكون هناك وقت لتحديث ملفات الـ Handoff.

**القاعدة الصحيحة:** يجب تحديث ملفات الـ Handoff **بعد كل Feature رئيسية أو عند الوصول إلى نقطة مستقرة في الكود** (Stable Checkpoint)، وليس فقط عند توقّع انتهاء الحصة. بهذه الطريقة، حتى لو انتهت الحصة فجأة بدون تحذير، تكون آخر حالة مستقرة للمشروع محفوظة بالفعل داخل `docs/`، ولا يُفقد أي تقدّم.

---

### 36.7 Prompt الاستكمال

يجب أن يكون من الممكن بدء محادثة جديدة مع أي AI باستخدام هذا النص:

> اقرأ ملفات المشروع داخل `docs/`، وخصوصًا `AI_HANDOFF.md` و`DEVELOPMENT_STATUS.md`.
>
> افهم الحالة الحالية للمشروع قبل تعديل أي كود.
>
> أكمل من آخر نقطة تم الوصول إليها.
>
> لا تعيد بناء المشروع من الصفر.
>
> لا تغير القرارات المعمارية الموجودة دون سبب واضح.
>
> نفذ المهمة الحالية الموجودة في `DEVELOPMENT_STATUS.md`.
>
> بعد الانتهاء حدّث ملفات الـ documentation الخاصة بالـ handoff.

---

### 36.8 Git Checkpoint

بعد كل Feature رئيسية يجب إنشاء Git commit واضح، مثال:

```
feat: implement dashboard
feat: implement download queue
feat: add mock download simulation
feat: implement history
feat: implement favorites
```

ويجب ألا يُترك المشروع في حالة غير واضحة قبل الـ handoff.

---

### 36.9 قاعدة العمل الأساسية

الـ AI **ليس مالكًا لذاكرة المشروع**.

**الملفات هي مصدر الحقيقة (Source of Truth).**

أي AI جديد يجب أن يستطيع فهم المشروع واستكماله من ملفات المشروع فقط، حتى لو لم يكن لديه أي وصول إلى المحادثة السابقة.
