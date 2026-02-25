# Hasura (GraphQL Engine)

## 1. Khái niệm (What is Hasura?)
**Hasura (GraphQL Engine)** là một công cụ mã nguồn mở (open-source) siêu mạnh mẽ, hoạt động như một tầng API (API layer) đứng trung gian giữa Client (Frontend/Mobile) và Cơ sở dữ liệu (Database). Nó kết nối nguyên bản phổ biến nhất là với hệ quản trị **PostgreSQL**.

Ngay khi bạn trỏ Hasura vào DataBase, vèo 1 cái phép màu hiện ra, nó lập tức phân tích cấu trúc Bảng (Tables/Views), tự động sinh ra tức thì (Instant) 1 bộ các cụm **GraphQL APIs cực kì đồ sộ** và hoàn chỉnh tuyệt đối, đáp ứng mọi quy tắc CRUD (Create, Read, Update, Delete) cho các bảng đó. Frontend có thể vào sử dụng chọc thẳng câu truy vấn GraphQL lôi Data mà Backend **không cần phải gõ lấy 1 dòng code nào phần API**.

## 2. Các điểm độc đáo (Killer Features) làm nên tên tuổi Hasura

### a. Instant GraphQL APIs (Tạo GraphQL tức thì)
Bạn tạo bảng trong CSDL: Bảng `User`, Bảng `Post`, có khóa ngoại (Foreign key) trỏ `User -> Post`.
Ngay lập tức không cần code, Hasura mở cổng API GraphQL. Bạn ở Frontend gõ câu lệnh gửi lên:
```graphql
query {
   users {
      id 
      name
      posts (where: {rating: {_gt: 4}}, order_by: {created_at: desc}) {
         title
      }
   }
}
```
Và bùm, Dữ liệu Json về tận tay chính xác, lọc bài viết đánh giá trên 4 sao, sắp xếp thời gian. Rút ngắn thời gian làm việc hàng chục tuần làm Rest API và setup ORM khổ sở của Backend developer.

### b. GraphQL Subscriptions (Real-time xịn xò out-the-box)
Chỉ cần đổi chữ `query` thành `subscription` ở đầu. Câu lệnh truy vấn GraphQL của Frontend bỗng biến thành một luồng truyền phát WebSocket bất tận. Cứ ở phe CSDL Postgres có người thêm sửa xóa bảng đó, màn hình Frontend sẽ Lập tức Reactive nhảy số theo real-time mà khỏi cần set up Socket.io, Redis PubSub lằng nhằng. (Thích hợp cực tốt tạo ứng dụng Dashboard hay app Chat).

### c. Fine-Grained Access Control (Cấp quyền sâu đến tận chân tơ kẽ tóc RLS)
Chưa ai khen Hasura mà không nhắc về cái này! 
Hasura kết hợp cực tốt với JWT (Auth0, Firebase..). Khi nhận JWT truyền vào chứa cái "Role" (Ví dụ xưng danh: `user`, `admin`). Chui vào bảng quản trị Web Hasura bằng tay click cài chốt cấu hình: 
*"Rule 1: Role 'User' chỉ được truy cập vào bảng `Post` nơi cột `author_id` bằng biến `X-Hasura-User-Id` do mã thông báo JWT cung cấp"*.
=> Bạn cấp chung cái cổng GraphQL khổng lồ cho cả Thế giới dùng. Front-end có quậy thả cửa truy vấn ngẫu nhiên `Select All` thì cũng sẽ CHỈ VẼ RA DATA của chính anh ta tạo. Không bao giờ lộ bài viết của người khác ra ngoài nhờ lớp chắn ngầm. Giới hạn Select, Insert, Update ở tầm cấp độ cột (Column-level) và Dòng (Row-level RLS).

### d. Event Triggers & Actions (Luồng móc nối Webhook)
Hasura chỉ mạnh ở khâu CSDL, nhưng nó sinh ra để bắt nhịp kiến trúc **Microservices / Serverless**.
- **Event Triggers (Sự kiện Móc nối):** Bạn bảo Hasura: *"Hễ có Dòng Insert mới ở Bảng Order, thì nhấc Server chạy ngầm gọi API bắn cái Body Json sang cái hàm AWS Lambda Serverless xử lý Gửi Email tự động kia nha"*. Khác biệt ở chỗ nó bền bỉ cao, dùng cơ chế Queue trong DB tránh xịt.
- **Actions/Remote Schemas:** Không lạm dụng Hasura vì nghiệp vụ như (Gửi mail, Hash mật khẩu thẻ Visa, Checkout Stripe thanh toán...) thì Database/GraphQL ko tự cày được. Tính năng này cho phép bạn viết 1 Hàm Nodejs riêng bên ngoài giải phẫu logic đó, xong trỏ kéo ghép cổng vào với cây GraphQL Root của Hasura thành 1 cục thống nhất duy nhất.

## 3. Ưu và nhược điểm
**Ưu điểm:**
- Tăng tốc độ phát triển (Time-to-market) giảm 50-80% thời gian code tầng Backend cho các dự án nặng về CRUD và Realtime. Xưa build tính năng làm mất 1 tháng, với Hasura làm trong 2-3 ngày.
- Tối ưu cực mạnh các câu lệnh Database (Compile GraphQL sang SQL tĩnh tối ưu, giải quyết nát bét bài toán N+1 Problem kinh điển của GraphQL thông thường).

**Nhược điểm:**
- Gắn chặt triết lý Data-Driven (Gần như DB-first). Mọi thay đổi về code và nghiệp vụ nằm chằng chịt trong Settings quy tắc của Database và Config Hasura -> Rất khó bảo trì, Test, luân chuyển Code review trên Github cho các tập đoàn vì nó không hiện hữu dưới dạng code file (Dù đã hỗ trợ Migration/Metadata sync nhưng thao tác Git CI/CD vẫn bị lợn cợn đau đầu so với Prisma JS thuần codebase).
- Nếu App của bạn chú trọng hàng trăm luồng File/Images upload, nhồi nhét xử lý AI Text ảnh, gọi API 10 bên thứ 3 móc nối liên tục, mà lại ít DB CRUD -> Dùng Hasura hoàn toàn là một cục nợ tạ cồng kềnh quá tải. Không đem lại ích lợi gì.
