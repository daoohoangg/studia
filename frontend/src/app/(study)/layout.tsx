import SectionTabs from "@/components/SectionTabs";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs
        title="Ôn luyện"
        tabs={[
          { href: "/practice", label: "Luyện nhanh", hint: "Buổi luyện ngắn xen kẽ thẻ và câu hỏi" },
          { href: "/review", label: "Ôn tập", hint: "Hàng đợi ôn theo lịch lặp lại ngắt quãng" },
        ]}
      />
      {children}
    </>
  );
}
