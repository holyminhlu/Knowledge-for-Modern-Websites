# Blue–Green Deployment trong lập trình web (tất tần tật, thực chiến)

## 1) Blue–Green Deployment là gì?

**Blue–Green deployment** là chiến lược triển khai trong đó bạn duy trì **hai môi trường production giống hệt nhau**:

- **Blue**: phiên bản đang phục vụ người dùng (live)
- **Green**: phiên bản mới (idle) được deploy và kiểm thử sẵn

Khi sẵn sàng, bạn **switch traffic** từ Blue sang Green (cutover). Nếu có lỗi, bạn có thể **rollback nhanh** bằng cách switch ngược lại.

Mục tiêu:

- Giảm downtime gần như 0
- Rollback nhanh
- Giảm rủi ro triển khai so với “in-place upgrade”

## 2) Blue–Green phù hợp khi nào?

Phù hợp khi:

- Bạn muốn rollback cực nhanh (1 thao tác switch)
- Bạn có thể chạy song song 2 môi trường
- Hệ có release theo “bước nhảy” rõ ràng

Cần cân nhắc khi:

- DB migration không backward compatible
- Hệ có stateful connections lâu (WebSocket) khó cutover êm
- Chi phí chạy 2 môi trường là vấn đề

## 3) So sánh Blue–Green vs Canary

- **Blue–Green**: switch gần như “100% ngay lập tức” (hoặc switch theo môi trường)
- **Canary**: tăng dần % traffic (1% → 10% → 50% → 100%), quan sát metrics

Thực tế:

- Có thể kết hợp: làm “mini-canary” trên Green (internal users) trước khi cutover.

## 4) Traffic switching: chuyển traffic bằng cách nào?

### 4.1 Load Balancer / Reverse Proxy

- NGINX/HAProxy/Envoy/ALB/NLB…
- Thay upstream từ Blue sang Green

Ưu:

- Switch nhanh
- Có thể health check

### 4.2 Kubernetes Service/Ingress

Các pattern phổ biến:

- 2 Deployment (blue/green) + 1 Service selector đổi label
- 2 Services (svc-blue, svc-green) + Ingress route đổi backend

### 4.3 DNS switch

- Đổi DNS record trỏ sang Green.

Nhược:

- DNS cache/TTL khiến switch không “ngay lập tức” với mọi user.

Khuyến nghị:

- Ưu tiên LB/Ingress switch hơn DNS.

## 5) Quy trình triển khai Blue–Green (flow chuẩn)

1. Deploy version mới lên **Green**
2. Run smoke tests/health checks trên Green
3. (Tuỳ chọn) chạy integration tests, synthetic monitoring
4. Warm-up caches (tuỳ hệ)
5. Cutover: switch traffic từ Blue → Green
6. Monitor chặt metrics
7. Nếu ổn định: giữ Blue một thời gian rồi teardown hoặc biến Blue thành standby

## 6) Health checks và “readiness”

Trước khi cutover, Green phải đạt:

- readiness probe OK (DB connectivity, dependencies OK)
- liveness OK
- ứng dụng có thể xử lý request thực

Nên có:

- endpoint `/healthz` (liveness)
- endpoint `/readyz` (readiness)

## 7) Stateful concerns: sessions, WebSocket, background jobs

### 7.1 User sessions

Nếu session lưu trong memory của app, cutover sẽ làm user logout.

Best practices:

- Session lưu ở shared store (Redis) hoặc dùng stateless tokens

### 7.2 WebSocket / long-lived connections

Khi cutover:

- Connection hiện tại vẫn đang nằm ở Blue.
- Nếu bạn switch LB, connection cũ có thể bị drop.

Giải pháp:

- Graceful draining: stop accept connection mới ở Blue, giữ connection cũ đến khi tự đóng
- Thông báo client reconnect (tùy protocol)

### 7.3 Background workers / schedulers

Nếu bạn có worker chạy job:

- Tránh để Blue và Green cùng chạy job “không idempotent” dẫn đến chạy đôi.

Chiến lược:

- Tách worker khỏi web tier
- Hoặc chỉ enable worker ở 1 môi trường
- Dùng leader election cho scheduler

## 8) Database migration: điểm rủi ro lớn nhất

Blue–Green dễ cho app stateless, nhưng DB thường là shared.

### 8.1 Nguyên tắc vàng: Backward compatible migrations

Trong cutover, có khoảng thời gian:

- Blue (old) và Green (new) có thể cùng chạy

=> DB schema phải tương thích với cả 2.

Chiến lược migration an toàn (expand/contract):

1. **Expand**: thêm cột/tables mới (nullable), không xoá/cắt cột cũ
2. Deploy Green ghi cả cũ/mới hoặc chỉ ghi mới (tuỳ)
3. Backfill dữ liệu
4. Switch read sang schema mới
5. **Contract**: xoá cột cũ ở release sau

### 8.2 Feature flags cho migration

- Feature flag giúp tách “deploy code” và “activate behavior”.
- Rất hữu ích khi rollout schema changes.

### 8.3 Rollback và DB

Rollback code (switch về Blue) là dễ.
Rollback DB schema là khó.

Vì vậy:

- Hạn chế migration phá vỡ backward compatibility.
- Ưu tiên forward-fix hơn rollback DB.

## 9) Các thành phần khác: cache, search, message broker

### 9.1 Cache (Redis)

- Cutover có thể làm cache key format thay đổi.

Best practices:

- Version cache keys: `v1:...`, `v2:...`
- Hoặc flush cache có kiểm soát (nếu chấp nhận)

### 9.2 Search index

- Nếu mapping đổi, cần reindex theo alias strategy.

### 9.3 Message broker / consumers

- Tránh chạy đôi consumers với side-effect không idempotent.
- Event schema changes cần backward compatible.

## 10) Monitoring và tiêu chí quyết định rollback

### 10.1 Metrics nên theo dõi khi cutover

- Error rate (5xx, exceptions)
- p95 latency
- Saturation: CPU/memory/DB connections
- Business metrics: checkout success, payment failures

### 10.2 SLO-based rollout

- Nếu error rate vượt ngưỡng trong N phút → rollback.

### 10.3 Log & tracing

- Gắn release version vào logs/traces.
- Compare Blue vs Green nhanh.

## 11) Quy trình rollback

Rollback trong Blue–Green:

- Switch traffic về Blue
- Giữ Green để debug

Lưu ý:

- Nếu Green đã ghi dữ liệu mới (schema/data), Blue phải vẫn đọc được (backward compatible).

## 12) Chi phí và quản trị hạ tầng

- Blue–Green thường tốn gần gấp đôi compute trong thời gian deploy.
- Cần automation:
  - provision Green
  - run tests
  - cutover
  - teardown

## 13) Anti-patterns (lỗi hay gặp)

- DB migration phá vỡ schema → rollback code không cứu được
- Không có readiness đúng, cutover khi Green chưa warm-up
- Quên xử lý session sticky/stateful components
- Worker chạy đôi gây double charge/double email
- Không có “rollback criteria” rõ ràng → chần chừ khi lỗi
- Dùng DNS switch và kỳ vọng rollback tức thì

## 14) Checklist production (tóm tắt)

- Hai môi trường Blue/Green giống nhau (config, secrets, dependencies)
- Health checks rõ ràng (`readyz`, `healthz`)
- DB migrations backward compatible (expand/contract)
- Session không nằm in-memory; worker/scheduler có chiến lược tránh chạy đôi
- Cache/search/message schema changes có versioning
- Monitoring + alert + rollback criteria
- Cutover automation (CI/CD)

---

Nếu bạn muốn, mình có thể bổ sung thêm một mục “Blue–Green trên Kubernetes” (cấu hình labels/service selector, draining, preStop hooks) và ví dụ pipeline CI/CD (build → deploy green → test → switch).
