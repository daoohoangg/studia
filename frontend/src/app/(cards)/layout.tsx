import SectionTabs from "@/components/SectionTabs";

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs
        title="Thẻ và từ vựng"
        tabs={[
          { href: "/flashcards", label: "Flashcards", hint: "Ôn thẻ theo lịch" },
          { href: "/vocabulary", label: "Từ vựng", hint: "Danh sách từ đã lưu" },
        ]}
      />
      {children}
    </>
  );
}
