---
title: Feature Flags (Feature Toggles)
description: Handbook thực chiến về feature flags trong hệ thống web: rollout an toàn, targeting, kill-switch, A/B testing, kiến trúc, vận hành, và anti-patterns.
---

# Feature Flags trong lập trình web

## 1) Feature flag là gì?

**Feature flag** (feature toggle) là cơ chế bật/tắt hoặc điều khiển hành vi tính năng **tại runtime** mà không cần redeploy ứng dụng.

Mục tiêu:

- **Giảm rủi ro release**: tách “deploy code” khỏi “release feature”.
- **Progressive delivery**: rollout dần theo %, theo nhóm, theo khu vực.
- **Kill switch**: tắt nhanh khi có sự cố.
- **Experimentation**: A/B testing, đo lường tác động.

Một câu nhớ nhanh:

- CI/CD giúp bạn _deploy thường xuyên_.
- Feature flags giúp bạn _release an toàn_.

---

## 2) Khi nào nên dùng feature flags?

### Use cases phổ biến

- Rollout tính năng mới theo **% traffic** (canary tại tầng app).
- Bật tính năng cho **beta users / internal users**.
- Tắt khẩn cấp tính năng gây lỗi (kill switch).
- “Dark launch”: deploy code nhưng không lộ UI/behavior cho người dùng.
- A/B test (experiment) + phân tích kết quả.
- Chuyển nhà cung cấp (payment provider, search engine, recommendation model).
- Chế độ “degraded” khi downstream chậm (feature flag làm circuit breaker logic).

### Khi không nên

- Dùng làm permission system thay RBAC/ABAC (trừ khi flag là một lớp rollout tạm thời).
- Dùng để “giấu nợ kỹ thuật” lâu dài: code branch chồng chéo không dọn.

---

## 3) Phân loại feature flags (rất quan trọng)

### 3.1 Release flags (rollout)

- Dùng để rollout tính năng.
- Thường **ngắn hạn** (tồn tại đến khi rollout xong).

### 3.2 Ops flags (operational)

- Dùng để bật/tắt behavior vận hành (giảm tải, tắt tính năng nặng, switch fallback).
- Có thể **dài hạn**.

### 3.3 Experiment flags (A/B testing)

- Gắn với giả thuyết và metrics.
- Cần **sticky assignment** và phân tích thống kê.

### 3.4 Permission/Entitlement flags

- Phân quyền theo gói (free/pro/enterprise) hoặc tenant.
- Nên quản trị như “product entitlements”, tránh trộn lẫn với release flags.

Gợi ý thực hành: phân loại flag ngay từ lúc tạo để áp lifecycle, quyền truy cập, và yêu cầu đo lường phù hợp.

---

## 4) Chiến lược rollout & targeting

### 4.1 Percentage rollout

- Ví dụ: 1% → 5% → 25% → 50% → 100%.
- Cần gating bởi SLO/metrics (error rate, latency, conversion…).

### 4.2 Target theo nhóm (cohort)

- Internal, beta, paid plan, theo tenant, theo region, theo device.

### 4.3 Target theo thuộc tính (attributes)

- `userId`, `tenantId`, `country`, `appVersion`, `role`...
- Cẩn thận privacy/PII.

### 4.4 Kill switch

- Một flag dạng “OFF ngay lập tức” để giảm blast radius.
- Nên ưu tiên đường truyền nhanh (cache + polling/stream) và có runbook.

### 4.5 Sticky vs non-sticky

- **Sticky assignment**: user thấy trải nghiệm nhất quán giữa các lần truy cập (cần cho A/B).
- **Non-sticky**: phù hợp kill switch/ops flag.

---

## 5) Kiến trúc hệ thống feature flags

### 5.1 Các thành phần

- **Flag store / Control plane**: nơi quản trị flag (UI/API), policy, audit.
- **Data plane / SDK**: client trong app lấy quyết định bật/tắt.
- **Distribution**: cách cập nhật flags đến services (polling, streaming, push).

### 5.2 Control plane vs Data plane

- Control plane có thể chậm hơn (UI, audit), nhưng data plane phải **nhanh và ổn định**.
- Luôn thiết kế để **dịch vụ vẫn chạy** nếu control plane gặp sự cố.

### 5.3 Fetch & cache model

- App lấy **snapshot** flags và cache in-memory.
- Cập nhật qua:
  - Polling (ví dụ mỗi 30–60s)
  - Streaming (SSE/WebSocket) nếu cần phản ứng nhanh

### 5.4 Offline / fail-open vs fail-closed

- **Fail-open**: khi flag service lỗi, giữ nguyên cached hoặc default ON/OFF để tránh outage.
- **Fail-closed**: phù hợp cho security-sensitive toggles nhưng có thể làm gián đoạn.

Thực hành tốt: quyết định fail-open/closed theo _loại flag_ (ops/release/experiment/security).

---

## 6) Data model gợi ý cho flags

Một flag thường gồm:

- `key`: tên duy nhất (vd: `checkout_new_ui`)
- `type`: release/ops/experiment/entitlement
- `enabled`: on/off tổng
- `defaultVariation`: `on`/`off` hoặc variant `A/B/...`
- `rules`: danh sách điều kiện → variation
- `rollout`: % theo bucket
- `salt`: dùng cho hashing ổn định
- `dependencies`: phụ thuộc flag khác (tránh nếu không cần)
- `owner`, `createdAt`, `expiresAt`, `ticketLink`

Nếu có A/B test:

- `variations`: `A`, `B`, …
- `allocation`: phân bổ % cho mỗi variation
- `experimentId`

---

## 7) Quyết định flag trong ứng dụng (evaluation)

### 7.1 Evaluation context

- Tập thuộc tính dùng để evaluate: `user`, `tenant`, `request`, `device`.
- Tránh đưa PII không cần thiết.

### 7.2 Deterministic bucketing

- Để rollout theo %, cần bucketing ổn định:
  - Hash(`userId` + `flagKey` + `salt`) → số 0..99
  - Nếu < rollout% thì ON

### 7.3 Variant selection

- Cho experiment: chọn variation theo allocation, đảm bảo sticky.

### 7.4 Server-side vs client-side flags

- **Server-side**:
  - Tốt cho security (không lộ rule nhạy cảm)
  - Dễ tích hợp backend logic
- **Client-side**:
  - Tốt cho UI toggles
  - Cần cẩn thận: flag/rules bị lộ, không dùng cho kiểm soát truy cập quan trọng

Thực hành tốt: flag quyết định ở server, client chỉ nhận kết quả cần thiết.

---

## 8) Flags với microservices và multi-tenant

### 8.1 Scope theo tenant

- Entitlement flags thường theo `tenantId`.
- Cần API/SDK hỗ trợ evaluate theo tenant context.

### 8.2 Đồng bộ giữa services

- Nếu nhiều service cần cùng một flag:
  - Chuẩn hóa key
  - Versioning rules
  - Tránh “mỗi service hiểu một kiểu”

### 8.3 Distributed consistency

- Khi rollout, có thể có vài giây/phút inconsistency giữa instances.
- Thiết kế feature chịu được eventual consistency.

---

## 9) Feature flags và database migrations

Kết hợp rất mạnh để tránh downtime:

- Deploy code có thể xử lý **schema cũ và mới**.
- Dùng flag để bật luồng ghi/đọc mới theo từng bước.

Pattern gợi ý:

1. Expand schema (thêm cột/bảng)
2. Deploy code đọc/ghi song song (flag OFF)
3. Backfill dữ liệu
4. Bật flag cho % nhỏ
5. Rollout 100%
6. Contract schema (dọn cột/bảng cũ)

---

## 10) Tích hợp CI/CD và release process

### 10.1 Trunk-based + feature flags

- Merge code sớm, flag OFF mặc định.
- Giảm nhánh dài, giảm merge conflicts.

### 10.2 Progressive delivery

- Canary ở tầng traffic (LB/service mesh) + flags ở tầng app.
- Metrics gates để tự động pause/rollback rollout.

### 10.3 Release checklist

- Flag có owner và thời hạn dọn (`expiresAt`).
- Có dashboard/alert liên quan.
- Có kế hoạch rollback (tắt flag + redeploy nếu cần).

---

## 11) Observability & đo lường

### 11.1 Log/metric theo variation

- Tag logs/metrics: `feature.checkout_new_ui=on` hoặc `variant=B`.
- Cẩn thận cardinality (đừng gắn `userId` vào labels).

### 11.2 Experiment analytics

- Track exposure event (ai thấy variant nào, khi nào).
- Gắn với conversion metrics.
- Tránh bias: user switching variant, missing exposures.

### 11.3 SLO gates cho rollout

- Gate theo error rate, latency, saturation.
- Gate theo business metrics quan trọng.

---

## 12) Testing với feature flags

### 12.1 Test matrix

- Ít nhất phải test đường ON và OFF cho release flags quan trọng.
- Với nhiều flags, tránh exponential explosion:
  - Đặt defaults
  - Test theo “contract” và critical paths

### 12.2 Automation

- Unit tests: inject flag provider mock.
- Integration tests: test service với snapshot flags.
- E2E: chạy vài cấu hình chủ chốt (ví dụ OFF default, ON full).

### 12.3 Safety checks

- “Flag config validation” trong CI (schema, rule syntax, no conflicting rules).
- Lint naming/ownership.

---

## 13) Governance: lifecycle, quyền hạn, audit

### 13.1 Ownership

- Mỗi flag có owner (team/person), link ticket/design.

### 13.2 Expiration / cleanup

- Release flags phải có ngày hết hạn hoặc “cleanup milestone”.
- Dọn code path cũ sau khi rollout xong.

### 13.3 Permissions

- Ai được tạo/sửa flag?
- Ops flags (kill switch) thường cần quyền đặc biệt.

### 13.4 Audit logs

- Ghi lại: ai đổi rule, lúc nào, từ đâu (UI/API), diff changes.

---

## 14) Failure modes & cách phòng tránh

- **Flag service downtime**: app phải fail-open với cached/default.
- **Config sai gây outage**: có validation, staging, approvals.
- **High latency khi evaluate**: không gọi network per-request; cache snapshot.
- **Thay đổi rules làm user đổi variant**: dùng sticky bucketing với salt ổn định.
- **Cardinality explosion** trong metrics.

---

## 15) Naming conventions & tổ chức flags

Gợi ý naming:

- Dùng `snake_case` hoặc `kebab-case` nhất quán.
- Prefix theo domain: `checkout_new_ui`, `search_ranker_v2`.
- Tránh tên mơ hồ kiểu `new_feature`.

Tags/metadata:

- `type`, `owner`, `product_area`, `createdAt`, `expiresAt`.

---

## 16) Checklist feature flags production-ready

### Thiết kế

- [ ] Flag được phân loại (release/ops/experiment/entitlement)
- [ ] Default variation rõ ràng (OFF an toàn)
- [ ] Có kill-switch nếu rủi ro cao
- [ ] Có plan rollout (1% → 100%) và SLO gates

### Kỹ thuật

- [ ] SDK/cache snapshot, không gọi network per-request
- [ ] Evaluation deterministic (hash bucketing) nếu dùng % rollout
- [ ] Fail-open/closed được quyết định đúng theo use case

### Vận hành

- [ ] Có owner + ticket link + expiry
- [ ] Có audit log + quyền hạn rõ ràng
- [ ] Dashboard theo variation và runbook rollback

---

## 17) Anti-patterns

- **Flags tồn tại mãi**: codebase đầy nhánh rẽ, khó bảo trì.
- **Dùng client-side flags cho kiểm soát truy cập**: dễ bị bypass.
- **Network call để evaluate flag mỗi request**: tăng latency, dễ outage.
- **Không có sticky assignment cho experiments**: số liệu sai.
- **Rollout không có metrics gates**: canary “mù”.
- **Tên flag không rõ nghĩa/không có owner**: không ai chịu trách nhiệm.
