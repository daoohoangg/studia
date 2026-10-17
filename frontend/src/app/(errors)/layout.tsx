import SectionTabs from "@/components/SectionTabs";

export default function ErrorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs
        title="Lỗi sai"
        tabs={[
          { href: "/feedback", label: "Phân tích lỗi", hint: "Dán bài viết để AI chỉ ra lỗi" },
          { href: "/mistakes", label: "Sổ lỗi sai", hint: "Các lỗi bạn đã gặp, để xem lại" },
        ]}
      />
      {children}
    </>
  );
}
