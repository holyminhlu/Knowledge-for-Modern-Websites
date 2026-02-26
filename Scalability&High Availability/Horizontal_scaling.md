---
title: Horizontal Scaling
description: Handbook thực chiến về horizontal scaling (scale-out) trong hệ thống web: statelessness, load balancing, session/state, cache/DB/queue, autoscaling, reliability và observability.
---

# Horizontal scaling trong lập trình web

## 1) Horizontal scaling là gì?

**Horizontal scaling (scale-out)** là tăng năng lực hệ thống bằng cách **thêm nhiều instance** (pods/containers/VMs/servers) chạy cùng một service và phân phối traffic giữa chúng.

So sánh nhanh:

- **Vertical scaling (scale-up)**: tăng CPU/RAM của một máy (dễ nhưng có giới hạn và “single big box”).
- **Horizontal scaling (scale-out)**: thêm nhiều máy/instance (phức tạp hơn, nhưng scale cao và HA tốt).

Trong web hiện đại, scale-out thường là mặc định nhờ:

- container orchestration (Kubernetes)
- managed load balancers
- stateless app patterns
- cache/queue/DB replication

---

## 2) Khi nào cần horizontal scaling?

Bạn thường scale-out khi:

- Throughput tăng (req/s) vượt khả năng một instance.
- Latency tăng do saturation (CPU/IO/thread pool).
- Muốn **high availability**: một instance chết không làm sập dịch vụ.
- Muốn rollout an toàn (rolling/canary/blue-green).

Quan trọng: scale-out không chữa được mọi vấn đề. Nếu bottleneck là DB độc nhất, scale-out app sẽ sớm đụng trần.

---

## 3) Điều kiện tiên quyết: statelessness

### 3.1 Vì sao app phải “stateless” để scale-out dễ?

Nếu instance giữ state trong memory/disk cục bộ, khi request đi đến instance khác:

- user mất session
- dữ liệu không nhất quán
- khó autoscale và rolling update

### 3.2 Những state hay gặp và cách xử lý

- **Session**: dùng cookie (signed/encrypted), Redis session store, hoặc JWT tuỳ mô hình.
- **Uploads/files**: dùng object storage (S3/GCS) thay vì local disk.
- **Cache**: dùng distributed cache (Redis/Memcached) hoặc cache per-node chỉ là “best effort”.
- **Background jobs**: tách worker pool, dùng queue.

### 3.3 Sticky sessions có phải giải pháp?

- Sticky session (session affinity) có thể “chữa cháy”, nhưng:
  - giảm hiệu quả load balancing
  - tăng rủi ro khi instance chết
  - khó scale nhanh

Khuyến nghị: stateless + externalized state; sticky chỉ dùng khi bắt buộc (ví dụ WebSocket) và có thiết kế phù hợp.

---

## 4) Load balancing: phân phối traffic đúng

### 4.1 Các cấp độ load balancing

- **DNS load balancing**: đơn giản, nhưng failover chậm do TTL.
- **L4 (TCP/UDP)**: nhanh, ít overhead, không hiểu HTTP.
- **L7 (HTTP)**: hiểu routes/headers/cookies, hỗ trợ canary, retries, rate limiting.

### 4.2 Thuật toán phân phối phổ biến

- Round-robin
- Least connections
- Weighted (phục vụ canary)
- Hash-based (consistent hashing) cho cache affinity

### 4.3 Health checks

- **Readiness**: instance sẵn sàng nhận traffic.
- **Liveness**: instance còn sống.
- Cần graceful shutdown + connection draining để tránh cắt request giữa chừng.

### 4.4 Retries và timeout

- Retries ở LB/service mesh có thể giúp reliability, nhưng:
  - dễ tạo “retry storm” khi downstream suy giảm.
  - phải có timeout, circuit breaker, và budget.

---

## 5) Scaling tại tầng ứng dụng (app tier)

### 5.1 Stateless HTTP

- Scale-out rất tốt nếu mọi request độc lập.

### 5.2 WebSocket / realtime

Khó hơn vì connection “dính” vào instance.
Giải pháp:

- Sticky sessions (bắt buộc ở LB) + scale theo connection count
- Pub/sub backend (Redis, NATS, Kafka) để broadcast rooms
- WebSocket gateway chuyên dụng

### 5.3 Background workers

- Scale consumer theo queue lag.
- Thiết kế idempotent + retry/DLQ.

---

## 6) Dữ liệu là nơi scale-out dễ “kẹt” nhất

### 6.1 Database

Kỹ thuật phổ biến:

- **Read replicas**: scale reads, giảm tải primary.
- **Connection pooling**: tránh tạo quá nhiều connections khi app scale-out.
- **Caching**: giảm reads.
- **Sharding/partitioning**: scale writes theo key (phức tạp).
- **CQRS** (khi phù hợp): tách read model.

Thực hành tốt:

- Đặt giới hạn pool per instance, tránh “pool explosion” khi tăng replicas.
- Theo dõi slow queries, locks, replication lag.

### 6.2 Cache (Redis/Memcached)

- Cache giúp scale-out app và giảm tải DB.
- Tránh cache stampede:
  - request coalescing
  - TTL jitter
  - stale-while-revalidate

### 6.3 Message queues/streams

- Scale-out consumers theo partitioning/consumer groups.
- Tránh phá ordering nếu business yêu cầu.

---

## 7) Consistency, concurrency và idempotency

Khi scale-out, nhiều instance xử lý đồng thời → dễ gặp race conditions.

### 7.1 Idempotency

- Với APIs quan trọng (payments, create order): dùng idempotency key.
- Với background jobs: idempotent handlers + dedup.

### 7.2 Distributed locks

- Chỉ dùng khi cần; dễ tạo bottleneck.
- Ưu tiên optimistic concurrency (version column/ETag).

### 7.3 Timeouts và backpressure

- Timeouts ở mọi hop.
- Queue/backpressure để không “đổ dồn” vào DB.

---

## 8) Autoscaling

### 8.1 HPA/VPA (khái niệm)

- **Horizontal autoscaling**: thêm/bớt replicas.
- **Vertical autoscaling**: tăng/giảm resources cho pod.

### 8.2 Scaling signals

- CPU/memory: dễ nhưng đôi khi không phản ánh user impact.
- Request rate (RPS)
- Latency (p95/p99)
- Queue lag/backlog
- Custom business metrics (cẩn thận)

### 8.3 Cold start và warmup

- App cần warm caches, JIT, connection pools.
- Dùng readiness gates để không nhận traffic quá sớm.

### 8.4 Scale-to-zero?

- Hợp cho workloads không liên tục (serverless).
- Cẩn thận cold start latency.

---

## 9) High availability khi scale-out

Scale-out giúp HA, nhưng cần thêm:

- Multi-AZ deployment
- Load balancer đa AZ
- Rolling updates đúng cách
- Anti-affinity (không đặt tất cả replicas trên một node)
- Chaos testing (khi trưởng thành)

---

## 10) Observability cho horizontal scaling

### 10.1 Metrics

- RPS, error rate, latency theo route
- CPU/memory, GC, thread pool
- Queue lag
- DB connections, slow queries
- Cache hit ratio

### 10.2 Logging

- Structured logs có `instance_id`, `service.version`, `trace_id`.

### 10.3 Tracing

- Theo dõi distributed path để phát hiện bottleneck (DB, external APIs).

### 10.4 Capacity & cost

- Theo dõi cost/req và saturation để tránh over-provision.

---

## 11) Checklist horizontal scaling production-ready

### App tier

- [ ] Stateless (không phụ thuộc local memory/disk)
- [ ] Session externalized (cookie/Redis)
- [ ] Graceful shutdown + connection draining
- [ ] Readiness/liveness probes đúng

### Data tier

- [ ] Connection pooling có giới hạn theo instance
- [ ] Cache strategy rõ + chống stampede
- [ ] Read replicas (nếu read-heavy)
- [ ] Plan cho writes (shard/CQRS) nếu cần

### Autoscaling

- [ ] Scaling signals phù hợp (RPS/latency/lag)
- [ ] Warmup strategy
- [ ] Rate limits để tránh overload

### Operability

- [ ] Dashboards theo service/version
- [ ] Alerts dựa trên user impact
- [ ] Runbooks scaling + incident

---

## 12) Anti-patterns

- **Scale app trước khi tối ưu DB**: app nhiều nhưng DB vẫn nghẽn.
- **Sticky sessions như mặc định**: giảm resilience và scaling.
- **Không giới hạn connection pool**: scale-out làm DB “chết vì connections”.
- **Retries không kiểm soát**: tạo retry storm.
- **Thiếu idempotency**: duplicate requests gây lỗi dữ liệu.
- **Autoscale theo CPU duy nhất**: bỏ lỡ saturation ở DB/queue.
