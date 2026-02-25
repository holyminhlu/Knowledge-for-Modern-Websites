# SQL Injection (SQLi)

## 1. Khái niệm (What is SQL Injection?)
SQL Injection (SQLi) là một kỹ thuật tấn công web kinh điển và nguy hiểm, trong đó kẻ tấn công chèn (inject) các đoạn mã SQL độc hại vào các trường dữ liệu đầu vào (input) của ứng dụng web. 
Mục đích là để thao túng cơ sở dữ liệu (Database) ở phía backend, lừa ứng dụng thực thi các truy vấn ngoài ý muốn gốc do lập trình viên thiết kế, từ đó có thể xem, sửa đổi hoặc xóa dữ liệu, đôi khi là đánh sập cả hệ thống.

## 2. Cơ chế hoạt động (How it works)
Khi ứng dụng web nhận dữ liệu từ người dùng (ví dụ: form đăng nhập, id sản phẩm, thanh tìm kiếm) để thực hiện các câu gọi cơ sở dữ liệu nhưng lại thiếu sự kiểm tra hoặc làm sạch (sanitize) kỹ lưỡng. Dữ liệu này bị ghép nối thẳng vào chuỗi câu SQL.

**Ví dụ cơ bản:**
Giả sử câu truy vấn xác thực người dùng ban đầu được viết theo kiểu nối ghép chuỗi:
```sql
SELECT * FROM users WHERE username = 'USER_INPUT' AND password = 'PASSWORD_INPUT';
```

Nếu tại giao diện đăng nhập, kẻ tấn công điền vào trường username giá trị: `admin' --`
Câu truy vấn được ghép lại gửi về phía CSDL sẽ biến thành:
```sql
SELECT * FROM users WHERE username = 'admin' --' AND password = 'PASSWORD_INPUT';
```
Trong SQL, dấu `--` biểu thị cho bắt đầu một dòng comment, do đó toàn bộ đoạn logic kiểm tra mật khẩu ở phía sau sẽ bị CSDL bỏ qua hoàn toàn. 
Kết quả: Kẻ tấn công sẽ đăng nhập được vào tài khoản `admin` thành công mà không cần quan tâm mật khẩu là gì!

## 3. Các phân loại (Types of SQLi)
SQL Injection được chia thành 3 nhóm hình thức tấn công chính:

### a. In-band SQLi (Cổ điển & Phổ biến nhất)
Kẻ tấn công lấy dữ liệu đánh cắp được trên cùng một kênh đã thực hiện hành vi tấn công (ví dụ lấy trên chính trình duyệt, thông qua phản hồi HTTP trả về).
- **Error-based SQLi:** Kẻ tấn công cố tình đưa vào các cú pháp sai để ép Database trả về thông báo lỗi trực tiếp lên giao diện người dùng. Các thông báo tự sinh này thường sẽ rò rỉ cấu trúc DB, tên bảng, version của hệ quản trị CSDL.
- **Union-based SQLi:** Sử dụng toán tử `UNION` trong SQL để nối ghép kết quả của câu truy vấn gốc với kết quả giả mạo của kẻ tấn công, bắt ứng dụng hiển thị trả về cho họ những dữ liệu từ các bảng khác.

### b. Inferential SQLi (Blind SQLi - SQLi mù)
Ứng dụng web không trực tiếp trả về bất kỳ kết quả dữ liệu hay lỗi nào trên giao diện khiến kẻ tấn công không thể đọc "trực tiếp". Lúc này, tin tặc sẽ phải gửi từng payload và quan sát hành vi hệ thống phản hồi (thời gian phản hồi hoặc sự thay đổi trên HTML) để "suy luận" ra dữ liệu. 
- **Boolean-based (Content-based) Blind SQLi:** Gửi câu truy vấn có các tham số điều kiện Đúng/Sai. Bằng cách so sánh nội dung mà website phản hồi lại nếu kết quả truy vấn là TRUE có khác với nếu kết quả là FALSE hay không, kẻ dọa có thể đoán được từng kí tự của dữ liệu trong DB.
- **Time-based Blind SQLi:** Bắt database phải chờ một khoảng thời gian trước khi trả lời (dùng lệnh `SLEEP()` hoặc `WAITFOR DELAY`). Bằng cách đếm khoảng thời gian server trì hoãn trả lời, kẻ tấn công có thể xác minh được việc thực thi SQL thành công và đánh cắp thông tin từng chút một.

### c. Out-of-band SQLi (OOB SQLi)
Xảy ra khi không thể dùng In-band (do đã bị lọc) hoặc Blind SQLi quá chậm chạp. Nó phụ thuộc vào các tính năng riêng và quyền của Database Server để ép kích hoạt các request mạng ra bên ngoài (ví dụ gửi bản ghi lấy được ra hệ thống máy chủ bên ngoài bằng HTTP Request hay DNS log qua mạng do hacker thao túng).

## 4. Hậu quả (Impact)
Hậu quả của SQL Injection thường nằm ở mức thảm họa (Critical):
- **Bypass Authentication:** Vượt qua được luồng đăng nhập, nâng quyền trái phép.
- **Rò rỉ dữ liệu (Data Breach):** Lấy cắp thông tin nhạy cảm của người dùng (tài khoản, mật khẩu băm, thông tin thẻ tín dụng, API key ...).
- **Can thiệp tính toàn vẹn:** Có quyền thêm, sửa, xóa (INSERT, UPDATE, DELETE) thông tin trong Database, hoặc thả mã độc vào cơ sở dữ liệu hiện hành.
- **Mất kiểm soát hệ thống (RCE):** Trong nhiều trường hợp nếu CSDL được cấp quyền quá cao với hệ điều hành đang chạy, hacker có thể chạy trực tiếp command lines trên máy chủ gốc (Remote Code Execution) như lệnh `xp_cmdshell` bên SQL Server.

## 5. Các phương pháp phòng chống (Prevention & Mitigation)

### a. Sử dụng Prepared Statements (Parameterized Queries) - Quan trọng nhất!
Đây là cách cơ bản và **hiệu quả nhất**.
Với Parameterized Queries, chúng ta không nối chuỗi input vào truy vấn. Tham số được truyền riêng biệt. Hệ quản trị CSDL sẽ tự động compile trước câu lệnh SQL và coi mọi dữ liệu input của người dùng đơn thuần chỉ là dạng String chứ không phải lệnh có quyền thực thi. Bạn đang ép CSDL phân biệt rõ đâu là **Code** và đâu là **Data**.

**Ví dụ sửa bằng Java (JDBC):**
```java
// Cách làm SAI: 
// String query = "SELECT * FROM users WHERE id = '" + userInputId + "'"; 

// CÁCH LÀM ĐÚNG:
String query = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, inputUser);  // Chèn String an toàn
pstmt.setString(2, inputPass);
ResultSet results = pstmt.executeQuery();
```

### b. Sử dụng Object-Relational Mapping (ORM)
Các framework ORM như Hibernate (Java), Entity Framework (C#), Prisma (Nodejs), Eloquent (PHP)... mặc định thường sử dụng sẵn parameterized queries ngầm ở mảng bên dưới. Miễn là lập trình viên không cố tình ghi đè bằng code Raw SQL/Native SQL thủ công thì rủi ro bị dính SQLi được giải quyết hơn 90%.

### c. Sử dụng Stored Procedures
Giống với Prepared statements, phần lớn các Stored procedures (thủ tục lưu thế) phân tách chặt chẽ phần lệnh SQL và phần tham số. (Tuy nhiên lưu ý: nếu bên trong Stored Procedure mà vẫn thực hiện tạo Query động kiểu Execute Dynamic SQL bằng cách ghép nối chuỗi thì vẫn bị dính SQLi).

### d. Input Validation (Xác thực đầu vào) & Sanitize (Làm sạch)
- **Allow-listing (Whitelist):** Luôn có vòng kiểm duyệt, ví dụ: "tuổi" chỉ được phép là số không được là ký tự; Regex cho email, độ dài maxlength... Nếu input không khớp, từ chối nạp thẳng trực tiếp xuống tầng Database.
- **Escaping Ký tự đặc biệt:** Nếu bất đắc dĩ phải tạo truy vấn động (ví dụ SORT BY trường nào đó), hãy dùng các hàm escape (thoát) ký tự đặc biệt (`'`, `"`, `\`, v.v.) dành riêng cho trình quản trị CSDL mà bạn dùng. Tuyệt đối không tự viết hàm Regex lọc chữ SQLi thay database driver!

### e. Nguyên tắc đặc quyền tối thiểu (Principle of Least Privilege)
- Không bao giờ để cho hệ thống Web của bạn kết nối xuống DB server bằng tài khoản quản trị hệ thống có toàn quyền (ví dụ `sa`, `root`, `postgres`..).
- Chỉ cấp cho DB User quyền thao tác ở giới hạn những cái web cụ thể cần sử dụng (Ví dụ: Web Frontend thì chỉ được GET, POST bài, không được DROP TABLE). Cấp quyền càng nhỏ lẻ thì rủi ro khi bị exploit SQLi càng được giảm thiểu thiệt hại.
- Huỷ các quyền thực thi hàm hệ điều hành mở rộng nếu không thực sự sử dụng (bỏ `xp_cmdshell` v.v).

### f. Tường lửa Web Application Firewall (WAF)
Kết hợp thêm một giải pháp Bảo mật lớp mạng/ứng dụng như WAF để tự động bắt và loại bỏ các Payload có chứa signature đặc biệt của SQL Injection đến từ người dùng.

---
**Tổng kết:** Lỗi SQL Injection là lỗi vô cùng cổ điển, cách khắc phục cũng đã rõ mười mươi nhưng lại luôn ở trên Top rủi ro xếp hạng cao do những bất cẩn trong lúc lập trình và làm dự án vội vã lạm dụng chức năng nối chuỗi để truy vấn nhanh. Quán triệt tư tưởng **Luôn Tham Số Hóa Truy Vấn** là chìa khóa giải pháp dứt điểm nhất.
