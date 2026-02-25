import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description?: string;
}

export function useSEO({ title, description }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title.includes("Sors Maxima") ? title : `${title} | Sors Maxima`;
    document.title = fullTitle;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", fullTitle);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", fullTitle);

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", description);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);

      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute("content", description);
    }
  }, [title, description]);
}
