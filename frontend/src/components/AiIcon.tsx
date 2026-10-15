/**
 * Biểu tượng trợ lý AI của Studia: bong bóng hội thoại (cùng ngôn ngữ hình với logo) có tia sáng AI bên trong.
 * Màu theo currentColor (bong bóng) và --ai-spark (tia sáng).
 */
export default function AiIcon({ size = 28, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* bong bóng: góc bo giống logo, đuôi dưới bên trái */}
      <path
        d="M9.5 3h13A6.5 6.5 0 0 1 29 9.5v7A6.5 6.5 0 0 1 22.5 23H15l-6.2 5.2c-.7.6-1.8.1-1.8-.8V23.6A6.5 6.5 0 0 1 3 17.5v-8A6.5 6.5 0 0 1 9.5 3z"
        fill="currentColor"
      />
      {/* tia sáng 4 cánh */}
      <path
        d="M16 7.2c.5 3.3 1.5 4.3 4.8 4.8-3.3.5-4.3 1.5-4.8 4.8-.5-3.3-1.5-4.3-4.8-4.8 3.3-.5 4.3-1.5 4.8-4.8z"
        fill="var(--ai-spark, #f2611f)"
      />
      <circle cx="22.6" cy="16.4" r="1.5" fill="var(--ai-spark, #f2611f)" opacity=".75" />
      <circle cx="9.8" cy="16.6" r="1.1" fill="var(--ai-spark, #f2611f)" opacity=".55" />
    </svg>
  );
}
