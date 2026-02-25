# SSR (Server-Side Rendering) vs CSR (Client-Side Rendering)

Trong phát triển Web hiện đại, Rendering (Kết xuất giao diện) là quá trình chuyển đổi mã code (HTML, CSS, JavaScript) thành trang web hiển thị tương tác được cho người dùng.
Có hai phương pháp Rendering phổ biến nhất là **SSR (Server-Side Rendering)** và **CSR (Client-Side Rendering)**.

---

## 1. CSR - Client-Side Rendering (Kết xuất phía máy khách)

### Khái niệm
Trong CSR, toàn bộ gánh nặng render giao diện được đẩy về phía máy khách (Browser của người dùng).
Khi trình duyệt yêu cầu một trang web, máy chủ chỉ trả về một file HTML gần như trống rỗng (barebone HTML) kèm theo đó là một file JavaScript khổng lồ chứa toàn bộ ứng dụng (ví dụ: React, Vue, Angular bundle).
Trình duyệt sẽ mất thời gian tải file JS này, sau đó thực thi nó thì giao diện (DOM) và dữ liệu (gọi API) mới bắt đầu được vẽ ra và hiển thị đầy đủ.
Phương pháp này thường được dùng để xây dựng các **SPA (Single-Page Applications)**.

### Ưu điểm
- **Trải nghiệm mượt mà như App Native (Ứng dụng gốc):** Sau lần tải ban đầu, khi chuyển trang (routing) sẽ không cần tải lại toàn bộ trang từ server. Chỉ giao diện được vẽ lại bằng JS và fetch dữ liệu mới bằng JSON, giúp tốc độ chuyển tiếp cực kỳ nhanh.
- **Giảm tải cho Server Backend:** Server chỉ cần tập trung làm API trả về dữ liệu thuần (JSON/XML). Trình duyệt tự lo việc kết xuất giao diện. Rất tiết kiệm tài nguyên máy chủ.
- **Tái sử dụng Code:** Có thể dùng chung cùng một bộ API Backend cho cả Web Frontend (CSR) lẫn Mobile (iOS/Android).

### Nhược điểm
- **SEO kém (Khó index):** Các Web Crawler (Bot của Google, Facebook, v.v.) khi crawl web của bạn sẽ chỉ thấy một file HTML rỗng và thẻ `<script>`. Dù Googlebot hiện tại có khả năng chạy JS để đọc, nhưng quá trình này tốn "ngân sách thu thập" (Crawl Budget) và chậm hơn nhiều so với HTML thuần. SEO sẽ bị ảnh hưởng nặng.
- **Thời gian load trang đầu tiên chậm (FCP/TTI cao):** File bundle JS có thể rất lớn nếu ứng dụng phức tạp. Người dùng sẽ phải nhìn màn hình trắng hoặc màn hình load một lúc lâu trước khi có thể tương tác được với trang web lần đầu (First Load). Bạn phụ thuộc vào tốc độ mạng và tốc độ CPU của thiết bị người dùng.

### Khi nào nên dùng?
- Ứng dụng quản trị hệ thống (Admin Dashboards), phần mềm quản lý (SAAS).
- Các trang Web yêu cầu tương tác của người dùng phức tạp nhưng không quan trọng về SEO.
- Web app phía sau màn hình đăng nhập (ví dụ: Gmail, Trello).

---

## 2. SSR - Server-Side Rendering (Kết xuất phía máy chủ)

### Khái niệm
Trong SSR, toàn bộ nội dung HTML của trang web được lấy dữ liệu, xây dựng và kết xuất sẵn thành cục HTML hoàn chỉnh ngay trên Server.
Khi người dùng request, trình duyệt lập tức nhận được một trang HTML đã đầy đủ nội dung bài viết, dữ liệu và giao diện cơ bản ngay lập tức. Sau đó, nó mới tải thêm một lượng nhỏ JS (quá trình này gọi là **Hydration**) để gắn các sự kiện tương tác (click, scroll...).
Các framework phổ biến cấu hình SSR: Next.js (cho React), Nuxt.js (cho Vue), SvelteKit, hoặc các hệ thống cũ như PHP, ASP.NET MVC, JSP.

### Ưu điểm
- **SEO tuyệt vời:** Vì Server trả về HTML đã chứa sẵn đầy đủ dữ liệu nội dung, mọi Bot công cụ tìm kiếm hoặc xem trước link (Zalo, Facebook, Twitter) đều có thể đọc/hiển thị Meta Tags và Content dễ dàng và nhanh chóng.
- **Tốc độ hiển thị nội dung đầu tiên (FCP) cực nhanh:** Người dùng ngay lập tức thấy trang web hiện ra nội dung, không phải chờ màn hình trắng do không cần đợi parse/thực thi file JS lớn. Cực kỳ tốt cho thiết bị yếu hoặc mạng chậm.

### Nhược điểm
- **Chi phí vận hành Server cao:** Server phải tính toán, gọi database và xử lý render HTML cho mỗi một request của người dùng gửi lên. Khi có hàng trăm nghìn traffic truy cập cùng lúc, server rất dễ quá tải nếu không có cơ chế Caching tốt.
- **Chuyển trang (Full-page reload) có thể bị giật:** (Với các Web truyền thống - MPA), khi ấn vào link, trình duyệt lại gửi request lên server để xin nguyên bộ HTML mới, trang sẽ bị nháy/tải lại. (Mặc dù Next/Nuxt hiện nay có cơ chế Hydration biến đoạn sau thành CSR để khắc phục điểm yếu này).
- **Setup phức tạp:** Đội code cần quản lý cả môi trường Nodejs Server và Browser, dễ xảy ra lỗi mismatch (không khớp) giữa UI lúc server chạy và UI lúc client chạy.

### Khi nào nên dùng?
- Các trang báo chí, Blog, sàn thương mại điện tử (E-commerce) như Shopee, Tiki... (SEO là sống còn).
- Các Landing pages ưu tiên FCP nhanh và điểm Google PageSpeed Insights cao.
- Trang web công khai cần tối ưu cho việc chia sẻ Social Media (Open Graph).

---

## 3. Các phương pháp mở rộng (Modern Rendering Patterns)
Để dung hòa ưu/nhược điểm của bộ đôi CSR/SSR, các framework hiện đại (như Next.js) sinh ra thêm:

### a. SSG (Static Site Generation - Kết xuất tĩnh)
Thay vì render trang mỗi khi có request (như SSR), Server sẽ render **toàn bộ pages thành HTML tĩnh sẵn luôn** ngay từ lúc Build (chạy lệnh `npm run build`). 
- Ưu điểm: Đưa file lên CDN, tốc độ phản hồi cực kỳ khủng khiếp (chỉ serve file tĩnh), SEO vẫn hoàn hảo, không tốn resource server tính toán.
- Nhược điểm: Phù hợp với dữ liệu ít thay đổi (Trang giới thiệu công ty, blog cá nhân). Không dùng được nếu dữ liệu update liên tục từng giây (như giá chứng khoán).

### b. ISR (Incremental Static Regeneration)
Phiên bản nâng cấp của SSG. Vẫn là trang tĩnh, nhưng bạn cấu hình "cữ 60 giây tao sẽ cho phép mồi lại trang tĩnh mới ở background 1 lần nếu có người request".
Kết hợp tuyệt vời giữa hiệu suất của Caching tĩnh và sự linh hoạt mới mẻ của dữ liệu động từ SSR.

## Tổng kết so sánh nhanh

| Tiêu chí | CSR (Client-Side) | SSR (Server-Side) | SSG (Static-Site) |
| :--- | :--- | :--- | :--- |
| **Nơi Render?** | Trình duyệt người dùng | Máy chủ Node/PHP | Máy chủ lúc quá trình Build |
| **Tốc độ load lần đầu (FCP)** | Chậm (đợi tải JS & API) | Rất nhanh (nhận HTML sẵn) | Nhanh nhất (Giao file tĩnh từ CDN)|
| **Tốc độ chuyển trang** | Nhanh (chạy nội bộ JS) | Có thể chậm / bị chớp | Nhanh |
| **Gánh nặng Server** | Ít (bảo trì Data API) | Nhiều (tốn CPU render) | Rất ít (chỉ mất CPU lúc Build) |
| **Điểm SEO / Social Share** | Rất thấp | Tuyệt Vời | Tuyệt Vời |
| **Dữ liệu Update thời gian thực**| Dễ làm cực kỳ | Luôn lấy Data mới nhất | Bị cũ cho đến lần Build/ISR tiếp theo |
