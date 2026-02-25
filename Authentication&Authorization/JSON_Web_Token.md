# JSON Web Token (JWT)

## 1. Khái niệm (What is JWT?)
**JSON Web Token (mã JWT)** là một chuỗi ký tự chuẩn mở (RFC 7519) dùng để trao đổi thông tin (claims) một cách an toàn và nhỏ gọn giữa hai hoặc nhiều bên (thường là giữa Client bên Frontend và Server bên Backend). 
JWT được tạo ra để giải quyết bài toán Xác thực (Authentication) và Ủy quyền (Authorization) trong các hệ thống Web hiện đại, đặc biệt là theo kiến trúc Stateless (Không lưu trữ trạng thái REST API).

## 2. Cấu trúc của một Token JWT
Một chuỗi JWT nhìn như một dải chữ mã hóa loằng ngoằng. Nhưng thực chất nó được ghép lại bởi 3 phần bị mã hóa Base64 và phân cách nhau bằng 2 dấu chấm `.`.

Cấu trúc: `Header.Payload.Signature`

- **Header (Phần đầu):** Loại thẻ (luôn là "JWT") & Thuật toán mã hóa để tạo chữ ký (phổ biến nhất là HMAC SHA256 - ghi là `HS256`, hoặc thuật toán khóa bất đối xứng `RS256`).
- **Payload (Phần thân):** Chứa các thông tin cốt lõi truyền tải (gọi là "Claims"). Ví dụ: `{ "userId": 1, "role": "admin", "exp": 1700000000 }`. 
  - (Cực kì lưu ý: Phần này CHỈ BỊ MÃ HÓA BASE64 CHỨ KHÔNG ĐƯỢC MÃ HÓA BẢO MẬT. Bất kỳ ai copy token ném lên trang jwt.io đều giải mã đọc được JSON ở trong. Tuyệt đối không nhét Password hay số thẻ tín dụng vào Payload).
- **Signature (Chữ ký):** Linh hồn của JWT. Server ghép mã Base64 của `Header`, mã Base64 của `Payload`, và phang vào phương thức cắt băm bí mật kết hợp với một chuỗi `SECRET_KEY` (Chỉ Server được biết). Tạo ra chốt chặn an toàn: Dù Hacker đọc được Payload nhưng hễ đổi số bên trong Payload ("userId" = 2) thì chữ ký sẽ vỡ/sai lệch ngay lập tức và Server sẽ đuổi cổ cái token đó đi vì biết token bị giả mạo.

## 3. Quá trình hoạt động cơ bản (Workflow)
1. **Login:** Người dùng gửi `Username` + `Password` lên API đăng nhập.
2. **Ký Token:** Server nhận thấy đúng mật khẩu, liền gom thông tin về userId, chức vụ (role) đóng gói vào Payload, tạo ra chữ ký bằng Secret Key và nhồi thành cục chuỗi `eyJh...` rồi trả ngược chuỗi này về Frontend.
3. **Lưu trữ:** Frontend nhận Token, thường cất vào `LocalStorage`, `SessionStorage` hoặc `Cookies`.
4. **Sử dụng:** Những lần sau gọi API xin thông tin cá nhân, thay vì truyền mật khẩu, Frontend tự nhét token vào thẻ HTTP Header: `Authorization: Bearer <token_gửi_đến>`.
5. **Xác thực:** Server nhận Request, tháo chữ ký ra kiểm tra xem khớp Secret Key không, xem Token này còn Hạn sử dụng (Expiration / exp) chưa. Nếu hợp lệ, nhả data cho User coi.

## 4. Ưu điểm của JWT
- **Stateless (Vô trạng thái):** Đây là ưu điểm mạnh cỡ nổ vũ trụ so với kỹ thuật dùng Session Cookies thời cổ đại. Web Server hoàn toàn "mất trí nhớ", không cần lưu giữ thông tin session hay query xuống Database để tra soát xem session còn sống không. Server chỉ cần toán học "Mày chìa cái Token ra tao xoay chữ ký là biết mày hợp lệ, tao giải nén lấy luôn User-ID khỏi mất công chọc vào DB truy vấn id".
- **Tuyệt vời cho Microservices và khả năng Scale chéo:** Server A phát hành JWT. Máy chủ cụm thứ 5 là Server Z nhận được cái token đó, miễn là 2 máy chủ xài chung `SECRET_KEY`, máy chủ Z tin tưởng Token đó. Chống ngắt quãng Session khi bạn scale ngang 100 máy chủ (Horizontal Scaling).
- **Gọn nhẹ dễ dàng truyền tải:** Chạy trên Header HTTP hoặc truyền qua URL rất thoải mái, dùng chung cho cả Web và Mobile App.

## 5. Nhược điểm và Cách khắc phục thiết yếu
- **Không tự Thu hồi (Revoke) được:** Khi cấp cái thẻ căn cước (JWT) ra rồi và bảo "Token này hạn 3 tiếng nữa chết", thì nếu lỡ User phát hiện bị lộ token ra mạng, Server hoàn toàn VÔ PHƯƠNG KẾU CỨU hủy được chiếc token đó từ phe mình trước 3 tiếng. 
-> *Cách fix (Hạ cấp tính năng JWT):* Xây một bảng Blacklist trên Redis, mỗi lần nhận Token bắt buộc vào Redis tra xem nó có bị chặn không. (Việc này vô tình biến JWT thành Stateless nửa mùa, quay về nhược điểm tra cứu Session cũ).
- **Không thể thay đổi dữ liệu Real-time (Payload Stale):** Server thu quyền admin của User A về quy chuẩn người thường. Sáng mai anh ta mới mất chức. Nhưng nếu anh ta đang cầm cái JWT rành rành báo `role: "admin"` và hạn là 1 tháng... anh ta có quyền xài cái thẻ giả mạo đó tới hết tháng.
-> *Cách fix:* Thời hạn Expired bắt buộc phải để cực kỳ cực kỳ siêu cấp ngắn (VD: 10 đến 15 phút), ghép cặp theo mô hình `Access Token & Refresh Token` để Server liên tục được ép xin chữ ký token mới và update quyền liên tục.
- **Kích thước to dần:** Càng nhét nhiều User Data, JSON To lên, chuỗi Token dài ra theo hàm Log. Mỗi request đều cõng 1 cục Header 2-3KB rất tốn băng thông. Tránh nhét quá 3-4 trường vào đó.
