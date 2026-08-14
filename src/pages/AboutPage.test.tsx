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
    expect(screen.getByText("Phone:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "01067006714" })).toHaveAttribute("href", "tel:01067006714");
    expect(screen.getByText("Email:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "remongamal282@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:remongamal282@gmail.com"
    );
    expect(screen.queryByText("Not specified")).not.toBeInTheDocument();
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
    expect(screen.getByText("الهاتف:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "01067006714" })).toHaveAttribute("href", "tel:01067006714");
    expect(screen.getByText("البريد الإلكتروني:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "remongamal282@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:remongamal282@gmail.com"
    );
    expect(screen.queryByText("غير محدد")).not.toBeInTheDocument();
  });
});
