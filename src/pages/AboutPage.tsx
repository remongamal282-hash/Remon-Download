import { useTranslation } from "react-i18next";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <section className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">{t("app.name")}</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t("about.description")}</p>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{t("common.version")}</dt>
          <dd className="mt-1 font-medium">{__APP_VERSION__}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{t("about.developer")}</dt>
          <dd className="mt-1 font-medium">Remon</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{t("about.contact")}</dt>
          <dd className="mt-1 font-medium">Mock contact</dd>
        </div>
      </dl>
    </section>
  );
}
