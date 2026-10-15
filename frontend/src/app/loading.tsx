/** Khung chờ hiện ngay khi chuyển trang, trước khi nội dung trang đích sẵn sàng. */
export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Đang tải trang">
      <div className="skeleton" style={{ height: 56, maxWidth: 420 }} />
      <div className="grid-3">
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  );
}
