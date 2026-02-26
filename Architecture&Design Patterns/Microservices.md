---
title: Microservices trong lập trình web
description: Handbook production-ready về kiến trúc Microservices: khi nào nên dùng, cách chia service theo domain, data ownership, giao tiếp sync/async, API Gateway, observability, resilience, CI/CD, bảo mật, testing và chiến lược migrate từ monolith.
---

# Microservices trong lập trình web

## 0) Microservices là gì?

**Microservices** là phong cách kiến trúc trong đó một hệ thống được chia thành nhiều **dịch vụ nhỏ**, mỗi dịch vụ:

- tập trung vào một **business capability** cụ thể
- có thể **triển khai độc lập**
- sở hữu **data và vòng đời** của riêng nó
- giao tiếp qua network (HTTP/gRPC, messaging)

Microservices không chỉ là “chia nhỏ codebase” mà là **chia nhỏ hệ thống vận hành**: deploy, scaling, monitoring, incident response… cũng bị chia nhỏ.

---

## 1) Khi nào nên/không nên dùng microservices?

### 1.1 Nên cân nhắc microservices khi

- Hệ thống đã đủ lớn: nhiều module, nhiều team, release cadence khác nhau.
- Có nhu cầu **deploy độc lập** từng phần để tăng tốc delivery.
- Có nhu cầu **scale không đồng đều** (một phần traffic cao, phần khác thấp).
- Domain phức tạp, cần tách ownership rõ (bounded contexts).
- Tổ chức đã có năng lực DevOps/observability đủ tốt.

### 1.2 Không nên (hoặc trì hoãn) khi

- Team nhỏ, product còn biến động mạnh, cần tốc độ feature nhanh hơn vận hành.
- Chưa có CI/CD, monitoring, logging, on-call… (microservices sẽ “đốt” bạn).
- Domain chưa rõ ràng: chia service sớm thường dẫn tới coupling và “distributed monolith”.

Quy tắc thực dụng:

- Bắt đầu bằng **modular monolith** rồi tách dần (strangler) thường an toàn hơn.

---

## 2) Lợi ích và trade-offs

### 2.1 Lợi ích

- Deploy độc lập → giảm coordination bottleneck.
- Scaling theo nhu cầu từng service.
- Fault isolation tốt hơn (nếu thiết kế đúng).
- Công nghệ đa dạng (polyglot) nếu thực sự cần.

### 2.2 Chi phí/nhược điểm

- Độ phức tạp vận hành tăng mạnh: network, latency, retries, versioning.
- Data consistency khó hơn (không còn “một DB join cho tất cả”).
- Testing end-to-end khó hơn.
- Debug khó hơn nếu thiếu tracing/log correlation.
- Chi phí hạ tầng tăng.

---

## 3) Nguyên tắc chia service (decomposition)

### 3.1 Chia theo business capability (khuyến nghị)

- Catalog, Ordering, Payment, Identity, Notification…
- Mỗi service có **owner team** rõ.

### 3.2 DDD và bounded context

- Dùng **bounded context** để tránh “một model dùng chung cho tất cả”.
- Các service có thể có khái niệm giống nhau nhưng ý nghĩa khác (vd. “User” trong Billing khác “User” trong Identity).

### 3.3 Tránh chia theo tầng kỹ thuật

Anti-pattern:

- “user-service chỉ làm CRUD user” và “auth-service chỉ làm auth” nhưng dữ liệu/logic lẫn nhau.
- chia theo “controller/service/repo” thành các service — dẫn tới coupling.

### 3.4 Size của service

“Micro” không có nghĩa là nhỏ nhất có thể. Service nên:

- đủ nhỏ để deploy/hiểu được
- đủ lớn để tránh chatty calls và overhead

---

## 4) Data ownership: mỗi service sở hữu dữ liệu của mình

### 4.1 Database-per-service (thường là mục tiêu)

- Mỗi service có DB/schema riêng.
- Không truy cập DB của service khác.

Lợi ích:

- autonomy, tránh coupling schema

Trade-off:

- không thể join cross-service → cần patterns khác

### 4.2 Chia sẻ DB có được không?

Có thể là bước chuyển tiếp, nhưng phải coi là **nợ kỹ thuật** vì:

- schema coupling, deploy không độc lập
- khó ownership và migration

### 4.3 Consistency & transactions

- Tránh distributed transactions (2PC) nếu có thể.
- Dùng:
  - **Saga pattern** (orchestration/choreography)
  - **Outbox pattern**
  - **Idempotency**
  - **Compensating actions**

---

## 5) Giao tiếp giữa services

### 5.1 Synchronous (HTTP/gRPC)

Ưu:

- đơn giản, request/response

Nhược:

- latency chain
- dễ cascading failure

Best practices:

- timeouts bắt buộc
- retries có kiểm soát + idempotency
- circuit breaker + bulkhead

### 5.2 Asynchronous (message broker/event bus)

Ưu:

- giảm coupling thời gian (temporal decoupling)
- tăng resilience

Nhược:

- eventual consistency
- debug khó nếu không có tracing/message ids

Best practices:

- hợp đồng message rõ (schema registry nếu có)
- consumer idempotent
- dead-letter queue + retry policy

### 5.3 API contracts & versioning

- Hợp đồng API phải versioned và backward compatible.
- Không được “đổi field” phá consumer âm thầm.

---

## 6) API Gateway và edge concerns

Trong microservices, thường đặt **API Gateway** làm entry point:

- routing
- authn/authz coarse-grained
- rate limiting/quota
- request/response normalization
- observability tại edge

Nhưng tránh nhét business logic vào gateway (dễ thành mini‑monolith).

---

## 7) Service discovery, config và secrets

### 7.1 Service discovery

- K8s service discovery, Consul, hoặc service mesh.
- Tránh hard-code host/port.

### 7.2 Configuration

- Config theo môi trường (dev/stage/prod)
- GitOps hoặc config service
- Audit changes

### 7.3 Secrets

- Dùng secret manager (không để trong git)
- Rotate và least privilege

---

## 8) Resilience: làm sao để không “distributed monolith”

### 8.1 Timeouts

- Mọi call network đều phải có timeout.

### 8.2 Retries (cẩn thận)

- Retry bừa tạo retry storm.
- Retry chỉ cho lỗi transient + request idempotent.

### 8.3 Circuit breaker & bulkhead

- Circuit breaker để fail fast.
- Bulkhead để cách ly resource theo dependency.

### 8.4 Rate limiting & backpressure

- Rate limit ở gateway.
- Queue để hấp thụ burst.

---

## 9) Observability (bắt buộc trong microservices)

### 9.1 Logging

- Structured logs (JSON)
- Correlation ID/trace ID xuyên suốt
- Không log secrets/PII

### 9.2 Metrics

- RED (Rate, Errors, Duration) cho services
- USE cho infra (Utilization, Saturation, Errors)

### 9.3 Distributed tracing

- Propagate W3C `traceparent`.
- Tracing cho cả async flows (message ids/links).

### 9.4 SLOs

- SLO theo user journey (end-to-end) + theo service.
- Error budget để quyết định tốc độ release.

---

## 10) CI/CD và deploy strategy

Microservices tốt khi CI/CD tốt:

- build once, deploy many
- artifacts immutable
- canary/blue-green
- automated rollback

### 10.1 Database migrations

- Backward compatible migrations.
- Expand/contract pattern.

### 10.2 Version skew

- Chấp nhận services chạy phiên bản khác nhau.
- API contracts phải chịu được skew.

---

## 11) Testing trong microservices

### 11.1 Pyramid thực dụng

- Unit tests (nhiều)
- Integration tests (vừa)
- E2E tests (ít, tập trung critical paths)

### 11.2 Contract tests

- Consumer-driven contract giúp tránh breaking changes.

### 11.3 Test environments

- Dùng containers/test doubles.
- Seed data và reset state rõ ràng.

---

## 12) Security trong microservices

### 12.1 Identity propagation

- JWT/OAuth2 với access token ngắn hạn.
- Propagate identity/claims giữa services (cẩn thận trust boundary).

### 12.2 Service-to-service auth

- mTLS hoặc workload identity.
- Không dựa vào “internal network” làm security boundary.

### 12.3 Authorization

- Fine-grained authz thường phải ở service sở hữu data.
- Gateway chỉ nên làm coarse-grained checks.

---

## 13) Migrate từ monolith: chiến lược an toàn

### 13.1 Modular monolith trước

- Tách module theo domain trong cùng codebase.
- Rõ boundaries, giảm coupling.

### 13.2 Strangler pattern

- Đặt gateway/proxy trước monolith.
- Dần route một số endpoints sang service mới.

### 13.3 Tách theo “high value, low coupling”

- Tách service có boundary rõ, ít phụ thuộc.
- Không tách theo “cảm giác”.

---

## 14) Pitfalls & Anti-patterns

- **Distributed monolith**: services phụ thuộc chặt, không deploy độc lập.
- **Chatty communication**: quá nhiều calls giữa services.
- **Shared database** kéo dài mãi.
- **Thiếu observability**: không trace/log correlation.
- **Nhiều lớp retries** (client + gateway + mesh).
- **Không có ownership**: ai chịu trách nhiệm service nào.
- **Data duplication không kiểm soát**.

---

## 15) Checklist microservices production-ready

### Thiết kế

- [ ] Chia service theo business capability/bounded context
- [ ] Ownership rõ (team, on-call)
- [ ] API contracts/versioning rõ ràng

### Dữ liệu

- [ ] Database-per-service (hoặc roadmap tách)
- [ ] Saga/outbox/idempotency cho flows phân tán
- [ ] Migrations backward compatible

### Giao tiếp & resilience

- [ ] Timeouts ở mọi network calls
- [ ] Retries có backoff+jitter, giới hạn lần
- [ ] Circuit breaker + bulkhead cho dependencies
- [ ] DLQ + idempotent consumers cho messaging

### Observability & vận hành

- [ ] Structured logs + correlation id
- [ ] Metrics/dashboards/alerts theo service
- [ ] Distributed tracing end-to-end
- [ ] Runbooks cho sự cố phổ biến

### Bảo mật

- [ ] Service-to-service auth (mTLS/identity)
- [ ] Authorization tại service sở hữu data
- [ ] Secrets management + least privilege
