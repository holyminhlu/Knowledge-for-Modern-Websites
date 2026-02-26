---
title: CDN (Content Delivery Network)
description: Handbook thực chiến về CDN trong lập trình web: caching, HTTP headers, invalidation, origin design, tối ưu hiệu năng, bảo mật (TLS/WAF/DDoS), edge compute, và vận hành production.
---

# CDN trong lập trình web

## 1) CDN là gì? Giải quyết vấn đề gì?

**CDN (Content Delivery Network)** là mạng lưới các máy chủ phân tán theo địa lý (PoPs/edge locations) dùng để **phân phối nội dung** (assets, media, HTML, API responses...) đến người dùng với độ trễ thấp và khả năng chịu tải cao.

CDN thường giúp:

- **Giảm latency**: nội dung được phục vụ từ edge gần user.
- **Giảm tải origin**: cache hits giảm số request về server gốc.
- **Tăng availability**: nếu origin chậm/đứt, CDN có thể serve cached/stale.
- **Bảo mật**: TLS termination, WAF, DDoS protection, bot mitigation.

CDN không chỉ dành cho ảnh/video; CDN là một phần quan trọng của kiến trúc web hiện đại (static hosting, SSR caching, API acceleration, edge compute).

---

## 2) Kiến trúc cơ bản

### 2.1 Các thành phần

- **Client (browser/app)** → gửi request.
- **Edge/PoP** → nhận request, kiểm tra cache, có thể trả ngay.
- **Origin** → server gốc (S3/static host, Nginx, app server, API gateway...)

### 2.2 Cache hit / miss

- **Hit**: edge có bản cached hợp lệ → trả ngay.
- **Miss**: edge không có hoặc hết hạn → request về origin, cache lại (tuỳ policy).

### 2.3 TTL

- TTL (time-to-live) quyết định “bản cache sống bao lâu”.
- TTL đến từ headers (Cache-Control/Expires) hoặc cấu hình CDN.

---

## 3) CDN cache hoạt động như thế nào?

### 3.1 Cache key

Cache key thường gồm:

- URL (path)
- Query string (tuỳ cấu hình)
- Host header
- Một số headers (Accept-Encoding, Accept-Language) nếu bạn đưa vào Vary

Sai lầm phổ biến:

- Đưa quá nhiều headers vào cache key → hit rate thấp.
- Không đưa header cần thiết → serve nhầm biến thể.

### 3.2 Vary

Header `Vary` cho biết response phụ thuộc vào header nào.

- Ví dụ: `Vary: Accept-Encoding` cho gzip/brotli.
- Cẩn thận với `Vary: User-Agent` vì làm bể cache.

### 3.3 Range requests

CDN thường hỗ trợ `Range` cho video/audio (partial content).
Nếu bạn phục vụ file lớn, kiểm tra:

- origin hỗ trợ range
- CDN caching cho range

---

## 4) HTTP caching headers (phần quan trọng nhất)

### 4.1 Cache-Control

Các directive hay dùng:

- `public`: có thể cache ở CDN/proxy.
- `private`: chỉ cache ở browser, không cache ở shared cache.
- `max-age=<seconds>`: TTL cho browser.
- `s-maxage=<seconds>`: TTL cho shared caches (CDN) — rất hữu ích.
- `stale-while-revalidate=<seconds>`: cho phép trả stale trong khi refresh nền.
- `stale-if-error=<seconds>`: cho phép trả stale khi origin lỗi.
- `no-store`: không lưu cache.
- `no-cache`: vẫn có thể lưu nhưng phải revalidate.

### 4.2 ETag và If-None-Match

- ETag dùng để revalidate.
- CDN có thể dùng ETag để giảm băng thông origin (304 Not Modified).

### 4.3 Last-Modified và If-Modified-Since

- Revalidation dựa trên timestamp.

### 4.4 Expires

- Cũ hơn, bị Cache-Control override.

### 4.5 Quy tắc thực chiến cho static assets

- Với file có version trong tên (hash):
  - `Cache-Control: public, max-age=31536000, immutable`
- Với HTML (thường thay đổi):
  - TTL ngắn hoặc `no-cache` + revalidate

---

## 5) Cache invalidation: purge, versioning, và chiến lược đúng

### 5.1 Versioning (khuyến nghị)

- Dùng filename hashing: `app.3f2a1c.js`, `styles.91ab.css`.
- Khi nội dung đổi → file name đổi → không cần purge.

### 5.2 Purge/invalidation

- Dùng khi không thể versioning (ví dụ HTML cached, API cached).
- Lưu ý:
  - Purge có độ trễ (propagation)
  - Purge nhiều đường dẫn có thể tốn chi phí

### 5.3 Surrogate keys / tags

- Một số CDN hỗ trợ purge theo tag/keys (rất hợp cho CMS/content).

### 5.4 Stale strategies

- `stale-while-revalidate` và `stale-if-error` giúp tránh “thundering herd”.

---

## 6) CDN cho HTML và SSR

### 6.1 Cache HTML có an toàn không?

Có, nếu:

- Trang public (không cá nhân hoá theo user)
- Cache key không phụ thuộc cookies/headers nhạy cảm

Không an toàn nếu:

- HTML chứa dữ liệu cá nhân hoá (profile, cart)
- Cache key không tách theo user/tenant

### 6.2 Micro-caching

- Cache HTML vài giây (1–10s) ở CDN hoặc reverse proxy.
- Giảm tải origin đáng kể cho traffic cao.

### 6.3 Edge Side Includes (ESI) (khái niệm)

- Ghép trang từ các “fragments” có TTL khác nhau.
- Phức tạp, cần cân nhắc.

---

## 7) CDN cho API (API acceleration)

CDN có thể:

- Terminate TLS gần user
- HTTP/2/HTTP/3 tối ưu
- Cache một số GET responses (public)
- Rate limit/WAF

Nhưng cần cẩn trọng:

- API có auth/cookies: tránh cache response riêng tư.
- CORS và headers
- Idempotency cho retries

Thực hành tốt:

- Chỉ cache API response khi:
  - public hoặc theo key rõ ràng
  - TTL ngắn
  - có revalidate

---

## 8) Origin design: làm sao để CDN hiệu quả

### 8.1 Origin shielding

- Dùng “shield” region để giảm load origin khi nhiều PoP miss đồng thời.

### 8.2 Keep origin simple

- Static assets: origin là object storage (S3/GCS) + bucket policy.
- Dynamic: origin là load balancer/app.

### 8.3 Compression

- Brotli/gzip cho text assets.
- Có thể làm tại edge (tuỳ CDN) hoặc origin.

### 8.4 Image optimization

- Resize/convert format (WebP/AVIF) ở edge nếu có.
- Cẩn thận cache key theo `Accept` và params.

---

## 9) TLS, HTTP/2, HTTP/3

- CDN thường hỗ trợ TLS termination.
- HTTP/2 giúp multiplexing, giảm head-of-line blocking.
- HTTP/3 (QUIC) có lợi trên mạng mobile/lossy.

Thực hành tốt:

- Bật HSTS (cẩn thận preload).
- Tối ưu cipher suites theo khuyến nghị hiện đại.

---

## 10) Bảo mật với CDN

### 10.1 DDoS protection

- CDN absorb volumetric attacks.
- Cấu hình rate limiting, bot protection.

### 10.2 WAF

- Rule sets chống OWASP Top 10.
- Tuning để giảm false positives.

### 10.3 Origin protection

- Chỉ cho phép traffic đến origin từ CDN (IP allowlist, mTLS, signed requests).
- Tránh attacker bypass CDN và đánh thẳng origin.

### 10.4 Signed URLs / Signed cookies

- Bảo vệ nội dung trả phí (video, downloads).
- TTL ngắn + rotate keys.

### 10.5 Security headers

- CDN có thể inject/normalize headers:
  - CSP, X-Content-Type-Options, Referrer-Policy...
- Nhưng nên quản trị như code/config có review.

---

## 11) Edge compute (Workers/Functions at edge)

CDN hiện đại thường có “compute at edge” để:

- Rewrite/redirect
- A/B routing
- Auth checks đơn giản
- Personalization nhẹ (không truy cập DB trực tiếp)

Giới hạn thường gặp:

- Runtime APIs hạn chế
- Timeouts
- Cold starts (tuỳ nền tảng)
- Debugging khó hơn

Nguyên tắc:

- Edge compute tốt cho logic “gần user, nhẹ, stateless”.

---

## 12) Observability cho CDN

Nên theo dõi:

- Cache hit ratio
- Bandwidth egress
- Origin fetch rate
- Latency (edge vs origin)
- Error rates (4xx/5xx), WAF blocks
- Top paths, top countries

Thực hành tốt:

- Có dashboard theo:
  - hit ratio theo path group
  - origin errors
  - purge/invalidation events

---

## 13) Quy trình triển khai CDN cho web app

1. Chọn nội dung cache (assets trước)
2. Chuẩn hoá headers (Cache-Control, ETag)
3. Bật compression
4. Thiết lập purge/versioning pipeline
5. Bật WAF/rate limit ở mức cơ bản
6. Protect origin khỏi bypass
7. Theo dõi hit ratio và tối ưu cache key

---

## 14) Checklist CDN production-ready

### Caching

- [ ] Static assets dùng filename hashing + `immutable`
- [ ] HTML/API caching có rule rõ (public/private)
- [ ] Cache key tối ưu (không phụ thuộc headers/cookies thừa)
- [ ] Có `stale-while-revalidate`/`stale-if-error` khi phù hợp

### Invalidation

- [ ] Ưu tiên versioning hơn purge
- [ ] Nếu purge: có automation và giới hạn phạm vi

### Origin

- [ ] Origin shielding (nếu traffic lớn)
- [ ] Protect origin khỏi bypass (allowlist/mTLS/signed)

### Security

- [ ] TLS/HSTS cấu hình đúng
- [ ] WAF + rate limit baseline
- [ ] Signed URLs/cookies cho nội dung private

### Observability

- [ ] Dashboard hit ratio, origin fetch, error rate
- [ ] Log/audit cho config changes và purge events

---

## 15) Anti-patterns

- **Cache nhầm nội dung cá nhân hoá** → leak dữ liệu user.
- **Dùng purge thay vì versioning cho assets** → chậm, tốn kém, dễ lỗi.
- **Cache key quá phức tạp** → hit ratio thấp, CDN không hiệu quả.
- **Không bảo vệ origin** → attacker bypass CDN.
- **Bật WAF nhưng không tune** → false positives làm gián đoạn.
- **Không theo dõi hit ratio** → không biết CDN có giúp hay không.
