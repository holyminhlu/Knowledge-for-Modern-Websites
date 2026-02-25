# API Rate Limiting (Giới hạn tỷ lệ API)

## 1. Khái niệm (What is Rate Limiting?)
**Rate Limiting (Giới hạn tỷ lệ)** là một kỹ thuật kiểm soát lưu lượng mạng để điều tiết số lượng yêu cầu (requests) mà một khách hàng (client) - có thể là một user, một IP, hoặc một ứng dụng cụ thể - được phép gửi tới máy chủ (server) hoặc một API API endpoint trong một khoảng thời gian nhất định (ví dụ: 100 requests/phút).

Khi client vượt quá số lượng request cho phép, Server sẽ từ chối xử lý và thường trả về HTTP Status Code **429 (Too Many Requests)**.

## 2. Tại sao lại cần Rate Limiting? (Why do we need it?)
Rate Limiting không chỉ là tính năng "Nice-to-have" mà là lớp khiên bảo vệ sống còn của mọi hệ thống Backend:

- **Chống tấn công từ chối dịch vụ (DDoS & DoS):** Ngăn chặn hacker sử dụng botnet gửi hàng triệu request rác mỗi giây làm kiệt quệ tài nguyên CPU, RAM, Database của Server khiến hệ thống sập và người dùng thật không thể truy cập được.
- **Chống tấn công Brute-Force (Dò mật khẩu / OTP):** Nếu màn hình đăng nhập không có giới hạn, hacker có thể chạy tool thử hàng tỷ mật khẩu hoặc mã OTP trong thời gian ngắn cho đến khi đúng. Kể cả với reCAPTCHA, giới hạn số lần thử (Ví dụ: Khóa tài khoản / Block IP sau 5 lần sai trong 1 phút) là bắt buộc.
- **Ngăn chặn chi phí hạ tầng bùng nổ (Cost Control):** Các dịch vụ đám mây (AWS, Google Cloud) hoặc Third-party API (OpenAI, Stripe) thường tính tiền theo số lượng request hoặc băng thông (Pay-as-you-go). Nếu không Rate limit, một bug lặp vô hạn (Infinite loop) trên code Frontend của ai đó có thể đốt hàng nghìn đô la của bạn sau một đêm.
- **Đảm bảo tính công bằng (Fairness & SLA):** Không để một user hoặc một tenant (khách hàng doanh nghiệp) sử dụng tham lam chiếm đoạt hết năng lực tính toán của toàn hệ thống, làm chậm phần mềm của tập người dùng khác đang chung máy chủ.
- **Mô hình kinh doanh API (Monetization):** Chia gói cước API (Free Tier: 100 req/ngày, Pro Tier: 10.000 req/ngày). Khách dùng hết thì văng lỗi `429` ép mua gói cao hơn.

## 3. Rate Limit thường được đặt ở đâu?
1. **Application Layer (Trong Code Backend):** Cài đặt qua Middleware (ví dụ dùng thư viện `express-rate-limit` trong Node.js, `Throttle` của Laravel). Thích hợp để khóa rate limit dựa vào thông tin nghiệp vụ như User-ID, Session-ID sau khi người dùng đã có Token. Dễ code nhưng gây một chút tải phụ vì Request vẫn phải chui vào tới tầng Application chạy logic.
2. **API Gateway / Reverse Proxy (Nginx, Kong, HAProxy, AWS API Gateway):** Nơi tốt nhất để chặn các Request chưa cần phân tích sâu (như chặn IP, chặn Path). Block thẳng từ ngoài cổng mạng bảo vệ toàn vẹn App Server phía sau. Thường dựa trên IP, Headers, hoặc API Keys.
3. **WAF & Cloud (Cloudflare, AWS WAF):** Bảo vệ toàn cục hạ tầng, chặn các dải IP xấu, chặn DDoS ở cấp độ Routing trên toàn cầu trước khi chúng kịp tới lãnh thổ Data Center của bạn.

## 4. Các thuật toán Rate Limiting phổ biến (Algorithms)

### a. Token Bucket (Xô Token - Rất phổ biến, AWS & Stripe dùng)
- **Cơ chế:** Tưởng tượng một cái xô có sức chứa tối đa là `N` tokens (Ví dụ: 100 cái). Cứ mỗi `1/r` giây, hệ thống sẽ tự động nhỏ thêm 1 token vào xô (Ví dụ: nạp 10 token/giây) cho đến khi xô đầy thì không nạp nữa.
- Khi có 1 Request đến, nó sẽ bốc 1 token ra khỏi xô và đi tiếp. Nếu xô rỗng không còn token nào, Request đó bị từ chối (429).
- **Ưu điểm:** Cho phép lưu lượng truy cập bùng nổ đột ngột (Burst traffic) cực mượt. Nếu bạn tích đủ 100 token, bạn có thể bắn liền lúc 100 request trong 1 mili-giây mà API vẫn chấp nhận.
- **Lưu trữ thường dùng:** Redis.

### b. Leaky Bucket (Xô rò rỉ - Nginx dùng mặc định)
- **Cơ chế:** Gần giống Token Bucket nhưng ngược lại. Tưởng tượng một cái xô thủng đáy, nước (Request) nhỏ giọt trôi xuống (Được xử lý) ở một **Tốc độ cố định** không đổi (Ví dụ: 10 request/giây).
- Khi có lượng lớn Request đổ ập vào xô từ phía trên. Nếu tốc độ đổ vào lớn hơn tốc độ thủng, những Request nào tràn qua miệng xô (vượt dung lượng hàng đợi) sẽ bị loại bỏ (429).
- **Ưu điểm:** Dễ dàng san phẳng traffic (Traffic Shaping), kiểm soát nhịp điệu của Server cực kỳ ổn định, không bảo giờ có chuyện server phải xử lý bùng nổ quá tải. Chấp nhận hi sinh các thay đổi đột biến của Client.

### c. Fixed Window Counters (Cửa sổ cố định thời gian)
- **Cơ chế:** Chia timeline dòng thời gian thành các khung cửa sổ cứng nhắc tĩnh tại (Ví dụ: [00:00 -> 00:01], [00:01 -> 00:02]). Mỗi cửa sổ cấp hạn ngạch `N` request. Có Request thì `Counter++`. Qua phút mới Reset lại về 0.
- **Nhược điểm (Edge-case):** Rất dễ lỗi ở ranh giới giao thoa phút. (Ví dụ: Mốc 00:00:59, bạn xả 100 req. Sang mốc 00:01:00, counter reset về 0, bạn bắn bồi thêm 100 req. Vậy trong vỏn vẹn 2 giây đó Server đã lỡ cõng 200 request, gấp đôi tải mức cấu hình giới hạn là 100/phút). Ít được dùng ở production lớn.

### d. Sliding Window Log (Nhật ký Cửa sổ trượt)
- **Cơ chế:** Khắc phục Fixed Window. Thay vì đếm Counter nguyên cục, nó lưu thời gian (Timestamp) cụ thể của từng Request một vào mảng danh sách/Sorted Set sinh ra theo IP đó trong Redis. Khi nhận Request mới lúc thời điểm `T`, hệ thống vào mảng xóa bay màu các Timestamp cũ hơn `T - 1 phút`, sau đó đếm số Timestamp còn lại xem có vượt quá giới hạn chưa.
- **Ưu điểm:** Cực kỳ chính xác không bị lọt Burst Traffic qua kẽ hở thời gian.
- **Nhược điểm:** Tốn quá nhiều dung lượng RAM lưu trữ dữ liệu rác (Mảng bộ nhớ Timestamp lớn) dẫn đến đắt đỏ nếu chạy lưu lượng khổng lồ, tính toán nặng.

### e. Sliding Window Counter (Bộ đếm Cửa sổ trượt - Được coi là tối ưu nhất)
- **Cơ chế:** Giải pháp cân bằng hoàn hảo lai tạo từ 2 cái trên. Nó chỉ lưu Counter của Fixed Window hiện tại và Fixed Window liền kề trước đó. Nó dùng trọng số dự đoán dựa trên tỷ lệ % thời gian trôi qua của Window hiện hành để kéo dãn ngưỡng giới hạn mượt mà dần đều.
- **Ưu điểm:** Đủ độ chính xác cực cao, vừa cực kỳ ít tốn RAM / CPU tính toán (chỉ cần lấy 2 con số làm toán cộng trừ nhân). Thường được hệ thống lớn như Cloudflare áp dụng.

## 5. Cấu trúc Response của một API bị Rate Limit (Best Practices)
Khi giới hạn rate limit bắt đầu hoạt động, một API chuẩn RESTful Backend "Lịch sự" không chỉ thẳng tay báo mã lỗi `429` cộc lốc mà phải gửi kèm theo các **HTTP Headers định dạng RateLimit** để báo cho phía Client Frontend biết chính xác khi nào nó được mở khóa, còn bao nhiêu lượt. 

Các Headers thông dụng thường bao gồm:
- `X-RateLimit-Limit`: Tổng số lượt requests tối đa được phép gọi trên một khung thời gian.
- `X-RateLimit-Remaining`: Số lượng lượt requests hệ thống còn ghi nhận cho phép bạn gửi tiếp trong khung thời gian hiện tại.
- `X-RateLimit-Reset`: Thời gian (Tính bằng Unix Epoch Time) ghi rõ khoảnh khắc cửa sổ Window sẽ được reset lại cho bạn `Remaining = Limit`. (Có loại lại dùng `Retry-After: 30` ý bảo 30 giây nữa hãy gọi lại).

=> Dựa vào những tín hiệu này, anh thiết kế UI/UX trên Frontend có thể làm trạng thái hiển thị "Đang xử lý chậm lại" thay vì để App văng Error chớp nhoáng khó hiểu khiến người dùng ức chế.
