# Clean Architecture (Kiến trúc Sạch)

## 1. Khái niệm (What is Clean Architecture?)
**Clean Architecture (Kiến trúc Sạch)** là một triết lý thiết kế phần mềm được đề xuất bởi Robert C. Martin (Uncle Bob). Mục tiêu tối thượng của nó là sự **phân tách mối quan tâm (Separation of Concerns)**, giúp hệ thống phần mềm tách biệt hoàn toàn phần cốt lõi của nghiệp vụ (Domain/Business Logic) ra khỏi các phần hạ tầng râu ria xung quanh (Database, Giao diện Web, Frameworks).

Khi hệ thống áp dụng Clean Architecture, bạn có thể dễ dàng thay đổi Framework (từ Express sang NestJS), đổi Database (từ MySQL sang MongoDB), hay đổi Giao diện (từ Web sang Mobile) mà **không cần đụng đến hay sửa đổi 1 dòng code logic nghiệp vụ cốt lõi nào**.

## 2. Cấu trúc Vòng tròn đồng tâm (The Onion/Circular Model)
Kiến trúc Sạch thường được biểu diễn bằng hình các vòng tròn lồng vào nhau. Quy luật quan trọng nhất và duy nhất là **The Dependency Rule (Quy tắc phụ thuộc):** *Mã nguồn (Dependencies) chỉ được phép trỏ từ vòng ngoài vào vòng trong. Vòng trong không được phép biết bất cứ thứ gì về vòng ngoài nó.*

Từ trong ra ngoài gồm 4 lớp chính:

### a. Entities (Thực thể - Vòng cốt lõi trong cùng)
- Chứa các quy tắc nghiệp vụ cốt lõi của toàn hệ thống doanh nghiệp (Enterprise Business Rules).
- Là các đối tượng cơ bản nhất, độc lập nhất. Ví dụ: Định nghĩa cấu trúc của một `User`, tính toán tiền lãi suất ngân hàng.
- **Không bao giờ thay đổi** khi giao diện hay database thay đổi. Code thuần class ngôn ngữ không phụ thuộc thư viện.

### b. Use Cases (Ca sử dụng - Vòng tương tác)
- Chứa các quy tắc nghiệp vụ dành riêng cho ứng dụng hiện tại (Application Business Rules).
- Nó điều phối luồng dữ liệu (Data flow) đến và đi từ các Entities. Ví dụ: Chức năng "Chuyển tiền từ Tài khoản A sang Tài khoản B", "Đăng ký thành viên mới".
- Không quan tâm dữ liệu đến từ Web HTML hay Mobile App API. Nó chỉ chứa logic thuật toán.

### c. Interface Adapters (Bộ điều hợp giao diện)
- Nằm ở lớp trung gian chịu trách nhiệm làm "Thông dịch viên" chuyển đổi format dữ liệu qua lại giữa Vòng ngoài cùng và Use Cases.
- Biến Web Request HTTP / JSON thành đối tượng mà Use Case hiểu được. Đổi kết quả Use Case thành SQL để nhét xuống DB.
- Các thành phần: **Controllers, Presenters, Gateways**.

### d. Frameworks & Drivers (Khung ứng dụng & Trình điều khiển cơ sở dữ liệu)
- Lớp ngoài cùng, nơi chứa các chi tiết kỹ thuật có thể cắm qua rút lại, đầy tính "Implementation details".
- Đây là nơi Database (PostgreSQL, MongoDB), Web Framework (React, Express, Spring Boot), UI nằm.
- Chỉ chứa những đoạn code khởi tạo và cài đặt nhỏ gọn (Glue code). Không được để thất thoát 1 dòng logic tính toán nào lọt ra ngoài này.

## 3. Lợi ích của Clean Architecture
1. **Độc lập với Database:** Tách biệt DB thành một "Plugin". Bạn có thể mock một array list ở RAM thay cho DB để chạy hoàn chỉnh logic.
2. **Độc lập với Framework:** Framework chỉ là công cụ hỗ trợ ở ngoài cùng, bạn không bị khóa chặt vòng đời dự án vào nó.
3. **Dễ dàng kiểm thử (Highly Testable):** Vì logic nghiệp vụ nằm ở trong cùng, không cần cắm tới Database, Web Server ảo. Ban có thể Unit Test luồng Use Case cực nhanh và chuẩn xác hàng nghìn case trong vài giây.
4. **Độc lập Giao tiếp API UI:** Thay UI Web bằng CLI Console App logic vẫn không gãy.

## 4. Nhược điểm
- **Giao tiếp cồng kềnh (Boilerplate Code):** Quá nhiều Interfaces, DTOs, Mappers để luân chuyển dữ liệu từ lớp ngoài vào lớp trong dù làm công việc 1+1=2.
- **Khó tiếp cận (Steep Learning Curve):** Đòi hỏi mindset hiểu sâu về SOLID, Dependency Inversion (DIP) của các dev cứng.
- Rất lãng phí nếu áp dụng cho một ứng dụng CRUD đơn giản hay project nhỏ chạy tốc độ làm ra sản phẩm (MVP).
