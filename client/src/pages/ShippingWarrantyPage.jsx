function ShippingWarrantyPage() {
  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Thông tin tiện ích</p>
          <h1>FAQ & chính sách cửa hàng</h1>
        </div>
        <p>
          Giải đáp nhanh câu hỏi phổ biến về giao hàng, bảo hành và đổi trả.
        </p>
      </section>

      <section id="delivery" className="content-panel">
        <h2>Chính sách giao hàng</h2>
        <div className="order-items-inline">
          <div>
            <span>Khu vực giao hàng</span>
            <small>
              Toàn quốc, ưu tiên xử lý trong ngày cho đơn nội thành.
            </small>
          </div>
          <div>
            <span>Thời gian dự kiến</span>
            <small>1-2 ngày nội thành, 3-5 ngày với các tỉnh khác.</small>
          </div>
          <div>
            <span>Quy cách đóng gói</span>
            <small>
              Chống sốc 2 lớp, niêm phong và chụp ảnh xác nhận trước khi gửi.
            </small>
          </div>
        </div>
      </section>

      <section className="content-panel">
        <h2>Chính sách bảo hành</h2>
        <div className="order-items-inline">
          <div>
            <span>Hỗ trợ đổi trả</span>
            <small>
              Trong 48 giờ nếu sản phẩm bị vỡ, móp hộp do vận chuyển.
            </small>
          </div>
          <div>
            <span>Điều kiện tiếp nhận</span>
            <small>Giữ nguyên tem, quay video mở hộp để đối soát nhanh.</small>
          </div>
          <div>
            <span>Liên hệ hỗ trợ</span>
            <small>
              Hotline 0396686826 hoặc nhắn qua tài khoản thành viên.
            </small>
          </div>
        </div>
      </section>

      <section id="faq" className="content-panel">
        <h2>FAQ thường gặp</h2>
        <div className="order-items-inline">
          <div>
            <span>Hàng preorder có giữ chỗ không?</span>
            <small>
              Đơn preorder cần đặt cọc theo quy định để giữ suất và giá.
            </small>
          </div>
          <div>
            <span>Tôi có thể kiểm tra hàng trước khi nhận?</span>
            <small>Có. Bạn được kiểm tra ngoại quan trước khi ký nhận.</small>
          </div>
          <div>
            <span>Đổi trả trong trường hợp nào?</span>
            <small>
              Hỗ trợ nếu sản phẩm lỗi do vận chuyển hoặc lỗi sản xuất.
            </small>
          </div>
          <div>
            <span>Thanh toán bằng phương thức nào?</span>
            <small>Chuyển khoản hoặc COD tùy khu vực giao hàng.</small>
          </div>
          <div>
            <span>Hàng có hóa đơn/nguồn gốc không?</span>
            <small>
              Cam kết hàng chính hãng, có thông tin xuất xứ rõ ràng.
            </small>
          </div>
          <div>
            <span>Làm sao theo dõi đơn hàng?</span>
            <small>Vào mục Tra cứu đơn đặt trước hoặc liên hệ hotline.</small>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ShippingWarrantyPage;
