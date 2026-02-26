---
title: API Gateway trong lập trình web
description: Handbook production-ready về API Gateway cho hệ thống web/microservices: vai trò, thiết kế routing, security, rate limiting, observability, hiệu năng, triển khai và anti-patterns.
---

# API Gateway trong lập trình web

## 0) API Gateway là gì? Dùng để làm gì?

**API Gateway** là “cửa ngõ” (entry point) phía trước một hoặc nhiều backend services (thường là microservices). Gateway nhận request từ client (web/mobile/partner), sau đó **định tuyến** (route) tới service phù hợp và thường thực hiện thêm các cross‑cutting concerns như auth, rate limit, logging, request/response transform.

Nếu hệ thống là **monolith** đơn giản, gateway có thể không cần thiết. Trong hệ thống **microservices** hoặc **multi-client** (web, mobile, B2B), gateway giúp giảm phức tạp cho client và chuẩn hoá bảo mật/vận hành.

---

## 1) Khi nào nên/không nên dùng API Gateway?

### 1.1 Nên dùng khi

- Có **nhiều services** và bạn muốn client không phải biết internal topology.
- Cần **một lớp security thống nhất**: authn/authz, mTLS, WAF, DDoS protection, quota.
- Cần **traffic management**: rate limiting, throttling, circuit breaking, retries/timeouts.
- Cần **observability** nhất quán: trace id, access logs, metrics.
- Cần **API lifecycle**: versioning, deprecation, documentation, contract.
- Có nhu cầu **BFF** (Backend For Frontend) cho từng client.

### 1.2 Không nên (hoặc cân nhắc kỹ) khi

- Hệ thống nhỏ, ít endpoint, ít client: gateway có thể là “overkill”.
- Team chưa sẵn sàng vận hành một tầng hạ tầng mới (HA, config, rollout).
- Bạn định nhét quá nhiều business logic vào gateway (dễ thành “mini-monolith”).

---

## 2) Vai trò phổ biến của API Gateway

### 2.1 Routing & reverse proxy

- Path-based routing: `/users/*` → user-service
- Host-based routing: `api.example.com` vs `partner-api.example.com`
- Method-based routing: `GET/POST` phân tuyến khác nhau
- Canary routing: % traffic đến phiên bản mới

### 2.2 Aggregation & composition

Gateway có thể gọi nhiều services rồi **compose** thành một response (giảm round-trip cho client). Tuy nhiên cần cẩn thận về latency, timeout, và coupling.

### 2.3 Request/response transformation

- Normalize headers
- Convert payload formats (cẩn thận tránh thành “ETL”)
- Add/remove fields cho public API

### 2.4 Security & policy enforcement

- TLS termination, mTLS
- JWT validation / OAuth2 token introspection
- RBAC/ABAC enforcement (mức coarse)
- API key verification
- CORS policy
- WAF rules / bot management (tuỳ nền tảng)

### 2.5 Traffic management

- Rate limiting / quotas
- Timeouts, retries (có kiểm soát)
- Circuit breaker (phối hợp với service mesh hoặc client)
- Request size limiting

### 2.6 Observability

- Access logs chuẩn hoá
- Correlation ID / Trace context propagation
- Metrics (RPS, latency, error rates, saturation)

---

## 3) API Gateway vs Load Balancer vs Service Mesh

### 3.1 Load Balancer (LB)

- Tập trung vào **cân bằng tải** L4/L7, health check, TLS, routing cơ bản.
- Thường không quản lý policy phức tạp (rate limit theo user/tenant, auth workflows…).

### 3.2 API Gateway

- Tập trung vào **API management** và policy tại edge: auth, quotas, transforms, versioning.
- Là nơi “public API” được định nghĩa và vận hành.

### 3.3 Service Mesh

- Tập trung vào **east-west traffic** (service-to-service) bên trong cluster: mTLS, retries, telemetry, traffic shifting.
- Một hệ thống có thể dùng cả gateway (north-south) + mesh (east-west).

---

## 4) Kiến trúc tham khảo

### 4.1 Single gateway (đơn giản)

- Một gateway cluster phục vụ toàn bộ API.
- Dễ quản trị ban đầu nhưng có thể thành bottleneck/point of failure nếu không HA.

### 4.2 BFF (Backend For Frontend)

- Mỗi client (Web, Mobile) có một gateway/BFF riêng.
- Ưu điểm: tối ưu payload/latency theo client.
- Nhược: tăng số thành phần cần vận hành.

### 4.3 Edge gateway + internal gateway

- Edge gateway ở biên (internet-facing)
- Internal gateway cho partner/internal consumers
- Tách security boundary rõ ràng.

---

## 5) Thiết kế API trên gateway

### 5.1 Contract-first

- Dùng OpenAPI/Swagger làm hợp đồng.
- Lợi ích: tạo docs, SDK, validation, policy dựa trên spec.

### 5.2 Versioning & compatibility

- Ưu tiên **backward compatible**.
- Nếu cần breaking change: `/v2/...` hoặc `Accept: application/vnd...`.
- Có policy deprecation rõ ràng: ngày ngừng hỗ trợ, thông báo, monitoring adoption.

### 5.3 Idempotency

- Với các endpoint ghi (create payment/order), hỗ trợ `Idempotency-Key`.
- Gateway có thể enforce presence/format, còn xử lý lưu trạng thái thường ở backend.

---

## 6) Security tại API Gateway (quan trọng nhất)

### 6.1 TLS termination và mTLS

- Terminate TLS tại gateway là phổ biến.
- Với B2B/partner hoặc nội bộ nhạy cảm: cân nhắc **mTLS**.

### 6.2 Authentication

Các cách thường gặp:

- **JWT verification** (offline): validate signature, issuer, audience, expiry.
- **OAuth2 introspection** (online): kiểm tra token qua auth server (tốn latency, cần caching).
- **API keys**: phù hợp cho partner/simple use cases nhưng cần rotate, scope, quota.

Nguyên tắc:

- Fail closed (không xác thực được thì từ chối).
- Cache hợp lý (JWKS, introspection) nhưng cẩn thận TTL.

### 6.3 Authorization

- Gateway phù hợp để enforce policy **coarse-grained** (route-level: role/tenant/subscription).
- Fine-grained (resource-level) nên nằm ở backend service (tránh bypass, đảm bảo đúng ngữ cảnh dữ liệu).

### 6.4 Input validation & request limits

- Enforce max body size.
- Enforce schema (nếu có khả năng) hoặc ít nhất validate headers/query cơ bản.
- Chặn path traversal, header smuggling theo capability của gateway.

### 6.5 CORS

- Allowlist origins.
- Tránh `Access-Control-Allow-Origin: *` khi `credentials=true`.

### 6.6 Secrets management

- Không hard-code secrets trong config.
- Dùng secret manager/managed identity.

---

## 7) Rate limiting, quotas và chống abuse

### 7.1 Phân biệt

- **Rate limit**: giới hạn theo thời gian ngắn (RPS/min).
- **Quota**: giới hạn theo chu kỳ dài (ngày/tháng), theo plan/tenant.

### 7.2 Keys để limit

- Theo IP (thô, dễ false positive phía NAT)
- Theo user id / API key / tenant id (chính xác hơn)
- Theo route/method (endpoint nhạy cảm stricter)

### 7.3 Thuật toán hay dùng

- Token bucket / leaky bucket
- Sliding window

### 7.4 Response chuẩn

- HTTP `429 Too Many Requests`
- Header `Retry-After` (khi áp dụng)
- Có thể kèm các header quota/rate (tuỳ chuẩn nội bộ)

---

## 8) Resilience: timeouts, retries, circuit breaker

### 8.1 Timeouts

- Gateway phải có **timeout rõ ràng** cho upstream (không để request treo).
- Timeout nên được phân tầng: client ↔ gateway ↔ upstream.

### 8.2 Retries

- Chỉ retry với lỗi transient và request **idempotent**.
- Tránh retry bừa gây “retry storm”.

### 8.3 Circuit breaker

- Khi upstream lỗi/timeout nhiều, gateway nên giảm load (open circuit).
- Dùng fallback trả “degraded response” chỉ khi có thiết kế rõ (vd. cached data).

---

## 9) Observability tại gateway

### 9.1 Logs

- Access log dạng structured (JSON) với các trường: method, path, status, latency, client ip, user/tenant id (nếu an toàn), request id.
- Redact PII/secrets (Authorization header, cookies, tokens).

### 9.2 Metrics

- RPS theo route
- P50/P95/P99 latency
- 4xx/5xx rate
- Rate-limit hits
- Upstream error/timeouts

### 9.3 Distributed tracing

- Propagate `traceparent` (W3C Trace Context) hoặc chuẩn bạn dùng.
- Gateway tạo span cho inbound request và attach attributes: route, upstream service.

---

## 10) Hiệu năng và caching

### 10.1 Latency budget

Gateway thêm một hop nên phải tối ưu:

- Keep-alive upstream
- Connection pooling
- Efficient TLS config

### 10.2 Caching

- Gateway có thể cache response cho GET nếu phù hợp (public endpoints, metadata).
- Tôn trọng HTTP caching headers (`Cache-Control`, `ETag`).
- Cẩn thận cache theo user/authorization (rất dễ leak dữ liệu).

---

## 11) Triển khai & vận hành

### 11.1 HA & scaling

- Gateway thường là critical path → chạy nhiều replicas, multi-AZ.
- Autoscale theo CPU/RPS/latency.

### 11.2 Configuration management

- Config là “source of truth” (GitOps hoặc config store).
- Rollout config an toàn: validate trước, canary config.
- Audit trail cho thay đổi routes/policies.

### 11.3 Zero downtime deploy

- Graceful shutdown: drain connections.
- Health checks đúng: readiness vs liveness.

### 11.4 Disaster recovery

- Backup config.
- Runbook sự cố gateway: quá tải, cert hết hạn, auth provider down.

---

## 12) Các pattern thường gặp

### 12.1 Strangler pattern cho migrate monolith → microservices

- Đưa gateway trước monolith.
- Dần dần route một số endpoint sang microservices.

### 12.2 Backend For Frontend (BFF)

- API tailored cho web/mobile.
- Tránh để client gọi quá nhiều services.

### 12.3 API composition

- Gateway compose từ nhiều services.
- Đặt giới hạn: số upstream calls, timeout tổng, circuit breaker.

---

## 13) Pitfalls & Anti-patterns

- **Nhét business logic vào gateway**: khó test, khó scale team, coupling cao.
- **Gateway trở thành SPOF**: không HA, không multi-AZ.
- **Retries không kiểm soát** gây thảm hoạ khi upstream chậm.
- **Auth chỉ ở gateway** và bỏ auth service-to-service: dễ bị bypass nếu lộ internal network.
- **Caching sai key** làm leak dữ liệu user/tenant.
- **Không có observability**: không trace/log chuẩn, khó điều tra sự cố.

---

## 14) Checklist triển khai API Gateway production-ready

### Thiết kế

- [ ] Có tiêu chí rõ: vì sao cần gateway (không dùng vì “trend”)
- [ ] Contract-first (OpenAPI) + versioning/deprecation policy
- [ ] Rõ trách nhiệm: gateway vs backend (authz fine-grained ở backend)

### Security

- [ ] TLS chuẩn, rotate cert
- [ ] JWT/OAuth2 validate đúng (issuer/audience/exp)
- [ ] Rate limit cho login và endpoints nhạy cảm
- [ ] Request size limits + CORS allowlist
- [ ] Redact secrets/PII trong logs

### Resilience & hiệu năng

- [ ] Upstream timeouts rõ ràng
- [ ] Retries chỉ cho idempotent + có backoff
- [ ] Circuit breaker / bulkhead
- [ ] Connection pooling/keep-alive

### Observability & vận hành

- [ ] Structured access logs + metrics theo route
- [ ] Distributed tracing propagation
- [ ] HA multi-replica, multi-AZ
- [ ] Config management (GitOps) + audit trail
- [ ] Runbooks + alerting (5xx, timeouts, rate limit hits)
