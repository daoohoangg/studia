import SectionTabs from "@/components/SectionTabs";

export default function SpeakingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs
        title="Luyện nói"
        tabs={[
          { href: "/scenarios", label: "Hội thoại", hint: "Nói chuyện theo tình huống với trợ lý AI" },
          { href: "/pronunciation", label: "Phát âm", hint: "Đọc theo câu mẫu và xem từ nào phát âm sai" },
          { href: "/dictation", label: "Nghe chép", hint: "Nghe đoạn ngắn 10–15 giây và gõ lại, chấm từng từ" },
        ]}
      />
      {children}
    </>
  );
}
