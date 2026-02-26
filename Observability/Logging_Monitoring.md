---
title: Logging & Monitoring
description: Handbook thực chiến về logging và monitoring cho hệ thống web: structured logs, metrics, dashboards, alerting, SLO/SLI, incident response, bảo mật/PII, và best practices vận hành production.
---

# Logging & Monitoring trong lập trình web

## 1) Vì sao logging & monitoring là “bắt buộc” ở production?

Ở production, bạn không thể debug bằng cách:

- mở IDE và đặt breakpoint
- đọc console output trên máy dev

Bạn cần một hệ thống quan sát (observability) để:

- **Phát hiện** sự cố sớm (detect)
- **Chẩn đoán** nhanh (diagnose)
- **Khôi phục** nhanh (restore)
- **Ngăn tái diễn** (prevent)

Logging và monitoring là hai trụ quan trọng:

- Logging: chi tiết theo sự kiện
- Monitoring: số liệu tổng hợp + cảnh báo

Tốt nhất là kết hợp với distributed tracing để “đi từ alert → dashboard → trace → logs”.

---

## 2) Khái niệm cơ bản

### 2.1 Logging

- Ghi lại các sự kiện/hoạt động của hệ thống.
- Dùng để debug chi tiết và audit.

### 2.2 Monitoring

- Thu thập **metrics** (số liệu), hiển thị dashboard, và đặt alert.
- Tập trung vào xu hướng và sức khoẻ hệ thống.

### 2.3 Logs vs Metrics vs Traces

- Logs: “cái gì xảy ra?” (chi tiết)
- Metrics: “có vấn đề không?” (tổng hợp)
- Traces: “request này đi qua đâu, chậm/lỗi ở đâu?”

---

## 3) Logging thực chiến

## 3.1 Nguyên tắc: structured logging

Thay vì log text rời rạc, ưu tiên **JSON logs** có schema ổn định.

Ví dụ trường nên có:

- `timestamp`
- `level` (DEBUG/INFO/WARN/ERROR)
- `message`
- `service` / `service.name`
- `service.version`
- `environment` (dev/staging/prod)
- `request_id` (hoặc correlation id)
- `trace_id`, `span_id` (nếu có tracing)
- `http.method`, `http.route`, `http.status`
- `duration_ms`
- `error.type`, `error.message`, `error.stack` (khi lỗi)

Lợi ích:

- Search và filter dễ
- Dễ tạo dashboard/log-based metrics
- Dễ chuẩn hoá giữa services

---

## 3.2 Log levels và chiến lược sử dụng

- **DEBUG**: dùng để chẩn đoán; thường tắt ở prod hoặc sampling.
- **INFO**: hành vi bình thường (startup, request summaries, business events quan trọng).
- **WARN**: bất thường nhưng hệ thống vẫn hoạt động (retry, fallback, rate limit).
- **ERROR**: lỗi làm request thất bại hoặc hệ thống suy giảm.

Thực hành tốt:

- ERROR phải actionable, có đủ context.
- Tránh “log spam” INFO cho mọi thứ.

---

## 3.3 Request logging

### Logging inbound requests

- Log ở đầu request (optional) và log **summary** ở cuối:
  - route
  - status
  - latency
  - request_id/trace_id
- Tránh log body/headers đầy đủ vì:
  - PII/secret
  - log volume cao

### Logging outbound calls

- Khi gọi downstream (DB, external API): log ngắn gọn hoặc để tracing span là chính.
- Nếu log: include endpoint group + latency + status.

---

## 3.4 Error logging

- Log exception với stack trace (nhưng cân nhắc redaction).
- Normalize fields:
  - `error.code` (nếu có)
  - `error.type`
  - `error.stack`
- Với HTTP errors: log `status` + `route` + `client` (sanitized).

Anti-pattern:

- Log “Something went wrong” không kèm context.

---

## 3.5 PII, secrets và compliance

### Tuyệt đối tránh

- Passwords
- Access tokens / refresh tokens
- API keys
- Session cookies

### PII (email, phone, address)

- Tránh log trực tiếp.
- Nếu cần để debug: dùng masked/hashing + retention ngắn + access control.

### Redaction

- Redact headers như `Authorization`, `Cookie`.
- Redact query params nhạy cảm.
- Prefer allowlist những field được phép log.

---

## 3.6 Log pipeline (thu thập → xử lý → lưu trữ)

Một pipeline phổ biến:

- App ghi logs ra stdout/stderr (container friendly)
- Agent/collector (Fluent Bit/Vector/OTel Collector) thu thập
- Processors:
  - parse JSON
  - add metadata (k8s pod/node)
  - redact
  - drop noisy logs
- Sink: Elasticsearch/OpenSearch, Loki, Splunk, Datadog, Cloud Logging...

### Indexing & retention

- Đặt retention theo nhu cầu (7/14/30/90 ngày...)
- Tách index theo environment/service
- Giới hạn storage cost bằng sampling/drop rules

---

## 3.7 Correlation

Để debug nhanh:

- Mỗi request có `request_id` (hoặc trace_id)
- Tất cả logs trong flow đều có ID này
- Alert/dashboard link trực tiếp tới log query theo ID

---

## 4) Monitoring: metrics và dashboards

## 4.1 Metrics là gì?

Metrics là số liệu theo thời gian, thường gồm:

- Counter (tăng dần): request_count
- Gauge (giá trị hiện tại): memory_usage
- Histogram/Summary: latency distributions

---

## 4.2 Chọn metrics theo framework: RED & USE

### RED (cho services)

- **Rate**: throughput (req/s)
- **Errors**: error rate (5xx, exceptions)
- **Duration**: latency (p50/p95/p99)

### USE (cho resources)

- **Utilization**: CPU, memory, disk
- **Saturation**: queue length, thread pool exhaustion
- **Errors**: I/O errors

Thực hành tốt:

- RED cho mỗi service endpoint quan trọng.
- USE cho hạ tầng (nodes, DB, cache, queue).

---

## 4.3 Golden signals (thực dụng)

- Latency
- Traffic
- Errors
- Saturation

Tập trung đo 4 tín hiệu này cho critical path trước.

---

## 4.4 Dashboards

Dashboard tốt:

- Có mục tiêu rõ: “sức khoẻ API”, “sức khoẻ DB”, “checkout funnel”, “queue lag”.
- Tách theo:
  - environment
  - service
  - route
  - version (deploy)

Gợi ý cấu trúc dashboard service:

- Overview: rate/errors/latency
- Breakdown theo status code
- Latency heatmap/histogram
- Dependency latency (DB/external)
- Resource usage

Anti-pattern:

- Dashboard nhiều biểu đồ nhưng không trả lời câu hỏi nào.

---

## 5) Alerting: cảnh báo đúng cách

## 5.1 Alert vs notification

- Alert: cần phản ứng (actionable).
- Notification: thông tin (deploy xong, batch job done).

## 5.2 Đặt alert dựa trên SLO/SLI

- Tránh alert dựa trên threshold “tuỳ hứng”.
- Ưu tiên alert theo impact user: error rate, latency p95, availability.

## 5.3 Symptom-based vs cause-based

- Symptom-based: user impact (HTTP 5xx tăng, latency tăng).
- Cause-based: nguyên nhân (CPU cao, DB connections cạn).

Thực hành tốt:

- Symptom-based làm “paging alerts”.
- Cause-based làm “triage alerts”.

## 5.4 Alert fatigue

- Giảm false positives.
- Tune thresholds, dùng burn-rate alerts.
- Grouping/dedup để không spam.

---

## 6) SLI/SLO và error budget

### 6.1 SLI

- Chỉ số chất lượng dịch vụ đo được (availability, latency, correctness).

Ví dụ SLI:

- % request trả HTTP 2xx/3xx
- p95 latency < 300ms

### 6.2 SLO

- Mục tiêu cho SLI trong một khoảng thời gian.

Ví dụ SLO:

- 99.9% requests thành công trong 30 ngày

### 6.3 Error budget

- 0.1% còn lại là “ngân sách lỗi”.
- Khi burn error budget nhanh, cần giảm tốc release hoặc tăng reliability work.

---

## 7) Monitoring cho các thành phần phổ biến

### 7.1 API gateway / load balancer

- 4xx/5xx rate
- latency
- request rate
- TLS errors

### 7.2 Databases

- connections
- query latency
- locks/deadlocks
- replication lag
- slow queries

### 7.3 Cache (Redis)

- hit rate
- evictions
- memory usage
- latency

### 7.4 Message queues/streams

- consumer lag
- retry/DLQ rate
- processing time
- backlog depth

### 7.5 Frontend (RUM)

- Web Vitals
- JS errors
- API error rate
- conversion funnel

---

## 8) Incident response: từ alert đến postmortem

### 8.1 Triage nhanh

1. Xác định impact (users/region/routes)
2. So sánh trước/sau deploy (version)
3. Check dependencies (DB/external)
4. Chọn hành động: rollback, feature-flag off, scale, rate limit

### 8.2 Runbooks

- Mỗi alert quan trọng nên có runbook:
  - ý nghĩa alert
  - cách xác minh
  - bước giảm thiểu
  - escalation

### 8.3 Postmortem

- Không đổ lỗi cá nhân.
- Tập trung root cause, detection gaps, action items.

---

## 9) Chi phí và tối ưu

- Logs thường là nguồn chi phí lớn.
- Giảm chi phí bằng:
  - sampling
  - drop noisy logs
  - retention tier (hot/warm/cold)
  - index strategy

Metrics thường rẻ hơn logs, nhưng cardinality cao vẫn gây tốn.

---

## 10) Checklist production-ready

### Logging

- [ ] JSON structured logging
- [ ] Có request_id/trace_id
- [ ] Redact secrets/PII
- [ ] Log levels chuẩn, tránh log spam
- [ ] Retention và access control rõ ràng

### Monitoring

- [ ] RED/USE cho services và resources
- [ ] Dashboards cho critical path
- [ ] Alert dựa trên SLO/burn-rate (nếu có)
- [ ] Runbooks cho paging alerts
- [ ] Release markers theo version

---

## 11) Anti-patterns

- **Log text không cấu trúc**: khó search, khó dashboard.
- **Log PII/secrets**: rủi ro nghiêm trọng.
- **Alert theo CPU 80%** nhưng không có user impact: false positives.
- **Không có correlation ID**: debug chậm.
- **Dashboards để “cho có”**: không giúp incident.
- **Không có runbook**: người on-call bối rối.
