# Microservices Architecture (Kiến trúc vi dịch vụ)

## 1. Khái niệm (What are Microservices?)
**Microservices Architecture** là một mô hình kiến trúc phát triển ứng dụng, trong đó một ứng dụng khổng lồ nguyên khối (Monolith) được chặt nhỏ ra thành một tập hợp hàng chục, hàng trăm các **Dịch vụ siêu nhỏ (Micro-services)** hoạt động độc lập với nhau. 

Mỗi dịch vụ sẽ là một vòng đời tồn tại độc lập trọn vẹn (Tự sở hữu Database riêng, tự định nghĩa logic, tự deploy Server riêng ảo) và chúng giao tiếp với nhau qua các kênh giao thức nhẹ nhàng như API RESTful HTTP/gRPC (gọi đồng bộ) hoặc Message Brokers (AMQP, Kafka) để xử lý dữ liệu bất đồng bộ.

## 2. So sánh: Monolithic (Nguyên khối) vs Microservices

### Monolithic (Kiến trúc nguyên khối truyền thống)
- Toàn bộ source code (UI, Auth, Order, Payment, Email...) nhét chung vào một nồi, compile ra 1 file `.war` hoặc `.exe` / Bundle node server khổng lồ, chạy trên chung 1 con chủ Database lớn.
- **Ưu điểm:** Dễ bắt đầu, code nhanh, dễ test Local, dễ deploy thời kỳ đầu. 
- **Nhược điểm nặng:** Khi dự án phình to tới tay 200 Dev cùng code. Nhấn nút Build tốn 1 tiếng. Đoạn code báo cáo lặp vô tận (Infinite loop) làm sập CPU => TOÀN BỘ ỨNG DỤNG NGỦM THEO.

### Microservices
- Tách `Order Service`, `User Service`, `Email Service` ra 3 nhánh Github riêng. Xài 3 công nghệ khác nhau (User xài Nodejs+Mongo, Order xài Java+MySQL).
- Code sửa User Service chỉ cần 1 cú click chuột Deploy chớp nhoáng (nhờ Docker) cập nhật mảng chức năng User trên Production, không dính dáng gì tới chức năng Order hay Auth của hệ thống.

## 3. Ưu điểm Cốt tử của Microservices
1. **Khả năng Scale cục bộ cực mạnh mẽ (Independent Scaling):** Đêm giao thừa mảng Đặt Hàng bùng nổ traffic. Quản trị hệ thống chỉ cần nhân bản riêng con Server `Order Service` lên ngang 50 con (Auto-scaling). Các Service rảnh rỗi như `Notification`, `UserProfile` giữ nguyên chạy 1 con. Rất tiết kiệm bộ nhớ, tối ưu phần cứng đám mây (Cloud computing cost).
2. **Khả năng Lỗi cách ly (Fault Isolation):** Nếu con Service Email bị sập do vỡ bộ đệm. Chỉ có chức năng gửi Email hỏng, nhưng khách vẫn vào web lướt mua hàng chốt đơn thanh toán bình thường.
3. **Tính Agility (Linh hoạt trong tổ chức Nhóm):** Chia doanh nghiệp thành các đội "Hai chiếc bánh Pizza" (Two-pizza teams kiểu Amazon). Mỗi team thầu một Microservice, tự dùng ngôn ngữ riêng, tự code tự deploy theo tốc độ Agile mình muốn không chờ ai.

## 4. Đặc điểm xương sống của Microservices chuẩn hệ sinh thái
- **Decentralized Data Management (Quản lý dữ liệu phân tán):** Microservices đích thực thì Dịch vụ A ĐƯỢC CHỨA CSDL CỦA RIÊNG NÓ và cấm Dịch vụ B chọc tay vào Data của mình cướp trực tiếp (Database per Service). Muốn lấy data? Xin thông qua API đi nha.
- **Design for Failure (Thiết kế phòng thân chấp nhận rủi ro):** Vì network luôn dễ đoản mạch. Cần nhúng các Pattern kháng lỗi như Circuit Breaker (Cầu dao điện), Timout, Fallback.

## 5. Cơn ác mộng của Microservices (Đánh đổi)
- **Quản lý Vận hành hạ tầng quá khủng hoảng (DevOps Complexity):** Bạn phải dùng Kubernetes (K8S) để quản trị container của 50 bé Services. Giám sát Monitoring Logs vỡ đầu vì không biết lỗi phát sinh từ con Service số mấy (Cần tới Distributed Tracing - Jaeger / Zipkin).
- **Thách thức Data Consistency:** 1 Giao dịch mua hàng chạm vào 4 con Services ở 4 kho DB khác nhau. Nếu Service thứ 4 lỗi tiền, rất cực khổ để bắt 3 Service kia xì lại data ngược lại để rollback (Thiết kế luồng SAGA Pattern, 2-Phases Commit (2PC) rắc rối nghẹt thở).
- **Độ trễ Mạng (Network Latency):** Thay vì các Method gọi nhau trong 1 bộ nhớ RAM mất 1 miligiây. Nay hàm gọi nhau sẽ bị biến thành Request bắn chéo qua LAN TCP/IP, làm độ trễ ứng dụng bị cộng dồn cấp số nhân (Giải pháp nhúng gRPC để tăng tốc truyền tải binary).
