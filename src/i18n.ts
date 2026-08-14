import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  en: {
    translation: {
      app: {
        name: "Remon Download"
      },
      nav: {
        dashboard: "Dashboard",
        queue: "Download Queue",
        history: "History",
        favorites: "Favorites",
        scheduler: "Scheduler",
        settings: "Settings",
        about: "About"
      },
      dashboard: {
        title: "Quick Add",
        subtitle: "Analyze a YouTube video, short, playlist, playlist video, or channel.",
        urlLabel: "YouTube URL",
        urlPlaceholder: "https://www.youtube.com/watch?v=...",
        analyze: "Analyze",
        analyzing: "Analyzing...",
        detected: "Detected",
        playlistNotice: "Playlist detected. Choose videos before adding them to the queue.",
        playlistVideoNotice: "Video inside playlist detected. Only this video will be added.",
        channelNotice: "Channel detected. Channel-wide downloads are not available in this prototype.",
        addToQueue: "Add to Queue",
        addSelected: "Add Selected to Queue",
        downloadEntirePlaylist: "Download Entire Playlist",
        selectAll: "Select All",
        deselectAll: "Deselect All",
        videoInfo: "Video Info",
        queueCount: "{{count}} item in queue",
        queueCount_plural: "{{count}} items in queue"
      },
      validation: {
        emptyUrl: "Enter a YouTube URL.",
        invalidUrl: "Enter a valid URL."
      },
      errors: {
        unsupportedUrl: "This URL is valid but unsupported. Use a YouTube link.",
        unknown: "Something went wrong while analyzing the link."
      },
      toast: {
        addedToQueue: "Added to queue.",
        addedManyToQueue: "Added {{count}} items to queue."
      },
      common: {
        empty: "Nothing here yet.",
        version: "Version"
      },
      about: {
        description: "A desktop-style manager for organizing video and media downloads.",
        developer: "Developer",
        contact: "Contact"
      }
    }
  },
  ar: {
    translation: {
      app: {
        name: "Remon Download"
      },
      nav: {
        dashboard: "لوحة التحكم",
        queue: "قائمة التنزيل",
        history: "السجل",
        favorites: "المفضلة",
        scheduler: "المجدول",
        settings: "الإعدادات",
        about: "حول"
      },
      dashboard: {
        title: "إضافة سريعة",
        subtitle: "حلل رابط فيديو أو شورت أو قائمة تشغيل أو قناة من YouTube.",
        urlLabel: "رابط YouTube",
        urlPlaceholder: "https://www.youtube.com/watch?v=...",
        analyze: "تحليل",
        analyzing: "جار التحليل...",
        detected: "تم الاكتشاف",
        playlistNotice: "تم اكتشاف قائمة تشغيل. اختر الفيديوهات قبل إضافتها للقائمة.",
        playlistVideoNotice: "تم اكتشاف فيديو داخل قائمة تشغيل. سيتم إضافة هذا الفيديو فقط.",
        channelNotice: "تم اكتشاف قناة. تنزيل القناة بالكامل غير متاح في هذا النموذج.",
        addToQueue: "إضافة للقائمة",
        addSelected: "إضافة المحدد للقائمة",
        downloadEntirePlaylist: "إضافة القائمة بالكامل",
        selectAll: "تحديد الكل",
        deselectAll: "إلغاء التحديد",
        videoInfo: "معلومات الفيديو",
        queueCount: "عنصر واحد في القائمة",
        queueCount_plural: "{{count}} عناصر في القائمة"
      },
      validation: {
        emptyUrl: "أدخل رابط YouTube.",
        invalidUrl: "أدخل رابطًا صحيحًا."
      },
      errors: {
        unsupportedUrl: "الرابط صحيح لكنه غير مدعوم. استخدم رابط YouTube.",
        unknown: "حدث خطأ أثناء تحليل الرابط."
      },
      toast: {
        addedToQueue: "تمت الإضافة للقائمة.",
        addedManyToQueue: "تمت إضافة {{count}} عناصر للقائمة."
      },
      common: {
        empty: "لا يوجد شيء هنا بعد.",
        version: "الإصدار"
      },
      about: {
        description: "مدير بأسلوب تطبيق سطح مكتب لتنظيم تنزيلات الفيديو والوسائط.",
        developer: "المطور",
        contact: "التواصل"
      }
    }
  }
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
