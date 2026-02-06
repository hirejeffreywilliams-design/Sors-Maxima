import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN - English" },
  { code: "es", label: "ES - Spanish" },
  { code: "fr", label: "FR - French" },
  { code: "de", label: "DE - German" },
  { code: "pt", label: "PT - Portuguese" },
  { code: "ja", label: "JA - Japanese" },
  { code: "zh", label: "ZH - Chinese" },
  { code: "ko", label: "KO - Korean" },
];

export function LanguageSelector() {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sors-language") || "en";
    }
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("sors-language", language);
  }, [language]);

  return (
    <div className="flex items-center gap-3">
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className="w-full sm:w-48" data-testid="select-language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} data-testid={`option-language-${lang.code}`}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
