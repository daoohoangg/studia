import { useEffect, useState } from "react";

/** Khớp media query; giá trị đầu là false (khớp SSR), đồng bộ ngay sau khi gắn. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Điện thoại: khớp breakpoint 767px của globals.css / room.css. */
export function useNarrow(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
