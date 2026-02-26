---
title: Redis Cache
description: Handbook thực chiến về Redis cache trong hệ thống web: cache patterns, TTL/eviction, consistency, stampede protection, session/rate limit/locks, replication/cluster, observability và security.
---

# Redis cache trong lập trình web

## 1) Redis là gì và vì sao dùng làm cache?

**Redis** là in-memory data store (key-value) cực nhanh, hỗ trợ nhiều cấu trúc dữ liệu, thường dùng để:

- Cache dữ liệu để giảm latency và giảm tải DB
- Session store
- Rate limiting / counters
- Pub/Sub (real-time notifications) và stream (Redis Streams)
- Distributed locks (cẩn thận)

Vì sao Redis phù hợp làm cache:

- Đọc/ghi nhanh (RAM)
- TTL sẵn có
- Atomic operations (INCR, SETNX, Lua scripts)
- Hỗ trợ clustering/replication

Lưu ý: Redis không phải “thuốc thần”. Cache sai có thể gây dữ liệu sai, leak dữ liệu user, hoặc làm outage do stampede.

---

## 2) Thuật ngữ cốt lõi

- **Key**: định danh dữ liệu cache.
- **Value**: dữ liệu cache (string/json/binary) hoặc cấu trúc dữ liệu.
- **TTL (expiration)**: thời gian sống của key.
- **Eviction policy**: chính sách đuổi key khi thiếu memory.
- **Hot key**: key cực nhiều traffic.
- **Cache hit/miss**: request có/không có dữ liệu trong cache.
- **Stampede / thundering herd**: nhiều request cùng miss → dồn tải vào DB/origin.

---

## 3) Khi nào nên cache? Cache cái gì?

### Nên cache

- Dữ liệu đọc nhiều, thay đổi ít (catalog, config, feature flags snapshot).
- Kết quả query đắt (aggregation).
- Kết quả gọi external API chậm.

### Không nên (hoặc phải cực thận trọng)

- Dữ liệu cực nhạy (trừ khi encryption/segmentation chắc chắn).
- Dữ liệu yêu cầu strong consistency tuyệt đối mọi lúc.
- Dữ liệu per-user nhưng cache key không tách scope rõ → dễ leak.

### Quy tắc thực chiến

- Cache là một **optimization layer**, không phải source of truth.
- Luôn giả định Redis có thể mất dữ liệu (restart/eviction), app phải chịu được.

---

## 4) Các cấu trúc dữ liệu Redis hay dùng cho web

- **String**: cache JSON/blob, counters.
- **Hash**: profile fields, object-like storage.
- **List**: queues đơn giản (ít dùng cho queue prod lớn).
- **Set**: membership, unique items.
- **Sorted Set (ZSET)**: leaderboards, rate limit sliding windows, scheduling.
- **Streams**: event stream/queue với consumer groups.

Chọn cấu trúc phù hợp giúp:

- ít memory hơn
- atomic ops dễ hơn
- query/aggregation nhanh hơn

---

## 5) Cache patterns (cách dùng Redis làm cache)

### 5.1 Cache-aside (lazy loading) — phổ biến nhất

Flow:

1. App đọc cache
2. Miss → đọc DB
3. Ghi lại vào cache với TTL

Ưu:

- Dễ triển khai
- Chỉ cache những gì thật sự cần

Nhược:

- Cold start / cache warmup
- Stampede nếu key hot cùng miss

### 5.2 Read-through

- Cache layer tự fetch từ DB khi miss (thường qua library/proxy).
- Ít phổ biến hơn trong app-level, nhưng có trong một số nền tảng.

### 5.3 Write-through

- Mọi write đi qua cache rồi đến DB.
- Đảm bảo cache luôn mới, nhưng tăng latency write.

### 5.4 Write-behind (write-back)

- Ghi cache trước, flush DB sau.
- Phức tạp và rủi ro mất dữ liệu nếu cache crash.
- Thường không dùng cho dữ liệu quan trọng.

### 5.5 Cache invalidation vs versioning

- Invalidate/purge: xóa key khi dữ liệu đổi.
- Versioned keys: đổi version prefix để “bỏ” cache cũ.

---

## 6) TTL và chiến lược expiration

### 6.1 TTL nên đặt thế nào?

- Dữ liệu càng “fresh” yêu cầu cao → TTL càng ngắn.
- Dữ liệu gần như tĩnh → TTL dài.

### 6.2 TTL jitter

Để tránh “cache avalanche” (nhiều key hết hạn cùng lúc):

- thêm jitter: TTL = base ± random

### 6.3 Stale-while-revalidate (ứng dụng ở app layer)

- Cho phép trả dữ liệu stale trong thời gian ngắn
- Refresh nền để tránh spike DB

---

## 7) Eviction và sizing

### 7.1 Redis maxmemory và eviction policy

Khi chạm `maxmemory`, Redis bắt đầu evict theo policy (tuỳ cấu hình), ví dụ:

- LRU/LFU (approximate) theo keys có TTL hoặc all keys
- Noeviction (write fail)

Thực hành tốt:

- Dữ liệu cache nên đặt TTL để eviction policy hoạt động hiệu quả.
- Monitor eviction rate. Evictions tăng thường làm hit ratio giảm.

### 7.2 Memory model

- JSON strings có overhead.
- Hash có thể tiết kiệm hơn cho object nhiều fields.

### 7.3 Hot keys

- Hot key có thể tạo bottleneck single-thread Redis.
  Giải pháp:
- Shard theo key (key hashing)
- Local in-process cache bổ trợ (cẩn thận consistency)
- Replica reads (tuỳ use case)

---

## 8) Cache consistency và invalidation

Vấn đề cốt lõi: DB là source of truth, cache có thể stale.

### 8.1 Eventual consistency là mặc định

- Chấp nhận stale trong thời gian TTL hoặc đến khi invalidate.

### 8.2 Invalidation strategies

- Delete key khi update DB.
- Publish invalidation event (pub/sub/stream) để nhiều services cùng xóa.
- Versioned keys (đổi version khi deploy hoặc khi schema thay đổi).

### 8.3 Cache aside + write path

Thực hành tốt khi update:

- Update DB trước, rồi delete cache key.
- Tránh “double write” không atomic giữa DB và Redis.

### 8.4 Race conditions

Case: request A miss, đọc DB cũ; request B update DB, delete cache; request A set cache lại với dữ liệu cũ.
Giảm rủi ro:

- set cache với TTL ngắn
- dùng version/timestamp trong value
- sử dụng “write-after-read” guards (tùy mức độ cần)

---

## 9) Chống cache stampede / thundering herd

### 9.1 Request coalescing (single-flight)

- Nếu nhiều request cùng miss, chỉ một request fetch DB, các request khác chờ.

### 9.2 Probabilistic early refresh

- Refresh trước khi TTL hết dựa trên xác suất và latency.

### 9.3 Soft TTL + hard TTL

- Soft TTL: sau thời điểm này trả stale và refresh nền.
- Hard TTL: sau thời điểm này bắt buộc miss.

### 9.4 Circuit breaker

- Khi DB/downstream chậm, trả stale hoặc fallback thay vì dồn tải.

---

## 10) Redis cho session store

### 10.1 Vì sao dùng Redis cho sessions?

- Scale-out app tier không cần sticky sessions.
- TTL tự nhiên cho session expiration.

### 10.2 Lưu ý

- Key nên tách theo environment/app.
- Session data tối thiểu, tránh store quá lớn.
- Bảo mật: session id phải random mạnh; cookie HttpOnly/Secure/SameSite.

---

## 11) Redis cho rate limiting

Redis phù hợp vì atomic ops nhanh.

Các chiến lược:

- Fixed window counter (đơn giản nhưng có burst boundary)
- Sliding window (zset hoặc approximation)
- Token bucket / leaky bucket

Lưu ý:

- Key theo user/tenant/ip + route.
- Tránh cardinality quá cao nếu không cần.

---

## 12) Distributed locks (cẩn thận)

Redis có thể dùng lock cho:

- cron jobs “only one runs”
- leader election đơn giản

Pattern đơn giản:

- `SET lock_key value NX PX <ttl>`
- release chỉ khi value match (Lua script)

Cảnh báo:

- Lock dễ sai nếu TTL không phù hợp hoặc clock drift.
- Với yêu cầu correctness cao, cân nhắc giải pháp chuyên dụng hoặc thiết kế idempotent thay vì lock.

---

## 13) Topology: standalone, replication, sentinel, cluster

### 13.1 Standalone

- Đơn giản, phù hợp dev/small workloads.

### 13.2 Replication (primary/replica)

- Scale reads (tuỳ) và HA.
- Có replication lag → dữ liệu có thể stale khi đọc replica.

### 13.3 Sentinel

- Quản lý failover tự động cho primary/replica.

### 13.4 Redis Cluster

- Sharding dữ liệu theo hash slots.
- Scale capacity và throughput.
- Client phải hỗ trợ cluster.

Thực hành tốt:

- Chọn topology theo traffic/memory/HA yêu cầu.
- Test failover (chaos-style) để biết app phản ứng ra sao.

---

## 14) Observability cho Redis cache

### 14.1 Metrics quan trọng

- Hit ratio (ở app layer)
- Latency (GET/SET)
- Memory usage, fragmentation
- Evictions
- Keyspace hits/misses
- CPU usage
- Connections
- Replication lag (nếu có)

### 14.2 Logs

- Redis slowlog (tránh bật quá nặng)
- App logs khi cache error/fallback

### 14.3 Alerts

- Evictions spike
- Memory gần max
- Latency tăng
- Connection errors

---

## 15) Security cho Redis

- Không expose Redis ra Internet.
- Bật auth/ACL nếu có multi-client.
- TLS in transit nếu chạy qua network không tin cậy.
- Network policies / security groups.
- Rotate credentials.

Nếu dùng managed Redis, vẫn cần kiểm soát VPC, security groups, và access patterns.

---

## 16) Checklist Redis cache production-ready

### Thiết kế

- [ ] Cache keys có namespace (env/service)
- [ ] TTL phù hợp + TTL jitter
- [ ] Cache stampede protection cho hot keys
- [ ] Invalidation strategy rõ ràng

### Vận hành

- [ ] maxmemory + eviction policy đúng
- [ ] Dashboards: latency/memory/evictions
- [ ] Alerts cho evictions/memory/latency/errors
- [ ] Test failover nếu có HA

### Security

- [ ] Redis không public
- [ ] ACL/auth/TLS (khi cần)
- [ ] Redact dữ liệu nhạy cảm (không cache secrets)

---

## 17) Anti-patterns

- **Dùng Redis như database chính** cho dữ liệu quan trọng mà không có persistence/replication đúng.
- **Cache không TTL** → memory đầy, eviction không kiểm soát.
- **Cache per-user nhưng key không tách scope** → leak dữ liệu.
- **Không chống stampede** → DB spike khi cache miss.
- **Không giới hạn connection pools** → Redis quá tải.
- **Log/cache PII/secrets** → rủi ro bảo mật.
