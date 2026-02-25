# Message Queue (Hàng đợi tin nhắn)

## 1. Khái niệm (What is a Message Queue?)
**Message Queue (MQ)** là một hệ thống phần mềm trung gian (Middleware) cho phép các thành phần trong một phần mềm hoặc các dịch vụ độc lập (Microservices) giao tiếp với nhau theo cách **bất đồng bộ (asynchronous)**.

Thay vì Dịch vụ A gọi thẳng (gọi đồng bộ bằng HTTP REST/gRPC) sang Dịch vụ B và phải đứng chờ B làm cho xong rồi mới đi tiếp, Dịch vụ A chỉ cần ném một "Tin nhắn" (Message, chứa dữ liệu hoặc lệnh công việc) vào một cái "Hàng đợi" (Queue) và quay đi làm việc khác. Dịch vụ B rảnh rỗi lúc nào sẽ tự chủ động thò tay vào Hàng đợi để lấy tin nhắn ra xử lý.

## 2. Các thành phần chính của Message Queue
Một hệ thống MQ tiêu chuẩn thường có dạng: `Producer -> Broker (Queue) -> Consumer`
- **Producer (Người gửi):** Ứng dụng/dịch vụ tạo ra dữ liệu/Message và đẩy (publish/send) vào Message Queue Broker.
- **Message (Tin nhắn):** Gói dữ liệu nhỏ chứa nội dung cần truyền tải. Thường định dạng JSON. Cần nhỏ và gọn.
- **Queue / Topic (Hàng đợi lưu trữ):** Nơi chứa các Message theo thứ tự FIFO (First In First Out - Vào trước ra trước).
- **Broker (Máy chủ hàng đợi):** Hệ thống lớn làm nhiệm vụ duy trì Queue, đảm bảo không mất tin nhắn, phân phối tin nhắn đến đúng người nhận (như RabbitMQ, Kafka Server).
- **Consumer (Người nhận xử lý):** Các Ứng dụng/Worker liên tục lắng nghe hàng đợi để bốc Message ra và thực hiện logic xử lý mệt mỏi nặng nề.

## 3. Tại sao lại cần Message Queue? (Lợi ích thiết thực)

### a. Decoupling (Giảm sự phụ thuộc / Tách rời hệ thống)
Nếu Dịch vụ Đặt Hàng (Order) gọi HTTP đồng bộ sang Dịch vụ Gửi Email (Gửi mail hóa đơn), lỡ như Email Service bị sập, Dịch vụ Đặt Hàng cũng sẽ bị treo hoặc báo lỗi theo khiến khách hàng không thể mua đồ.
-> Dùng MQ: Order Service chỉ việc ném cục dữ liệu "Cần gửi Mail cho anh Nguyễn Văn A" vào Queue. App Email bị sập thì việc vẫn lơ lửng trong Queue không mất tích. Hệ thống Đặt Hàng vẫn báo về khách hàng "Bạn đã mua xong" cực nhanh. Vài tiếng sau App Email khởi động lại, bốc file từ Queue ra gửi bù khách. Không ai phụ thuộc sống chết vào ai.

### b. Asynchronous Processing (Xử lý bất đồng bộ)
Hệ thống không cần bắt User chờ đợi những tác vụ quá nặng.
Ví dụ: User bấm nút "Xuất báo cáo PDF giao dịch 10 năm". Nếu gọi API thường, họ đợi 3 phút xoay đều web, chắc chắn sẽ timeout lỗi. 
Thay vào đó báo User "Hệ thống đang xử lý, vui lòng chờ email hoặc quay lại sau", và quăng lệnh vào MQ. Một Worker chạy ngầm (Background Worker) rảnh rang trên một server khác sẽ từ từ cày khối việc khổng lồ đó.

### c. Load Leveling & Buffering (Cân bằng tải & Bộ đệm hoãn xung) 
Giả sử Black Friday, 100,000 khách đặt hàng cùng lúc trong 1 phút. Dịch vụ Database chốt đơn ở dưới chỉ đủ sức chạy 1,000 đơn/phút. Nếu cho luồng đâm thẳng, DB sẽ sập lập tức.
Giải pháp: Đổ toàn bộ 100k đơn vào Message Queue (Nhiệm vụ của MQ là nhận tin rất nhanh và không tính toán gì). Xong sau đó Database sẽ vào MQ tự bốc mỗi phút 1.000 đơn ra cày dần. Mất 100 phút xử lý xong nhưng không bao giờ bị nghẽn hay sập máy chủ.

## 4. Các mô hình hoạt động (Patterns)
- **Point-to-Point (Queue):** 1 Message gửi đi chỉ có duy nhất 1 Consumer bốc được và xử lý. Người khác không bốc lại được nữa (Ví dụ: RabbitMQ, ActiveMQ).
- **Publish / Subscribe (Topic/PubSub):** 1 Tiếng hô gửi đi (Publish vào Topic), có thể có nhiều dịch vụ khác nhau cùng đăng ký lắng nghe (Subscribe) và đều nhận được bản sao của tin nhắn đó (Ví dụ Apache Kafka, Redis PubSub).

## 5. Khi nào KHÔNG nên dùng Message Queue?
- Các yêu cầu cần thiết người dùng lấy kết quả theo thời gian thực (Real-time/Sync) ngay lập tức (Ví dụ gọi API Check mật khẩu đăng nhập).
- Dự án nhỏ (Monolithic app) tự nhiên tống thêm RabbitMQ/Kafka vào làm tăng chi phí quản lý vận hành (DevOps cost), code phức tạp lên và khó trace Bug.

## 6. Các Engine Message Queue phổ biến
- **RabbitMQ:** Rất phổ biến, chuẩn giao thức thư tín AMQP lớn, đa năng. Mô hình Pub/Sub linh hoạt cực mạnh qua cơ chế Routing Key & Exchanges.
- **Apache Kafka:** Vua của Streaming Logs lượng siêu khổng lồ hàng triệu messages. Lưu dữ liệu cứng xuống ổ đĩa siêu nhanh, người tới sau vẫn đọc lại được (Khác với RabbitMQ đọc cái là mất luôn). Hay dùng thiết kế Event-driven architecture hoặc Big Data cho các công ty tỷ đô.
- **Redis Pub/Sub & Redis Streams:** Cực kỳ lightweight, có sẵn nếu anh em đang dùng Redis Cache, làm PubSub chat real-time tốt nhưng độ tin cậy mất mát data dĩ nhiên không bằng mấy thằng sinh ra chuyên làm MQ.
- **Cloud (AWS SQS, SNS / GCP PubSub):** Giải pháp trả tiền xài liền, không cần lo tự setup host server rắc rối. Cân mọi thể loại scaling.
