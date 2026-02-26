# Canary Deployment trong lập trình web (tất tần tật, thực chiến)

## 1) Canary deployment là gì?

**Canary deployment** là chiến lược rollout phiên bản mới bằng cách:

- triển khai version mới cho **một phần nhỏ traffic** (canary)
- quan sát metrics/logs/business KPIs
- nếu ổn, tăng dần tỷ lệ traffic (progressive rollout)
- nếu lỗi, rollback nhanh (giảm tỷ lệ về 0% hoặc quay về version cũ)

Tên “canary” đến từ việc “thả chim hoàng yến” trong mỏ để phát hiện khí độc sớm.

Mục tiêu:

- Giảm rủi ro release
- Phát hiện lỗi sớm với blast radius nhỏ
- Rollout có kiểm soát dựa trên SLO

## 2) Canary phù hợp khi nào?

Phù hợp khi:

- Bạn có observability tốt để phát hiện regression nhanh
- Bạn muốn rollout an toàn trong hệ nhiều user
- Bạn có thể split traffic (LB/Ingress/Service Mesh)

Cần cân nhắc khi:

- Dữ liệu/DB migration phá vỡ backward compatibility
- Bạn không có metrics đủ tốt (canary “mù”)
- Hệ có stateful sessions hoặc long-lived connections khó route ổn định

## 3) So sánh Canary vs Blue–Green

- Canary: tăng dần % traffic, quan sát liên tục
- Blue–Green: chuẩn bị môi trường mới và switch traffic “một lần”

Trade-off:

- Canary giảm rủi ro hơn cho bug hiếm gặp, nhưng rollout lâu hơn.
- Blue–Green rollback rất nhanh, nhưng cutover có thể “shock” nếu lỗi.

## 4) Các kiểu canary phổ biến

### 4.1 Percentage-based canary (chia % traffic)

Ví dụ schedule:

- 1% → 5% → 20% → 50% → 100%

Mỗi bước giữ 5–30 phút (tuỳ hệ) để quan sát.

### 4.2 Header/Query-based canary

- Route vào canary nếu request có header `X-Canary: true`.
- Dùng cho internal testing, QA, hoặc “dogfooding”.

### 4.3 User cohort canary (theo nhóm người dùng)

- Route canary theo userId hash (sticky cohort).
- Giúp tránh user “nhảy qua lại” giữa versions.

### 4.4 Region-based canary

- Rollout theo region (SG → EU → US).
- Dễ kiểm soát, nhưng phải cân nhắc chênh lệch traffic.

## 5) Traffic splitting triển khai bằng gì?

### 5.1 Load balancer / reverse proxy

- NGINX/HAProxy/Envoy/ALB… hỗ trợ weighted routing.

### 5.2 Kubernetes

Một số cách:

- 2 Deployments (stable + canary) + Service routing (thường cần Ingress/controller hỗ trợ weight)
- Dùng progressive delivery tool (Argo Rollouts/Flagger)

### 5.3 Service Mesh (Istio/Linkerd)

- Weighted routing ở tầng service-to-service.
- Có thể route theo header/user.

### 5.4 API Gateway

- Weighted route theo path/service.

## 6) Quy trình Canary rollout (flow chuẩn)

1. Deploy canary version (song song stable)
2. Route 1% traffic vào canary
3. Chạy automated checks + quan sát SLO
4. Tăng dần traffic theo step
5. Nếu đạt 100% → promote canary thành stable
6. Nếu fail → rollback (0% canary) và điều tra

## 7) Điều kiện “pass/fail” dựa trên SLO

Canary chỉ hiệu quả nếu bạn có “gates” rõ.

### 7.1 Metrics kỹ thuật

- Error rate (5xx, exceptions)
- p95/p99 latency
- saturation: CPU/memory/DB connections

### 7.2 Business metrics

- checkout success rate
- payment failure
- sign-up conversion

### 7.3 So sánh canary vs baseline

Thông thường bạn so:

- canary metrics vs stable metrics cùng thời điểm

Vì traffic patterns thay đổi theo giờ.

## 8) Monitoring, logs, tracing theo release

Để debug nhanh:

- Gắn `release_version` vào logs
- Tracing: tag spans theo version
- Dashboard split theo version (stable/canary)

Nếu không, bạn sẽ không biết lỗi đến từ version nào.

## 9) Canary và stateful concerns

### 9.1 Sticky sessions

Nếu app dùng session cookie và state nằm in-memory, canary sẽ gây lỗi.

Best practices:

- Session store shared (Redis) hoặc stateless tokens.

### 9.2 WebSocket / long-lived connections

- Weighted routing thường áp dụng cho request mới.
- Connection cũ có thể giữ ở stable.

Chiến lược:

- Canary riêng cho gateway WebSocket
- Draining + reconnect
- Cohort routing cho client

### 9.3 Background jobs

- Tránh chạy đôi job không idempotent.
- Canary nên disable worker hoặc tách worker rollout riêng.

## 10) Database migrations và compatibility

Trong canary, stable và canary cùng truy cập DB.

=> DB schema phải **backward compatible**.

Chiến lược “expand/contract”:

1. Add schema mới (nullable)
2. Deploy canary code dùng schema mới (có fallback)
3. Backfill
4. Promote
5. Xoá schema cũ ở release sau

Tránh:

- Drop/rename column ngay trong rollout

## 11) Feature flags và canary

Canary deployment và feature flags khác nhau:

- Canary: rollout theo **version**
- Feature flag: bật/tắt **tính năng** tại runtime

Kết hợp tốt:

- Dùng canary để ship code an toàn
- Dùng feature flag để bật behavior dần theo cohort

## 12) Automation: Progressive delivery tools

Nếu làm bằng tay sẽ mệt và dễ sai.

Các tool hay dùng:

- Argo Rollouts
- Flagger
- Spinnaker (tùy org)

Khả năng:

- tự tăng traffic theo step
- tự rollback nếu metrics xấu
- tích hợp Prometheus/Grafana

## 13) Testing trong canary

Ngoài metrics, nên có:

- smoke tests (endpoint sống)
- synthetic monitoring (kịch bản user)
- contract tests (API compatibility)

## 14) Anti-patterns (lỗi hay gặp)

- Không có SLO gates rõ → canary chỉ là “đổi % cho vui”
- Observability yếu → lỗi xảy ra nhưng không phát hiện
- Canary quá nhỏ (0.01%) nên không đủ signal
- Canary quá nhanh (1% → 100% trong 1 phút) → không kịp quan sát
- DB migration không backward compatible
- User “nhảy phiên bản” gây trải nghiệm lỗi (thiếu cohort stickiness)

## 15) Checklist production (tóm tắt)

- Có cơ chế split traffic (LB/Ingress/mesh) và có thể rollback nhanh
- Canary steps rõ ràng + thời gian quan sát đủ
- SLO gates: error rate, latency, saturation + business KPIs
- Tag logs/traces theo release
- DB migrations backward compatible
- Xử lý session/WebSocket/worker đúng cách
- Automation progressive delivery nếu rollout thường xuyên

---

Nếu bạn muốn, mình có thể bổ sung phần “Canary trên Kubernetes” (Argo Rollouts/Flagger) và một mẫu bảng SLO gates (ngưỡng cụ thể) cho web API.
