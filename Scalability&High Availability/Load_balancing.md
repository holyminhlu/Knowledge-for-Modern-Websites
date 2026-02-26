---
title: Load Balancing
description: Handbook thực chiến về load balancing trong hệ thống web: L4/L7, thuật toán phân phối, health checks, TLS termination, session affinity, retries/timeouts, global load balancing, Kubernetes ingress, bảo mật, observability và checklist production.
---

# Load balancing trong lập trình web

## 1) Load balancer là gì? Vì sao cần?

**Load balancer (LB)** là thành phần đứng trước một hoặc nhiều backend instances để:

- **Phân phối traffic** đến nhiều server/pod/instance
- **Tăng availability** (failover khi một backend chết)
- **Scale-out** dễ (thêm/bớt instances)
- (Thường) **Terminate TLS**, routing, rate limiting, WAF… tùy loại LB

Trong kiến trúc web hiện đại, LB có thể xuất hiện ở nhiều tầng:

- Edge/global LB (trước CDN/origin)
- Regional LB (trước dịch vụ)
- In-cluster LB/service mesh (giữa services)

---

## 2) Các loại load balancing

### 2.1 DNS load balancing (Global Server Load Balancing - GSLB)

- Dùng DNS để trả về IP/endpoint khác nhau theo region/health/latency.

Ưu:

- Global distribution
- Dễ tích hợp multi-region

Nhược:

- Failover chậm do DNS TTL/caching
- Không phù hợp cho per-request routing tinh vi

### 2.2 Layer 4 (L4) load balancing

- Hoạt động ở TCP/UDP level (không hiểu HTTP semantics).
- Thường rất nhanh, overhead thấp.

Use cases:

- TCP services, gRPC over HTTP/2 (có thể qua L4), TLS passthrough

### 2.3 Layer 7 (L7) load balancing / Reverse proxy

- Hiểu HTTP: path/host/headers/cookies.
- Hỗ trợ routing theo rule, A/B, canary, retries, header manipulation.

Use cases:

- Web apps, APIs, microservices routing

---

## 3) Kiến trúc triển khai phổ biến

### 3.1 External LB → Ingress/Reverse proxy → Services

- External LB: chịu traffic Internet, thường terminate TLS.
- Ingress/reverse proxy: routing theo host/path.
- Services: backend pods/instances.

### 3.2 LB cho microservices

- North-south: client → gateway/ingress.
- East-west: service-to-service (service mesh hoặc internal L7 proxy).

---

## 4) Thuật toán phân phối (load balancing algorithms)

### 4.1 Round-robin

- Phân phối lần lượt từng backend.
- Đơn giản, ổn khi backends đồng đều.

### 4.2 Weighted round-robin

- Phân phối theo trọng số.
- Dùng cho canary (10% traffic vào canary pool).

### 4.3 Least connections

- Gửi request tới backend có ít kết nối nhất.
- Hợp khi request time khác nhau nhiều.

### 4.4 Least response time / latency-aware

- Dựa trên latency đo được.
- Cần cẩn thận feedback loop: backend chậm có thể bị “bỏ đói”/“dồn tải” sai.

### 4.5 Hash-based (consistent hashing)

- Dựa trên key (client IP, session ID, user ID) để chọn backend.
- Dùng cho session affinity hoặc cache locality.
- Nhưng có thể tạo hot spots.

---

## 5) Health checks: nền tảng của HA

### 5.1 Passive vs active health checks

- **Active**: LB chủ động ping/GET endpoint định kỳ.
- **Passive**: LB suy ra từ lỗi/timeout thực tế.

### 5.2 Readiness vs liveness

- **Readiness**: backend sẵn sàng nhận traffic (đã load config, warmup, kết nối DB ok...).
- **Liveness**: process còn sống.

Thực hành tốt:

- LB dựa trên readiness để route traffic.
- Graceful shutdown + draining để tránh cắt request.

### 5.3 Health endpoint thiết kế đúng

- Không quá “nặng” (không gọi tất cả downstream mỗi lần).
- Có thể tách:
  - `/healthz` (liveness)
  - `/readyz` (readiness)
  - `/status` (thông tin sâu hơn, hạn chế quyền truy cập)

---

## 6) TLS termination và mTLS

### 6.1 TLS termination

- LB nhận TLS từ client, giải mã, rồi gửi HTTP/plaintext tới backend (trong mạng private).

Ưu:

- Giảm tải TLS cho backend
- Quản lý cert tập trung

Nhược:

- Segment nội bộ cần an toàn (private network)
- Nếu yêu cầu end-to-end encryption: dùng TLS re-encryption hoặc passthrough

### 6.2 TLS passthrough

- LB không giải mã, chỉ chuyển tiếp TCP.
- Backend tự terminate TLS.
- Hạn chế routing L7 (không đọc path/headers).

### 6.3 mTLS nội bộ

- Dùng cho east-west traffic (service mesh) để xác thực service-to-service.

---

## 7) Session affinity (sticky sessions)

### 7.1 Sticky session là gì?

- LB cố gắng route các request của một client về cùng backend.
- Thường dựa trên cookie hoặc source IP.

### 7.2 Khi nào cần?

- WebSocket (connection gắn với backend)
- Ứng dụng legacy giữ session in-memory

### 7.3 Trade-offs

- Giảm hiệu quả load distribution
- Khi backend chết: session mất
- Khi autoscale: phân phối lại khó

Khuyến nghị: ưu tiên **stateless** + session store (Redis) hoặc token-based session; sticky chỉ dùng khi bắt buộc.

---

## 8) Timeouts, retries, circuit breakers và “retry storm”

### 8.1 Timeouts

LB thường có nhiều timeout:

- client idle timeout
- upstream connect timeout
- upstream read timeout

Nguyên tắc:

- Timeout phải được định nghĩa end-to-end và có ngân sách.
- Upstream timeout < downstream timeout để tránh request treo.

### 8.2 Retries

- Retries có thể tăng reliability cho lỗi transient.
- Nhưng retries sai có thể làm sự cố tệ hơn (retry storm).

Thực hành tốt:

- Retries chỉ cho **idempotent** requests (GET, PUT với idempotency key...)
- Backoff + jitter
- Retry budget (giới hạn tổng retries)
- Circuit breaker khi downstream suy giảm

### 8.3 Hedged requests

- Gửi request thứ 2 khi request 1 chậm quá ngưỡng.
- Có thể giảm tail latency nhưng tăng load; dùng rất thận trọng.

---

## 9) Load balancing cho WebSocket và streaming

Thách thức:

- Connection lâu, chiếm tài nguyên.
- Sticky session gần như bắt buộc.

Thực hành tốt:

- Scale theo connection count.
- Dùng ping/pong, keep-alive.
- Draining trước khi deploy.
- Nếu cần fan-out: dùng pub/sub backend (Redis/NATS/Kafka).

---

## 10) Global load balancing và multi-region

### 10.1 Active-active

- Nhiều region cùng phục vụ.
- Cần data strategy (replication, conflict handling).

### 10.2 Active-passive

- Region dự phòng chỉ bật khi region chính down.
- Dễ hơn về data consistency.

### 10.3 Routing policies

- Geo-based
- Latency-based
- Weighted (gradual shift)
- Failover dựa trên health checks

---

## 11) Load balancing trong Kubernetes

### 11.1 Service

- `ClusterIP`: LB nội bộ trong cluster.
- `NodePort`: expose qua node ports.
- `LoadBalancer`: provision external LB (cloud).

### 11.2 Ingress

- Routing L7 theo host/path.
- Thường là reverse proxy controller.

### 11.3 Service mesh

- L7 proxy sidecar hoặc ambient.
- Hỗ trợ retries, timeouts, mTLS, observability.

---

## 12) Bảo mật liên quan load balancing

- Rate limiting ở edge/LB để giảm abuse.
- WAF/bot mitigation (nếu LB/CDN hỗ trợ).
- Protect origin: không cho bypass LB (IP allowlist, security groups).
- Header sanitation (X-Forwarded-For, X-Real-IP): tránh spoof.

---

## 13) Observability cho load balancing

### 13.1 Metrics

- RPS, error rate, latency (p50/p95/p99)
- Backend health status
- Connection counts (đặc biệt WebSocket)
- Retry counts
- 4xx/5xx breakdown

### 13.2 Logs

- Access logs (method, route, status, bytes, latency)
- Correlation IDs / trace IDs

### 13.3 Tracing

- Nếu LB hỗ trợ trace headers, đảm bảo propagate end-to-end.

---

## 14) Checklist load balancing production-ready

### Routing & health

- [ ] Health checks (readiness) đúng và nhanh
- [ ] Connection draining/graceful shutdown khi deploy
- [ ] Thuật toán LB phù hợp (RR/least-conn/weighted)

### Reliability

- [ ] Timeouts được cấu hình end-to-end
- [ ] Retries có kiểm soát (idempotent + backoff + budget)
- [ ] Circuit breaker/fallback cho downstream

### Security

- [ ] TLS cấu hình đúng (HSTS nếu phù hợp)
- [ ] Header sanitation (X-Forwarded-For)
- [ ] Rate limiting/WAF baseline
- [ ] Chống bypass origin

### Observability

- [ ] Dashboards: RPS/errors/latency + backend health
- [ ] Access logs có correlation/trace IDs
- [ ] Alert theo symptom (error rate/latency), không chỉ CPU

---

## 15) Anti-patterns

- **Không có health checks** hoặc health endpoint quá nặng.
- **Timeout/retry không đồng bộ** giữa client/LB/service → request treo và bùng retries.
- **Sticky sessions mặc định** dù app có thể stateless.
- **Cache/LB phục vụ nhầm nội dung** vì cache key/headers sai.
- **Không sanitize X-Forwarded-For** → log/rate limit bị spoof.
- **Không draining khi deploy** → rớt request, WebSocket bị reset hàng loạt.
