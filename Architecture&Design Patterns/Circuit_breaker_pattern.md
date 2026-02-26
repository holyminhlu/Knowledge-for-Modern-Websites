---
title: Circuit Breaker Pattern trong lập trình web
description: Handbook production-ready về Circuit Breaker: mục tiêu, state machine, ngưỡng lỗi, half-open probing, phối hợp timeout/retry/bulkhead, observability, và triển khai tại client/app/gateway/service mesh.
---

# Circuit Breaker Pattern trong lập trình web

## 0) Circuit Breaker là gì?

**Circuit Breaker (CB)** là một pattern “ngắt mạch” để bảo vệ hệ thống khi gọi tới dependency (HTTP/gRPC/DB/queue/third-party) đang **lỗi** hoặc **chậm**. Thay vì tiếp tục gửi request và làm hệ thống bị kéo sập dây chuyền, CB sẽ **chặn sớm** (fail fast) một phần request trong một thời gian, cho dependency có cơ hội hồi phục và cho hệ thống “giữ thở”.

Circuit Breaker thường đi cùng các pattern liên quan:

- **Timeout** (bắt buộc)
- **Retry** (có kiểm soát)
- **Bulkhead** (cách ly tài nguyên)
- **Fallback** (trả dữ liệu thay thế/degraded)
- **Rate limiting** (giảm áp lực)

---

## 1) Tại sao cần Circuit Breaker?

Trong production, lỗi thường không “chết hẳn” mà là:

- latency tăng (p95/p99 tăng mạnh)
- timeouts lẻ tẻ
- 5xx spike theo đợt
- rate limit từ third-party

Nếu bạn tiếp tục gọi dependency trong tình trạng đó:

- thread/worker bị giữ lâu → **cạn tài nguyên**
- queue backlog tăng → **độ trễ lan truyền**
- retry bừa → **retry storm**
- sập dây chuyền (cascading failure)

Circuit breaker giúp:

- **fail fast** để bảo vệ tài nguyên
- **ổn định** toàn hệ thống
- **giảm blast radius**
- cung cấp tín hiệu observability rõ ràng (circuit open)

---

## 2) State machine: Closed / Open / Half-Open

Circuit breaker thường có 3 trạng thái:

### 2.1 Closed

- Trạng thái bình thường: request được phép đi qua.
- CB đo lường lỗi/latency để quyết định khi nào “mở mạch”.

### 2.2 Open

- CB **chặn** request (không gọi upstream) và trả lỗi ngay (hoặc fallback).
- Thường có **sleep window**: sau một khoảng thời gian mới thử lại.

### 2.3 Half-Open

- Cho phép một số request “probe” đi qua để kiểm tra upstream đã hồi phục chưa.
- Nếu probe thành công đủ, CB chuyển về Closed; nếu fail, quay lại Open.

---

## 3) CB quyết định mở mạch dựa trên cái gì?

### 3.1 Error rate threshold

- Ví dụ: > 50% request fail trong cửa sổ N request gần nhất.
- Fail bao gồm: 5xx, timeouts, network errors.

### 3.2 Slow call rate / latency threshold

- Ví dụ: nếu > 60% request vượt 1s thì coi là “slow call” và tính như tín hiệu mở mạch.
- Quan trọng vì hệ thống “chậm” cũng nguy hiểm như “lỗi”.

### 3.3 Minimum request volume

- Chỉ đánh giá khi đủ sample (vd. tối thiểu 20 request) để tránh nhiễu.

### 3.4 Sliding window

- Count-based (N request gần nhất) hoặc time-based (M giây).

---

## 4) Timeout là nền tảng (không có timeout thì CB vô nghĩa)

Nếu không có timeout, request treo mãi → không có “fail signal” đúng lúc, tài nguyên bị giữ, CB không cứu được.

Nguyên tắc:

- Timeout của client→gateway nên **lớn hơn** timeout gateway→service
- Timeout service→dependency nên **nhỏ hơn** timeout phía trên
- Có “budget” tổng theo chain

---

## 5) Retry và Circuit Breaker: dùng đúng để tránh retry storm

### 5.1 Chỉ retry khi phù hợp

- Lỗi transient: network reset, 502/503/504 (tuỳ hệ thống), timeout ngắn.
- Request **idempotent** (GET, hoặc POST có idempotency key).

### 5.2 Retry policy an toàn

- Exponential backoff + jitter.
- Giới hạn số lần retry (thường 1–2 lần là đủ).
- Không retry khi circuit đã open.

### 5.3 Phối hợp với CB

- Retry tăng số lần gọi → làm CB “nhìn thấy” nhiều failure hơn.
- Thường đặt **CB bao ngoài** retry (tuỳ thư viện) và cấu hình để retry không che khuất thất bại.

---

## 6) Fallback: không phải lúc nào cũng nên

Fallback là trả về response “giảm chất lượng” thay vì lỗi hẳn.

Ví dụ fallback hợp lý:

- Trả dữ liệu cached/stale (giá trị cũ)
- Trả empty list cho phần “recommendations”
- Trả message “tạm thời không khả dụng” cho tính năng phụ

Fallback nguy hiểm khi:

- Làm user hiểu sai (vd. số dư tài khoản)
- Che giấu lỗi, làm khó phát hiện sự cố
- Tạo inconsistency không kiểm soát

Nguyên tắc:

- Fallback phải **được thiết kế** (không phải “trả đại”).
- Feature quan trọng (payment, auth) thường **fail explicit** thay vì fallback mơ hồ.

---

## 7) Bulkhead: cách ly tài nguyên để CB hiệu quả hơn

Circuit breaker giảm số request tới upstream, nhưng nếu một dependency chậm vẫn có thể làm cạn thread pool.

**Bulkhead** (vách ngăn) tách resource:

- thread pool riêng cho từng dependency
- connection pool riêng
- queue riêng

Mục tiêu: một dependency hỏng không kéo theo toàn bộ hệ thống.

---

## 8) Nên đặt Circuit Breaker ở đâu?

### 8.1 Ở client/app (khuyến nghị phổ biến)

- Service A gọi service B: A có CB khi gọi B.
- Ưu: quyết định theo ngữ cảnh, dễ gắn fallback phù hợp.

### 8.2 Ở API Gateway

- Hữu ích để bảo vệ upstream và bảo vệ gateway.
- Nhưng gateway thường chỉ làm fallback “chung chung”.

### 8.3 Ở service mesh

- Mesh có thể cung cấp timeout/retry/outlier detection/circuit-like behavior.
- Cần thống nhất trách nhiệm giữa app và mesh để tránh “double retries”.

Nguyên tắc thực dụng:

- Có thể dùng cả gateway/mesh để chặn sớm ở mức mạng, nhưng **logic fallback** tốt nhất ở app.

---

## 9) Tham số cấu hình quan trọng (gợi ý thực dụng)

Không có “con số chuẩn” cho mọi hệ thống, nhưng các tham số bạn sẽ gặp:

- **Timeout**: theo SLO/latency budget của endpoint.
- **Failure rate threshold**: vd. 50%.
- **Slow call threshold**: vd. 1s; **slow call rate**: vd. 60%.
- **Sliding window**: vd. 100 requests hoặc 10s.
- **Minimum calls**: vd. 20.
- **Open state duration** (sleep window): vd. 10–30s.
- **Half-open permitted calls**: vd. 5–20 probe requests.

Lời khuyên:

- Bắt đầu bảo thủ (ít aggressive), đo metrics, rồi tinh chỉnh.
- Với third-party có rate limit: CB + rate limit + caching thường đi cùng.

---

## 10) Observability cho Circuit Breaker

Bạn cần nhìn thấy rõ:

- circuit state transitions (closed→open→half-open)
- số request bị short-circuit
- error rate/timeout rate của upstream
- latency histogram theo route/dependency

### 10.1 Metrics nên có

- `circuit_state` (gauge)
- `short_circuited_total`
- `calls_total{result=success|failure|timeout|rejected}`
- `latency_ms_bucket` theo dependency

### 10.2 Logs/Events

- Log mỗi lần state change (kèm nguyên nhân, threshold, window)
- Sampling log để tránh spam khi open

### 10.3 Tracing

- Tag span khi request bị short-circuit (`error=true`, `cb_state=open`)
- Link tới upstream spans nếu có

---

## 11) Testing và chaos/resilience validation

### 11.1 Unit/integration

- Test state transitions với các chuỗi lỗi giả lập.
- Test idempotency + retry policy.

### 11.2 Load test

- Đảm bảo khi upstream chậm, hệ thống vẫn giữ được throughput cho các endpoint khác.

### 11.3 Chaos testing (thực dụng)

- Inject latency (p95→p99 tăng)
- Inject 5xx/timeouts
- Verify circuit opens, alert fires, và hệ thống không sập dây chuyền

---

## 12) Anti-patterns phổ biến

- **Không đặt timeout** nhưng lại bật retry/CB.
- **Retry quá nhiều** + nhiều lớp retry (client + gateway + mesh).
- **CB cấu hình quá nhạy** → flapping (đóng/mở liên tục).
- **CB quá “lì”** → không mở khi upstream đang chết.
- **Fallback sai ngữ cảnh** làm sai dữ liệu (đặc biệt tài chính).
- **Che giấu lỗi**: fallback im lặng, không alert.
- **Chia sẻ chung pool tài nguyên** cho mọi dependency (thiếu bulkhead).

---

## 13) Checklist triển khai Circuit Breaker production-ready

### Thiết kế

- [ ] Xác định dependency nào cần CB (third-party, service critical, DB…)
- [ ] Định nghĩa timeout/latency budget theo endpoint
- [ ] Quyết định fallback (nếu có) và chấp nhận trade-off

### Cấu hình

- [ ] Timeout rõ ràng, không treo
- [ ] Thresholds có minimum volume + sliding window
- [ ] Half-open probing có giới hạn
- [ ] Retry có backoff+jitter, giới hạn lần retry

### Vận hành

- [ ] Metrics + alert cho circuit open, short-circuit rate
- [ ] Dashboard error/timeout/latency theo dependency
- [ ] Runbook khi circuit mở kéo dài (upstream down?)
