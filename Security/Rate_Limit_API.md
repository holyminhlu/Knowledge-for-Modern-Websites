---
title: API Rate Limiting
description: Handbook thực chiến về rate limiting cho API/web systems: mục tiêu, policy, thuật toán (token bucket/leaky bucket/sliding window), triển khai phân tán (Redis), headers/429, chống abuse/DDoS, observability và checklist.
---

# Rate limiting API trong lập trình web

## 1) Rate limiting là gì? Giải quyết vấn đề gì?

**Rate limiting** là cơ chế giới hạn số lượng request (hoặc “đơn vị tiêu thụ”) mà một client có thể thực hiện trong một khoảng thời gian.

Mục tiêu chính:

- **Bảo vệ hệ thống** khỏi overload (spikes, retry storms, scraping).
- **Ngăn abuse**: brute-force login, credential stuffing, enumeration.
- **Công bằng tài nguyên** giữa users/tenants.
- **Bảo vệ downstream**: DB, cache, external APIs.
- **Hỗ trợ model kinh doanh**: quota theo gói (free/pro).

Rate limiting thường đi kèm:

- throttling / shaping
- quota management
- WAF/bot mitigation
- circuit breakers và backpressure

---

## 2) Rate limiting đặt ở đâu?

Bạn có thể limit ở nhiều tầng (và thường nên kết hợp):

### 2.1 Edge/CDN/WAF

- Tốt để chặn volumetric abuse sớm.
- Có thể limit theo IP/geo/bot score.

### 2.2 API gateway / Load balancer (L7)

- Phù hợp limit theo route, API key, JWT claims.
- Dễ áp policy tập trung.

### 2.3 Application (service)

- Cần khi policy phụ thuộc logic nghiệp vụ, hoặc limit theo tenant/user context sâu.

### 2.4 Downstream-specific

- Rate limit theo dependency (DB pool, external provider) để tránh “một endpoint làm sập tất cả”.

Nguyên tắc thực chiến:

- Chặn càng sớm càng tốt (edge) để giảm chi phí.
- Nhưng vẫn cần limit ở app tier cho các policy theo user/tenant.

---

## 3) Thiết kế policy rate limiting

### 3.1 Chọn “đối tượng” để limit

- **IP**: dễ nhưng NAT/proxy làm nhiều user chung IP.
- **User ID**: tốt sau khi auth.
- **API key / client id**: hợp cho public APIs.
- **Tenant ID**: bắt buộc trong multi-tenant SaaS.
- **Device/session**: tuỳ sản phẩm.

Thực hành tốt:

- Kết hợp nhiều key: ví dụ limit theo tenant + theo user + theo IP.

### 3.2 Chọn “đơn vị” để đo

- Request count (req/min)
- “Cost-based”: mỗi endpoint có cost khác nhau (vd: search = 5 units, read = 1 unit)
- Payload size hoặc compute time (hiếm hơn)

### 3.3 Per-route/per-endpoint

- Login/reset password nên limit chặt.
- Read-only public endpoints có thể limit nhẹ.
- Admin endpoints limit chặt theo role/tenant.

### 3.4 Burst vs sustained

- Cho phép burst ngắn nhưng giới hạn tốc độ trung bình.
- Token bucket phù hợp.

---

## 4) Thuật toán rate limiting phổ biến

### 4.1 Fixed window

- Đếm số request trong mỗi window (vd: mỗi phút).

Ưu:

- Dễ triển khai
  Nhược:
- “Boundary burst”: user có thể gửi nhiều request ngay trước và sau ranh giới window.

### 4.2 Sliding window log

- Lưu timestamp từng request (list/zset) và đếm trong cửa sổ trượt.

Ưu:

- Chính xác
  Nhược:
- Tốn memory/CPU ở traffic lớn

### 4.3 Sliding window counter (approx)

- Kết hợp 2 buckets liền kề, nội suy.

Ưu:

- Nhẹ hơn log
  Nhược:
- Xấp xỉ

### 4.4 Token bucket

- Có “xô” chứa token, refill theo rate.
- Mỗi request tiêu 1 token (hoặc cost units).

Ưu:

- Cho burst trong giới hạn
- Phổ biến, hiệu quả

### 4.5 Leaky bucket

- “Rò” đều đặn, làm mượt traffic.

Ưu:

- Shaping tốt
  Nhược:
- Có thể tăng latency (queue)

---

## 5) Triển khai rate limiting trong hệ thống phân tán

Với nhiều instance, rate limiting phải **nhất quán**.

### 5.1 In-memory per instance (không khuyến nghị cho policy nghiêm)

- Đơn giản nhưng:
  - tổng limit bị nhân lên theo số instance
  - không ổn định khi autoscale

### 5.2 Centralized store (Redis) — phổ biến

- Lưu counters/tokens trong Redis.
- Dùng atomic ops (INCR/EXPIRE) hoặc Lua scripts.

Thực hành tốt:

- Mọi update phải atomic (đặc biệt token bucket/sliding window).
- Key có TTL để tự dọn.
- Thêm jitter để tránh avalanche.

### 5.3 Sharding / Redis Cluster

- Traffic lớn cần cluster.
- Cẩn thận hot keys.

### 5.4 Local cache + periodic sync

- Dùng cho policy “mềm” để giảm Redis load.
- Cần chấp nhận sai số.

---

## 6) Redis patterns cho rate limiting

### 6.1 Fixed window với INCR

Key: `rl:{client}:{route}:{windowStart}`

- `INCR` để tăng
- `EXPIRE` theo window

### 6.2 Sliding window (ZSET)

Key: `rl:z:{client}:{route}`

- `ZADD now`
- `ZREMRANGEBYSCORE` để dọn cũ
- `ZCOUNT` để đếm

### 6.3 Token bucket (Lua)

- Lua script đảm bảo update token + timestamp atomically.
- Hỗ trợ cost-based.

Lưu ý hiệu năng:

- ZSET sliding log chính xác nhưng nặng.
- Token bucket Lua thường là cân bằng tốt.

---

## 7) 429 Too Many Requests và API contract

### 7.1 Trả về status code

- Nếu bị limit: trả **429**.

### 7.2 Headers khuyến nghị

- `Retry-After`: client nên chờ bao lâu.
- (Tuỳ chuẩn) các header kiểu:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

Nếu API public, headers giúp client tự điều tiết và giảm traffic lặp.

### 7.3 Response body

- Trả JSON rõ ràng:
  - error code
  - message
  - retry_after_seconds

### 7.4 Client behavior

- Client phải:
  - backoff + jitter
  - tôn trọng Retry-After
- Không auto-retry vô hạn (tạo self-DDoS).

---

## 8) Rate limiting cho auth endpoints

Đây là vùng nhạy cảm:

- `/login`: limit theo IP + theo username/email (để chống credential stuffing).
- `/otp/verify`: limit chặt.
- `/password/reset`: limit theo IP + theo account.

Kết hợp thêm:

- captcha/challenge
- device fingerprinting (cẩn thận privacy)
- anomaly detection

---

## 9) Rate limiting cho multi-tenant SaaS

### 9.1 Tenant quotas

- Mỗi tenant có quota theo plan.
- Có thể chia:
  - global quota/tenant
  - quota theo feature/endpoint

### 9.2 Fairness trong tenant

- Ngăn “một user làm cạn quota cả tenant” bằng sub-limits per user.

### 9.3 Burst allowances

- Cho burst ngắn (token bucket) để UX tốt.

---

## 10) Kết hợp với bảo vệ hệ thống

Rate limiting tốt thường đi cùng:

- **Timeouts** rõ ràng
- **Circuit breaker** khi downstream lỗi
- **Queue/backpressure** cho tác vụ async
- **Caching** cho endpoints read-heavy

Tránh anti-pattern:

- Rate limit không thay thế việc tối ưu DB/query hoặc sửa bug retry.

---

## 11) Observability cho rate limiting

### 11.1 Metrics

- `rate_limit.allowed` / `rate_limit.blocked`
- Blocked rate theo route/client/tenant (cẩn thận cardinality)
- Redis latency/error (nếu dùng Redis)
- Top offenders (dùng sampling/aggregation)

### 11.2 Logs

- Log sự kiện 429 theo cách tổng hợp (tránh log spam).
- Include correlation id/trace id.

### 11.3 Alerts

- Spikes 429 (có thể là abuse hoặc bug client)
- Redis errors/latency cao
- False positives (khách hàng than bị limit)

---

## 12) Security & privacy

- Không log tokens/Authorization headers.
- Nếu limit theo IP, cẩn thận X-Forwarded-For spoof: chỉ tin IP từ proxy/LB tin cậy.
- Không lưu PII trong keys nếu không cần (dùng hash/opaque IDs).

---

## 13) Checklist rate limiting production-ready

### Policy

- [ ] Xác định đối tượng limit (IP/user/tenant/api-key)
- [ ] Per-route policies, đặc biệt auth endpoints
- [ ] Burst vs sustained rõ ràng (token bucket nếu cần)
- [ ] Cost-based units cho endpoints nặng (tuỳ)

### Implementation

- [ ] Atomic updates (Lua/transactions) nếu distributed
- [ ] Keys có TTL
- [ ] Redis cluster/sentinel theo yêu cầu HA
- [ ] Fail-open/closed được quyết định rõ:
  - Fail-open (thường) để tránh outage nếu Redis down
  - Fail-closed cho endpoints nhạy cảm (cân nhắc UX)

### API contract

- [ ] Trả 429 + `Retry-After`
- [ ] Client backoff+jitter

### Observability

- [ ] Dashboard allowed/blocked + top routes
- [ ] Alert spikes 429 và Redis latency/errors

---

## 14) Anti-patterns

- **Limit theo IP duy nhất** trong môi trường NAT → chặn nhầm nhiều user.
- **Không tin cậy nguồn IP** (XFF spoof) → bypass hoặc block sai.
- **Không có headers Retry-After** → client spam retry.
- **Rate limit không phân biệt endpoint** → UX tệ cho actions quan trọng.
- **Keys không TTL** → memory leak trong Redis.
- **Log mỗi lần 429** → log volume bùng nổ.
- **Retry không kiểm soát** khi bị 429 → self-DDoS.
