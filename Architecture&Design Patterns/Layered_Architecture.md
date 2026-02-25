# Layered Architecture (Kiến trúc phân lớp / N-Tier)

## 1. Khái niệm (What is Layered Architecture?)
**Layered Architecture (Kiến trúc phân lớp)** là mẫu kiến trúc phần mềm kinh điển, dễ hiểu và phổ biến nhất thế giới. Hầu hết các lập trình viên đều mặc định thiết kế ứng dụng theo mô hình này khi bắt đầu một dự án Backend mới.
Trong Layered Architecture, hệ thống được chia cắt thành nhiều khối thành phần ngang nằm xếp chồng lên nhau (như một chiếc bánh nhiều tầng). Mỗi tầng (Layer) đảm nhận một vai trò cụ thể trong toàn bộ vòng đời Request/Response của ứng dụng.

**Quy tắc bất di bất dịch:** Tầng ở trên chỉ được phép gọi và phụ thuộc xuống tầng ngay liền kề dưới nó (Theo luồng từ trên xuống dưới - Top-Down). Không được phép nhảy cóc (Ví dụ Web Layer không được nhảy thẳng xuống Database).

## 2. Mô hình 3 Tầng tiêu chuẩn (3-Tier Architecture)

### a. Presentation Layer (Tầng Giao diện / Controllers)
- Nơi hứng chịu toàn bộ các Request (Yêu cầu) từ phía người dùng, Client, trình duyệt hoặc Mobile App.
- **Trách nhiệm chính:** Kiểm tra xác thực (Auth/Validation), bóc tách HTTP Request lấy ra params, body, điều phối gọi tầng dưới xử lý, lấy kết quả về và bọc lại thành cục Response JSON hoặc HTML trả về cho khách.
- **Ví dụ:** Các file Controller, Routes (Endpoint API). Lớp Web.

### b. Business Logic Layer / Service Layer (Tầng Nghiệp vụ / Dịch vụ)
- Trái tim của hệ thống. Đây là nơi chứa toàn bộ tri thức và các quy định của phần mềm (Business Rules). 
- **Trách nhiệm chính:** Thực hiện thuật toán tính toán, xử lý logic, nghiệp vụ, quyết định xem một user có được phép vay tiền không, xuất hóa đơn ra làm sao, tính tổng số dư...
- **Quan trọng:** Tầng này không được chứa code quan tâm tới Request của Web HTTP (`req/res`) hay câu truy vấn SQL (Query). Nó thuần nhận Arguments đầu vào và xử lý.
- **Ví dụ:** Các file Services (`UserService`, `OrderService`).

### c. Data Access Layer / Persistence Layer (Tầng Truy cập dữ liệu)
- Tầng giao tiếp sâu nhất nằm ở đáy của ứng dụng.
- **Trách nhiệm chính:** Chứa mã code dùng để nói chuyện trực tiếp với Database, File System, hoặc các 3rd Party APIs bên ngoài. Dịch cái yêu cầu lấy dữ liệu từ tầng trên thành các câu `SELECT/INSERT/UPDATE` SQL bóc tách bản ghi tương ứng.
- **Ví dụ:** Các file Repositories (`UserRepository`, `ProductDAO`), thư mục cài đặt ORM (Hibernate, TypeORM).

## 3. Ưu điểm của kiến trúc lớp
- **Dễ hiểu, dễ tổ chức:** Chia ngăn nắp 3 phần (Giao tiếp HTTP -> Xử lý logic -> Lưu trữ Database). Ngay cả lính mới (Junior) nhìn vào thư mục là lường trước ngay được file nào nhét ở đâu.
- **Bảo trì dễ dàng:** Cần sửa câu query? Vào DAO/Repository. Cần sửa logic thuế? Vào Service. Cần đổi API trả về XML thay vì JSON? Vào Controller. Sự phân tách trách nhiệm (SRP) được đề cao.
- Phù hợp hoàn hảo để đẩy nhanh tiến độ làm các dự án Web nguyên khối (Monolithic App) của các Startup/Công ty vừa và nhỏ.

## 4. Nhược điểm (Những cái bẫy chết người)
- **Kiến trúc vỡ trận (Kiến trúc vũng bùn - Big Ball of Mud):** Do không có nguyên tắc mạnh như Clean Architecture, lập trình viên sẽ rất dễ nhét thẳng câu truy vấn SQL vào Controller để code nhanh cho xong lúc deadline, bẻ gãy mọi vách ngăn của Layer.
- **Database Driven Design (Bị DB thống trị):** Logic nghiệp vụ thường bị phụ thuộc quá lố vào cách tổ chức bảng trong DB (Table-first design). Dẫn tới khi muốn sửa 1 cột trong database, ta phải đập nát sửa lại từ DAO, lên Service, và sửa hỏng luôn cả Controller. Phụ thuộc Bottom-Up rất lớn.
- **Kiến trúc kẹt băng thông:** Nhiều khi Request chỉ đòi `SELECT * FROM users`, ta vẫn bị bắt ép code viết ra 1 file rỗng bên Service chỉ để làm cầu chuyền bóng trung gian, gõ 1 đống Boilerplate dư thừa.
