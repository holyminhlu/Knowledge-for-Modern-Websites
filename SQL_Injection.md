SQL Injection (SQLi) là một kỹ thuật tấn công phổ biến vào các ứng dụng web, trong đó kẻ tấn công chèn (inject) các đoạn mã SQL độc hại vào các trường nhập liệu (như ô tìm kiếm, form đăng nhập) để can thiệp vào các truy vấn mà ứng dụng gửi đến cơ sở dữ liệu.

Mục đích chính của SQL Injection là lừa hệ thống cơ sở dữ liệu thực thi các lệnh mà lập trình viên không hề mong muốn.

Cơ chế hoạt động của SQL Injection
Thông thường, một ứng dụng web sẽ lấy dữ liệu người dùng nhập vào và ghép nối trực tiếp vào câu lệnh SQL.

Ví dụ: Giả sử bạn có một form đăng nhập và câu lệnh SQL kiểm tra người dùng được viết như sau:

SQL
SELECT * FROM users WHERE username = '$username' AND password = '$password';
Nếu một người dùng bình thường nhập username là john và password là 123456, câu lệnh sẽ trở thành:

SQL
SELECT * FROM users WHERE username = 'john' AND password = '123456';
Tuy nhiên, kẻ tấn công sẽ nhập khác đi:
Thay vì nhập tên đăng nhập thông thường, họ sẽ nhập vào ô username đoạn mã sau: admin' -- (và để trống mật khẩu). Câu lệnh SQL thực tế chạy trong hệ thống sẽ biến thành:

SQL
SELECT * FROM users WHERE username = 'admin' --' AND password = '';
Trong SQL, ký hiệu -- (hoặc # tùy hệ quản trị CSDL) dùng để chú thích (comment), nghĩa là mọi thứ đằng sau nó sẽ bị bỏ qua. Hệ thống chỉ thực thi phần SELECT * FROM users WHERE username = 'admin', và kẻ tấn công ngay lập tức đăng nhập thành công dưới quyền Admin mà không cần mật khẩu.

Hậu quả của SQL Injection
Nếu ứng dụng bị dính lỗi SQL Injection, kẻ tấn công có thể:

Vượt qua lớp xác thực: Đăng nhập vào các tài khoản quản trị mà không cần mật khẩu.

Đánh cắp dữ liệu (Data Breach): Đọc được các thông tin nhạy cảm trong cơ sở dữ liệu như thông tin thẻ tín dụng, mật khẩu người dùng, dữ liệu cá nhân.

Sửa đổi hoặc xóa dữ liệu: Thêm, sửa, hoặc xóa toàn bộ dữ liệu (ví dụ: dùng lệnh DROP TABLE).

Chiếm quyền điều khiển máy chủ: Trong một số trường hợp cấu hình lỏng lẻo, SQLi có thể tạo đà để hacker tấn công sâu hơn vào hệ điều hành của máy chủ.

Cách phòng chống SQL Injection
Để bảo vệ ứng dụng khỏi SQL Injection, nguyên tắc cốt lõi là không bao giờ tin tưởng dữ liệu người dùng nhập vào. Bạn có thể áp dụng các biện pháp sau:

Sử dụng Parameterized Queries (Prepared Statements): Đây là cách hiệu quả nhất. Dữ liệu người dùng nhập vào sẽ được xử lý như các "tham số" chứ không phải là một phần của mã lệnh SQL.

Sử dụng Object-Relational Mapping (ORM): Các framework như Entity Framework, Hibernate, hay Eloquent (trong Laravel) thường tự động sử dụng Prepared Statements, giúp hạn chế rủi ro.

Xác thực và làm sạch dữ liệu đầu vào (Input Validation & Sanitization): Kiểm tra kỹ kiểu dữ liệu (chỉ cho phép số, email hợp lệ...) trước khi đưa vào truy vấn.

Phân quyền tối thiểu (Least Privilege): Tài khoản mà ứng dụng web dùng để kết nối với cơ sở dữ liệu chỉ nên có các quyền cơ bản (SELECT, INSERT, UPDATE). Không dùng tài khoản sa (System Administrator) hoặc root cho ứng dụng web.