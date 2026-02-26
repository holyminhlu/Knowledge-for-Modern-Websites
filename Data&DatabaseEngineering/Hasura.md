
# Hasura trong lập trình web (tất tần tật, thực chiến)

## 1) Hasura là gì?

**Hasura** (phổ biến nhất là Hasura GraphQL Engine) là một nền tảng giúp bạn **tạo GraphQL API gần như “tự động”** từ database (đặc biệt là PostgreSQL) và cung cấp nhiều tính năng production-ready như:

- CRUD GraphQL theo schema DB
- Authorization theo role/row-level (permissions)
- GraphQL subscriptions (realtime)
- Events/webhooks
- Actions (custom business logic)
- Remote schemas/federation kiểu “stitching”
- Metadata/migrations để vận hành như code

Tư duy quan trọng:

- Hasura không thay thế DB design; nó “phóng đại” mọi quyết định schema của DB thành API.
- DB schema = API schema (đến một mức lớn), nên thiết kế DB chuẩn là cực quan trọng.

## 2) Khi nào nên dùng Hasura?

Phù hợp khi:

- Bạn muốn xây API nhanh (MVP) mà vẫn có RBAC/row-level security
- Hệ read/write chủ yếu là CRUD
- Bạn dùng Postgres và cần GraphQL cho frontend
- Bạn muốn realtime (subscriptions) dễ

Không phù hợp hoặc cần cân nhắc kỹ khi:

- Business logic rất phức tạp (nhiều workflow, side effects)
- Cần tối ưu query rất “custom” hoặc pattern không hợp GraphQL
- Dữ liệu nằm rải nhiều hệ không dễ unify

Thực tế: Hasura thường dùng làm “data access layer” + vẫn cần services cho domain logic.

## 3) Kiến trúc tổng quan

Các thành phần thường gặp:

- **PostgreSQL** (primary data store)
- **Hasura GraphQL Engine**
- **Auth system** (JWT issuer / OAuth2 provider)
- **Custom services**:
	- Actions handlers
	- Event triggers consumers
	- Remote schema services (GraphQL)

Luồng request:

1) Client gửi GraphQL query/mutation/subscription
2) Hasura verify JWT / gọi auth webhook
3) Hasura kiểm tra permissions
4) Hasura generate SQL và query Postgres
5) Trả kết quả

## 4) Core concepts quan trọng trong Hasura

### 4.1 Tracked tables

- Hasura chỉ expose GraphQL cho những tables/views được “track”.

### 4.2 Relationships

- Define relationships dựa trên FK hoặc manual.
- Relationships quyết định cách join trong GraphQL.

### 4.3 Computed fields

- Field tính toán dựa trên function SQL.
- Hữu ích để encapsulate logic read ở DB.

### 4.4 Views & functions

- Views giúp tạo read model.
- Functions giúp custom query/mutation nhưng cần chú ý quyền và performance.

## 5) Metadata, migrations và GitOps

Hasura có 2 thứ cần quản lý như code:

- **Migrations**: thay đổi schema DB
- **Metadata**: cấu hình Hasura (tracked tables, permissions, relationships, actions, event triggers…)

Best practices:

- Lưu migrations + metadata vào repo
- CI/CD deploy theo thứ tự: migrate DB → apply metadata
- Tránh thao tác thủ công trên console ở production (hoặc phải export lại ngay)

## 6) Thiết kế DB để hợp với Hasura

Vì GraphQL schema bám DB schema, nên:

- Đặt tên bảng/cột rõ nghĩa (snake_case nhất quán)
- Dùng FK đúng để Hasura tự tạo relationships
- Thêm indexes cho các join/filter phổ biến
- Dùng constraints để đảm bảo integrity

### 6.1 Multi-tenant

- Hầu hết bảng nghiệp vụ nên có `tenant_id`.
- Index theo `(tenant_id, ...)`.
- Permissions phải enforce tenant isolation.

## 7) Authorization trong Hasura

Hasura mạnh về permission theo role và row-level rules.

### 7.1 JWT mode

- Client gửi JWT.
- Hasura đọc claims (thường dưới namespace `https://hasura.io/jwt/claims`).

Claims thường có:

- `x-hasura-default-role`
- `x-hasura-allowed-roles`
- `x-hasura-user-id`
- `x-hasura-org-id`/`tenant-id`

### 7.2 Webhook auth

- Hasura gọi webhook để lấy session variables.
- Hợp khi bạn không muốn nhét nhiều claims vào JWT hoặc cần lookup động.

### 7.3 Permissions model

Hasura permissions chia theo:

- **Role**
- **Operation**: select/insert/update/delete
- **Row-level filter**: điều kiện filter theo session variables
- **Column-level permissions**: cho phép đọc/ghi cột nào

Ví dụ tư duy:

- Role `user` chỉ select rows có `owner_id = x-hasura-user-id`
- Role `org_admin` select rows có `org_id = x-hasura-org-id`

> Đây là dạng “RBAC + ABAC” rất phổ biến: role quyết định policy, attributes (user/org) quyết định row filter.

### 7.4 Field-level/Column-level

- Hasura cho phép chặn đọc/ghi theo cột.
- Rất quan trọng khi có PII.

### 7.5 Pitfall bảo mật

- Quên set permission cho role `anonymous`.
- Cho role rộng quá nhiều cột.
- Nhầm lẫn giữa “permission ở Hasura” và “kiểm tra ở business service”.

## 8) Real-time: Subscriptions

Hasura hỗ trợ **GraphQL subscriptions** (thường qua WebSocket).

Use cases:

- Notifications
- Live dashboards
- Realtime feeds

Lưu ý:

- Subscriptions sẽ giữ connection lâu dài; cần scale gateway/Hasura accordingly.
- Row-level permissions vẫn áp dụng cho subscription.

## 9) Custom logic: Actions, Event Triggers, Remote Schemas

### 9.1 Actions

- Thêm custom mutation/query gọi ra HTTP handler.
- Dùng khi:
	- nghiệp vụ phức tạp
	- side-effect (payment, email)
	- validate phức tạp

Best practices:

- Handler phải validate input.
- Tách action theo domain.
- Idempotency cho side-effect.

### 9.2 Event Triggers

- Hasura theo dõi insert/update/delete trên table và gọi webhook.
- Dùng để:
	- publish event
	- sync search index
	- gửi email/notification

Lưu ý:

- Đảm bảo webhook endpoint có retry/idempotency.
- Theo dõi DLQ/retry queue nếu webhook lỗi.

### 9.3 Remote Schemas

- “Stitch” schema GraphQL khác vào Hasura.
- Hợp để unify API một phần.

Pitfalls:

- Debug phức tạp (nhiều nguồn).
- Auth context phải propagate đúng.

## 10) Performance tuning

### 10.1 Indexing cho filters/joins

- Hasura generate SQL theo query; nếu filter/join hot, cần index đúng.

### 10.2 Query complexity

- GraphQL cho phép query sâu → nguy cơ query nặng.
- Cần:
	- limit depth/complexity
	- rate limit
	- timeouts

### 10.3 N+1 ở GraphQL?

- Hasura thường translate thành SQL join tốt, nhưng vẫn có query “đắt” nếu relationships rộng.

### 10.4 Caching

- Hasura có một số cơ chế caching (tuỳ edition/stack).
- Thực tế hay cache ở:
	- CDN (với query public)
	- application layer

### 10.5 Connection pooling

- Điều chỉnh pool kết nối tới Postgres.
- Tránh để Hasura mở quá nhiều connections.

## 11) Observability

Bạn cần theo dõi:

- request rate, error rate
- p95 latency
- Postgres query latency
- active subscriptions/connections
- retries của event triggers

Logs:

- log requestId/traceId
- audit auth decisions (tuỳ policy)

## 12) Security best practices

- Bật HTTPS/TLS
- Không expose Hasura console ra public
- Bảo vệ admin secret
- Rate limit GraphQL
- Disable introspection ở production nếu cần (tuỳ threat model)
- Validate actions handlers như API bình thường

PII:

- Column-level permissions
- Masking / separate tables

## 13) Triển khai production

### 13.1 Environments

- dev/staging/prod tách DB và metadata.

### 13.2 CI/CD

- migrate DB
- apply metadata
- smoke test GraphQL

### 13.3 Rollback

- Migrations phải rollbackable hoặc forward-fix.
- Metadata versioned.

## 14) Anti-patterns (lỗi hay gặp)

- Dùng Hasura cho mọi business logic phức tạp, không có service layer
- Không quản lý metadata/migrations bằng git → “drift” giữa env
- Permissions cấu hình sơ sài → rò rỉ dữ liệu
- Subscriptions quá nhiều, query quá nặng → quá tải DB
- Event triggers gọi webhook không idempotent → side-effect bị nhân đôi
- Thiết kế DB kém (thiếu FK/index) rồi kỳ vọng Hasura “tự tối ưu”

## 15) Checklist production (tóm tắt)

- DB schema sạch: FK, constraints, indexes
- Multi-tenant: `tenant_id` + permission filters
- JWT/webhook auth rõ ràng, session variables chuẩn
- Column-level permissions cho PII
- Limit query depth/complexity + rate limit
- Actions cho business logic; event triggers cho integration; idempotency bắt buộc
- Metadata + migrations versioned, CI/CD áp dụng tự động
- Monitor latency, DB load, subscription count, trigger retries

---

Nếu bạn muốn, mình có thể bổ sung một mục “Hasura permission recipes” (mẫu rule cho multi-tenant + owner + role hierarchy) và một mục “Hasura realtime architecture” (scale subscriptions + pub/sub) theo use case cụ thể.

