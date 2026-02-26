---
title: Distributed Tracing
description: Handbook thực chiến về distributed tracing cho hệ thống web/microservices: trace/span, context propagation, OpenTelemetry, sampling, instrumentation, correlation logs-metrics-traces, vận hành và bảo mật.
---

# Distributed Tracing trong lập trình web

## 1) Distributed tracing là gì?

**Distributed tracing** là kỹ thuật theo dõi một request/transaction đi qua nhiều thành phần (API gateway → services → DB/cache/queue → third-party) bằng cách gắn **trace context** và thu thập các **span** (đoạn thời gian) để tạo thành một **trace**.

Bạn dùng tracing để trả lời các câu hỏi kiểu:

- Request này chậm ở đâu? (service nào, query nào)
- Lỗi xảy ra ở đâu trong chuỗi gọi?
- Tại sao một số user gặp latency cao (theo cohort/region/version)?
- Ảnh hưởng của một deploy mới lên latency/error như thế nào?

Tracing đặc biệt hữu ích khi:

- Microservices nhiều hop
- Có async messaging (queue/stream)
- Có nhiều dependency (DB, cache, external APIs)

---

## 2) Các khái niệm cốt lõi

### 2.1 Trace

- Một trace đại diện cho “một đơn vị công việc” end-to-end (thường là một HTTP request hoặc một user action).

### 2.2 Span

- Span là một khoảng thời gian đo được, biểu diễn một operation (HTTP call, DB query, xử lý handler...).
- Span có:
  - `trace_id` (chung cho cả trace)
  - `span_id` (riêng)
  - `parent_span_id` (nếu có)
  - `name` (vd: `GET /orders/:id`)
  - `start_time`, `duration`
  - `attributes/tags` (http.method, db.system...)
  - `events` (log-like events trong span)
  - `status` (OK/ERROR)

### 2.3 Context propagation

- “Truyền ngữ cảnh” giữa các service để span nối với nhau.
- Với HTTP thường dùng header (chuẩn W3C Trace Context).

### 2.4 Baggage

- Key/value kèm theo context để downstream đọc.
- Cẩn thận: baggage có thể tăng kích thước header, rủi ro PII, và lan rộng ngoài ý muốn.

### 2.5 Root span & child spans

- Root span thường là entrypoint: inbound request tại edge/service đầu tiên.
- Child spans biểu diễn downstream calls.

---

## 3) Tracing khác gì Logging và Metrics?

- **Logs**: chi tiết theo sự kiện; tốt để debug “tại sao” nhưng dễ nhiều dữ liệu.
- **Metrics**: số liệu tổng hợp theo thời gian; tốt để cảnh báo, xu hướng.
- **Traces**: câu chuyện end-to-end của _một request_; tốt để tìm bottleneck trong distributed path.

Thực chiến: Observability tốt thường là **3 trụ** logs-metrics-traces, có **correlation**:

- Log có `trace_id`/`span_id`
- Metric có exemplars hoặc labels liên kết trace
- Trace có events/attributes để truy vết

---

## 4) Chuẩn hoá: OpenTelemetry (OTel)

**OpenTelemetry** là bộ chuẩn + SDK + collector cho logs/metrics/traces.

Các thành phần chính:

- **Instrumentation**: auto-instrumentation (framework/http/db) + manual instrumentation.
- **OTel SDK**: tạo spans, export.
- **OTel Collector**: nhận telemetry (OTLP), xử lý (batch, sampling, redact), rồi gửi tới backend.
- **Backend**: Jaeger/Tempo/Zipkin/Honeycomb/Datadog/New Relic...

Khuyến nghị:

- Chuẩn hoá qua **OTLP** và collector để giảm vendor lock-in.

---

## 5) Context propagation trong web

### 5.1 W3C Trace Context

Hai header thường thấy:

- `traceparent`: chứa trace-id, parent-id, flags.
- `tracestate`: vendor-specific state.

Thực hành tốt:

- Gateway/edge nhận inbound request:
  - Nếu có `traceparent` hợp lệ: **continue trace**.
  - Nếu không có: **start new trace**.
- Forward headers downstream khi gọi internal services.

### 5.2 Correlation IDs vs Trace IDs

- Correlation ID (vd `X-Request-Id`) là một ID đơn giản để join logs.
- Trace ID là chuẩn cho tracing, có cấu trúc và liên kết spans.

Bạn có thể giữ cả hai:

- `trace_id` cho tracing
- `request_id` cho log search nhanh hoặc legacy systems

### 5.3 Multi-hop và proxy

- Reverse proxy, API gateway, service mesh phải **không làm rơi** trace headers.
- Cẩn thận header allowlist/denylist.

---

## 6) Instrumentation: auto vs manual

### 6.1 Auto-instrumentation

Ưu:

- Nhanh có dữ liệu (HTTP server/client, DB, gRPC...)
  Nhược:
- Tên span không tối ưu, thiếu context business
- Có thể tạo quá nhiều spans (noisy)

### 6.2 Manual instrumentation

Nên dùng manual cho:

- Business operations: `checkout`, `place_order`, `fraud_check`
- Heavy logic cần phân rã
- Gắn attributes có ý nghĩa (không PII)

Nguyên tắc:

- Manual spans bổ sung, không thay thế hoàn toàn auto.

---

## 7) Naming & tagging chuẩn

### 7.1 Naming spans

- HTTP server span: `HTTP {method}` hoặc `GET /orders/:id`
- DB span: `SELECT orders` (tránh include full query với values)
- Queue span: `consume orders.created`

### 7.2 Attributes (tags)

Nên có tối thiểu:

- `service.name`, `service.version`, `deployment.environment`
- `http.method`, `http.route`, `http.status_code`
- `db.system`, `db.name`, `db.operation`
- `net.peer.name` (host) cho outbound

Tránh:

- PII (email, phone, token)
- High-cardinality labels không cần thiết (userId làm tag thường là xấu)

---

## 8) Sampling: kiểm soát chi phí và overhead

### 8.1 Tại sao cần sampling?

- Tracing có thể tốn CPU/memory và chi phí lưu trữ.
- Lưu 100% traces thường không khả thi ở traffic lớn.

### 8.2 Head-based sampling

- Quyết định lấy trace ngay từ đầu (khi bắt đầu root span).
- Dễ triển khai, nhưng có thể bỏ lỡ traces lỗi hiếm.

### 8.3 Tail-based sampling

- Thu thập trước, quyết định sau (dựa vào kết quả: error, latency cao).
- Tốt để giữ traces “quan trọng”, nhưng yêu cầu collector/backend hỗ trợ và tài nguyên nhiều hơn.

### 8.4 Dynamic sampling / priority

Chiến lược thực chiến:

- Giữ 100% traces có lỗi (HTTP 5xx, exceptions)
- Giữ 100% traces vượt ngưỡng latency
- Sample thấp hơn cho traces OK bình thường

### 8.5 Sampling và trace continuity

- Nếu upstream đã sampling decision, downstream nên tôn trọng để giữ trace complete.

---

## 9) Distributed tracing với async messaging (queue/stream)

### 9.1 Vấn đề

Trong async:

- Producer và consumer không cùng request thread.
- Thời gian xử lý có thể trễ (minutes/hours).

### 9.2 Propagation qua message headers

- Đính kèm trace context vào message headers/properties.
- Consumer tạo span kiểu `CONSUMER` và **link** tới producer span.

### 9.3 Span links

- Khi một consumer xử lý batch messages, có thể dùng **links** tới nhiều parent spans thay vì chọn 1 parent.

### 9.4 Idempotency và trace

- Duplicate delivery có thể tạo nhiều traces “tưởng như” khác nhau.
- Gắn `message.id` (không PII) để debug.

---

## 10) Tracing cho DB, cache và external APIs

### 10.1 DB

- Span cho query/transaction.
- Không log raw SQL với values trong attributes.
- Với ORM, cần map span name theo operation/table.

### 10.2 Cache (Redis)

- Span cho get/set/mget.
- Theo dõi cache hit/miss bằng metrics; trace giúp tìm “hot path”.

### 10.3 External APIs

- Track dependency latency, status, retries.
- Gắn attribute: provider name, endpoint group (không include querystring nhạy cảm).

---

## 11) Error handling trong tracing

- Mark span status = ERROR khi exception.
- Ghi event `exception` với stacktrace (cẩn thận dữ liệu nhạy cảm).
- Propagate error context có chọn lọc.

Quan trọng:

- Trace giúp biết lỗi xảy ra ở hop nào, nhưng **đừng dùng trace như log thay thế**.

---

## 12) Correlation với logs & metrics

### 12.1 Log correlation

- Format logs JSON có trường `trace_id`, `span_id`.
- Khi log search thấy lỗi, click qua trace để xem full path.

### 12.2 Metrics exemplars

- Một số hệ thống hỗ trợ gắn exemplar (ví dụ: một trace_id đại diện cho bucket latency).
- Rất hữu ích để “từ dashboard → trace” nhanh.

---

## 13) Bảo mật & quyền riêng tư

### 13.1 Tránh PII

- Không đưa email/phone/token vào attributes/baggage.
- Nếu cần join theo user, cân nhắc:
  - hash/opaque ID
  - chỉ ghi ở log ở mức hạn chế và có retention ngắn

### 13.2 Redaction

- Collector có thể redact headers, query params.
- Allowlist thay vì denylist cho các attributes nhạy cảm.

### 13.3 Multi-tenant

- Gắn `tenant_id` dạng opaque hoặc nhóm (low cardinality) nếu cần; cân nhắc chi phí.
- Tách quyền truy cập traces theo tenant nếu platform hỗ trợ.

---

## 14) Vận hành tracing ở production

### 14.1 Sizing & performance

- Bật batch export.
- Giới hạn số spans tối đa/trace nếu cần.
- Điều chỉnh sampling theo traffic.

### 14.2 Collector topology

- Agent/sidecar trên node/pod hoặc gateway collector.
- Cân bằng giữa latency và độ tin cậy.

### 14.3 Retention

- Traces thường retention ngắn hơn logs.
- Lưu lâu hơn cho traces lỗi/latency cao (nếu có tail sampling).

### 14.4 Deploy correlation

- Luôn gắn `service.version` để so sánh trước/sau deploy.
- Dùng release markers trên dashboard.

---

## 15) Debug playbook (cách dùng tracing để xử lý sự cố)

### 15.1 Latency tăng sau deploy

1. Lọc traces theo `service.version` mới
2. Nhìn breakdown span durations (DB? external API? serialization?)
3. So sánh với version cũ
4. Xác định bottleneck, rollback/feature-flag nếu cần

### 15.2 Error rate tăng

1. Lọc traces có status ERROR
2. Tìm hop đầu tiên báo lỗi
3. Kiểm tra retry storm (nhiều outbound spans lặp)
4. Map tới logs (trace_id) để xem stacktrace

### 15.3 “Một số user bị chậm”

1. Lọc theo region/device (low cardinality)
2. Kiểm tra edge/ingress vs app spans
3. Kiểm tra DNS/third-party theo vùng

---

## 16) Checklist triển khai distributed tracing

### Nền tảng

- [ ] Chuẩn hoá OpenTelemetry (SDK + Collector)
- [ ] Export bằng OTLP
- [ ] Bật auto-instrumentation cho HTTP client/server, DB

### Context propagation

- [ ] Hỗ trợ W3C `traceparent` end-to-end
- [ ] Gateway/proxy không strip headers
- [ ] Propagate qua queue headers (nếu dùng async)

### Sampling & cost

- [ ] Head sampling baseline (ví dụ 1–10%)
- [ ] Tail sampling cho errors/slow traces (nếu có)
- [ ] Giới hạn cardinality tags

### Security/Privacy

- [ ] Redact headers/query params nhạy cảm
- [ ] Không ghi PII vào attributes/baggage
- [ ] Quyền truy cập và retention phù hợp

### Operability

- [ ] Gắn `service.version` + `environment`
- [ ] Dashboard latency breakdown theo route/service
- [ ] Log correlation có `trace_id`

---

## 17) Anti-patterns

- **Không propagate context**: trace bị đứt đoạn, mất giá trị.
- **Tag userId/email làm attribute**: cardinality bùng nổ + rủi ro PII.
- **Gửi trace synchronously** trong request path: tăng latency.
- **Sample tuỳ tiện**: bỏ lỡ errors hiếm hoặc không thể debug.
- **Không gắn service.version**: không đo được tác động deploy.
- **Dùng baggage như “data bus”**: headers phình to, rò rỉ dữ liệu.
