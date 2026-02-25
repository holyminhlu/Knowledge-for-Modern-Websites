# Access Token & Refresh Token (Pattern bảo mật JWT)

## 1. Khung cảnh: Yêu cầu bức thiết sinh ra mô hình này
Vấn đề với JSON Web Token (JWT) là như một tấm "Vé xem phim". Nhỡ bạn đánh rơi vé (Bị hacker trộm qua lỗi XSS ở Frontend), hacker dùng nó đi coi phim tới tấp và Server không thể tự động hủy vé (Do tính chất Stateless của JWT).

Nếu để hạn JWT là **1 năm (Lâu dài)**: Tuyệt vời, người dùng đăng nhập 1 lần 1 năm không văng. THẢM HỌA: Bị lộ là mất tài khoản cả năm hacker quậy.
Nếu để hạn JWT là **15 phút (Ngắn)**: Tuyệt vời bảo mật cao, hacker trộm được cùng lắm 15 phút sau vé hư. THẢM HỌA: Người sử dụng cứ 15 phút dùng cái Web đang gõ bài là văng ra bắt Login gõ lại Mật khẩu 1 lần chửi thề nghỉ chơi luôn.

👉 **Và mẫu hình thiết kế Access Token & Refresh Token ra đời! Mũi tên trúng 2 đích.**

## 2. Khái niệm và Nhiệm vụ

### a. Access Token (Vòng đời rất Ngắn)
Đây là chiếc chìa khóa dùng để trực tiếp thọc tay xin tài nguyên trên các API Server.
- Thường sinh ra dưới dạng file JWT. Chứa các thông tin định danh như `userId`, `role`.
- **Hạn sử dụng (Expiration):** Siêu siêu ngắn (Ví dụ: 15 phút, 1 tiếng).
- **Nơi cất giữ ở Client:** Lưu trong biến in-memory ở js (bay hơi khi F5) hoặc nơi an toàn chống trộm XSS.
- **Vai trò:** Dù hacker có ăn trộm được, nó ráng sức vét API cũng chỉ trụ đến đúng cái thời điểm 15 phút đó là hết vẹo, vé thiu không dùng được nữa.

### b. Refresh Token (Vòng đời rất Dài)
Đây KHÔNG dùng để chạm vào tài nguyên API (Sẽ bị đuổi). Cầm nó trong tay chỉ có duy nhất 1 công dụng: Chạy ra cổng bảo vệ, đổi lấy lại `Access Token`.
- Thường là một chuỗi ngẫu nhiên Opaque Token mã hóa dầy cộp (VD UUID) lưu trong Database. Trình độ nâng cấp hơn là nó cũng là JWT.
- **Hạn sử dụng (Expiration):** Siêu dài (Ví dụ: 7 ngày, 30 ngày, 365 ngày...). Thậm chí là xoay vòng hạn mãi mãi (Vào chơi Liên Quân/Facebook 5 năm chưa bắt nhập lại pass là nhờ nó).
- **Nơi cất giữ ở Client:** Lưu ở HTTPOnly-Cookies (Cực kì khó bị script JS trộm cắp) cực lỳ an toàn.
- **Vai trò:** Miễn là RT còn hiệu lực, bất cứ lúc nào Access Token 15 phút của user bị chết (báo lỗi 401), app viết JS chạy ngầm gửi chiếc RT này lên cổng, máy chủ kiểm tra đối chiếu Database, thả xuống tay User một **chiếc Access Token mới cứng rèn nguyên tem 15 phút** cùng một **chiếc Refresh Token mới**. User cứ thế vừa dùng app lướt êm ái mà không hể bị giật khựng bắt nhập lại mật khẩu một lúc nào.

## 3. Kiến trúc luồng hệ thống đầy đủ (Authentication Flow)
1. **Login lần 1:** Gửi Cặp {Username, Password}.
2. **Server Kiểm tra -> Success:** Cấp trả về cho Client 1 mâm gồm 2 thứ `[AccessToken]` và `[RefreshToken]`. 
   (Database sẽ được lưu kèm bảng session giữ bản sao/id của RefreshToken đó).
3. **Thao tác API Bình thường:** Frontend nhét gửi kèm header `Bearer AccessToken` qua mọi route bảo mật. Server vui vẻ nhả Data.
4. **Hết hạn AT (15 phút sau):** Frontend gọi API /Get_Balance, đính gửi Bearer AT. 
   -> Server kiểm tra chữ ký -> Ôi hết Time Expried -> ném trả Cục gạch Lỗi `HTTP 401 (Unauthorized)`.
5. **Cứu vãn (Silent Refreshing):** Thay vì văng giao diện ra bắt login. Code Axios Interceptor bên Frontend thấy lỗi 401 tĩnh bơ tự động tạm chặn đường hiển thị UI. Chạy âm thầm xuống gọi 1 API riêng chuyên dụng: `/api/refresh-token`, nhét vào gói hàng chữ ký `[RefreshToken]`.
6. **Server xác nhận cấp vé vớt:** Xác minh đúng RT, check Redis DB thấy tài khoản này không bị khóa, thả ngay một cặp `[New_AT]` và `[New_RT]`.
7. **Phục hồi lọt vào trong:** Frontend chớp lấy cặp mới, đè lưu lại ở dưới, lôi cái cái Request `/Get_Balance` vừa bị chết ở bước 4 xịt nước thánh bơm `New_AT` vào và xông lên xin Server. Lần này trả kết quả 200 OK. Mắt thường User không cảm nhận được 1s độ khựng delay kia. Nếu User không mở máy dùng trong 30 Ngày, Refresh limit chết lây -> Lên bảng đếm số về lại màn hình nhập Mật khẩu.

## 4. Bảo mật Cao cấp (Refresh Token Rotation)
Thế rủi hacker ăn trộm thần kì được cục Refresh Token siêu mạnh dưới hòm tiền thì sao? Khác gì cái vé cày vĩnh viễn?

**Giải pháp Vàng: Refresh Token Rotation (Xoay vòng)**
Mỗi một lần User đem rã RT cũ lên xin đổi AT mới. Server không chỉ phát AT mới, mà nó đưa kèm **Một cục Refresh Token mới cứng 100%**, và lập tức thiêu rụi dán tem báo "Cấm cản" lên cục Refresh Token cũ vừa mang lên đổi.
=> Đồng nghĩa mỗi cái Refresh Token trên đời chỉ xài được ĐÚNG 1 LẦN DUY NHẤT. (One-time use).

**Kịch bản giăng bẫy Hacker:**
- Hacker trộm được RT(số 1) của User lúc khuya, đem cất mai xài.
- User xài thật, mang RT(số 1) lúc sáng lên xin vé mới. Server vui vẻ hủy RT(Số 1), cấp phát RT(số 2) mới toanh về máy cho User.
- Trưa hacker đem cục đồ trộm RT(số 1) lên xài. Server bỡ ngỡ hoảng hốt: "What the... Cục vé này đã cào hôm trước rồi mà? Tại sao có thằng chìa ra nữa. Đã có kẻ ăn trộm nẫng tay trên, hoặc bị replay. HỆ THỐNG CẢNH BÁO CAO ĐỘ!".
- **Server rút gươm tàn sát:** Hủy cái RT(Số 1), Lên Database truy cập dội bom xóa luôn cái chain sinh sôi RT(Số 2) của chuỗi máy tính User đang nằm chung trên giường luôn. 
- **Kết quả:** Hacker bị văng màn hình trắng. User... cũng bị văng (Đành phải dậy nhập pass). Nhưng nhờ thế Tài khoản User KHÔNG bao giờ bị hack hay rút mất đồng xu nào nữa. Đỉnh cao Security OIDC.
