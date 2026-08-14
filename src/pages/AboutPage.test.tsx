import { render, screen } from "@testing-library/react";
import "../i18n";
import i18n from "../i18n";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
    document.documentElement.dir = "ltr";
  });

  it("renders required application information", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "Remon Download" })).toBeInTheDocument();
    expect(screen.getByText("A desktop-style manager for organizing video and media downloads.")).toBeInTheDocument();
    expect(screen.getByText("Application name")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Remon")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });

  it("renders localized Arabic labels", async () => {
    await i18n.changeLanguage("ar");
    document.documentElement.dir = "rtl";

    render(<AboutPage />);

    expect(screen.getByText("تفاصيل التطبيق")).toBeInTheDocument();
    expect(screen.getByText("اسم التطبيق")).toBeInTheDocument();
    expect(screen.getByText("الإصدار")).toBeInTheDocument();
    expect(screen.getByText("المطور")).toBeInTheDocument();
    expect(screen.getByText("التواصل")).toBeInTheDocument();
    expect(screen.getByText("غير محدد")).toBeInTheDocument();
  });
});
