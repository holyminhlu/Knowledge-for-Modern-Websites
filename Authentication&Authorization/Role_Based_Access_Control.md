# RBAC (Role-Based Access Control) trong lập trình web (tất tần tật)

## 1) RBAC là gì?

**RBAC** là mô hình phân quyền trong đó quyền truy cập được gán cho **Role (vai trò)**, và user được gán role. Khi user thực hiện một action, hệ thống kiểm tra role của user có quyền tương ứng hay không.

Mục tiêu:

- Quản lý quyền **dễ hiểu, dễ vận hành**
- Hạn chế “ai cũng admin”
- Áp dụng nguyên tắc **least privilege**

RBAC đặc biệt hợp với web app doanh nghiệp:

- Tổ chức có chức danh rõ (admin, manager, staff, viewer)
- Quyền ổn định, ít điều kiện theo ngữ cảnh

## 2) Role vs Permission (đừng nhầm)

### 2.1 Permission là gì?

**Permission** là quyền thực hiện một hành động cụ thể trên một loại tài nguyên.

Ví dụ:

- `order.read`
- `order.refund`
- `user.invite`
- `invoice.export`

### 2.2 Role là gì?

**Role** là “gói quyền” (bundle of permissions).

Ví dụ:

- `viewer`: `order.read`
- `staff`: `order.read`, `order.update`
- `admin`: tất cả quyền quản trị

Khuyến nghị:

- Thiết kế permission theo **nghiệp vụ**, không chỉ theo HTTP verbs.
- Role chỉ là tập hợp permission để dễ gán và quản lý.

## 3) RBAC models (RBAC0/1/2/3) – hiểu theo mức độ

Các biến thể hay nhắc:

- **RBAC0**: core RBAC (user-role, role-permission)
- **RBAC1**: role hierarchy (role cha kế thừa quyền role con)
- **RBAC2**: constraints (ràng buộc như separation of duty)
- **RBAC3**: RBAC1 + RBAC2

Trong web app, bạn thường gặp:

- Hierarchy: `admin` ⟶ `manager` ⟶ `staff` ⟶ `viewer`
- Constraints: “người tạo không được duyệt” (SoD)

## 4) RBAC trong hệ multi-tenant (rất quan trọng)

Trong SaaS, user thuộc **tenant/org** khác nhau.

Bạn cần quyết định role “scoped” như thế nào:

- Role theo tenant: user có role trong từng org khác nhau
- Role theo project/team trong org

Ví dụ:

- User A là `admin` của Org1 nhưng chỉ là `viewer` của Org2.

Do đó, quan hệ thường là:

- `User` —(membership)→ `Org` —(role)→ `Role`

Không nên:

- Gán `role=admin` global cho user nếu quyền thực tế phụ thuộc tenant.

## 5) Thiết kế permission và naming convention

Một cách đặt tên dễ scale:

- `resource.action` hoặc `domain.resource.action`
- Ví dụ: `billing.invoice.export`, `support.ticket.assign`

Nhóm quyền theo module để dễ filter trong admin UI.

Tránh:

- Permission mơ hồ như `manage_all`
- Permission theo route cụ thể (dễ drift khi refactor routes)

## 6) Data model (DB schema) điển hình

### 6.1 Schema cơ bản

- `users`
- `roles`
- `permissions`
- `role_permissions` (many-to-many)
- `user_roles` hoặc `memberships` (tuỳ multi-tenant)

### 6.2 Multi-tenant schema gợi ý

- `orgs`
- `org_memberships`: (`orgId`, `userId`, `roleId`, `status`...)

Nếu role theo project:

- `projects`
- `project_memberships`: (`projectId`, `userId`, `roleId`...)

### 6.3 Role hierarchy

Hai cách:

- Lưu `parentRoleId` (tree)
- Hoặc “expanded permissions” (materialized) để query nhanh

## 7) Enforce RBAC ở đâu?

### 7.1 Ở API Gateway (coarse-grained)

- Chặn theo route và scope đơn giản.
- Không phù hợp cho resource-level (owner/tenant) trừ khi gateway có đủ context.

### 7.2 Ở Application Service (khuyến nghị cho phần lớn web apps)

- Middleware check permission trước.
- Với resource-level, service có thể query DB để kiểm tra org/ownership.

### 7.3 Ở Database (Row-Level Security)

- Có thể enforce theo role/tenant.
- Mạnh nhưng cần cẩn trọng vì debug khó, policy phân tán.

Thực tế thường kết hợp:

- Gateway check auth + scope sơ bộ
- Service check permission + resource scope
- DB enforce tenant isolation (nếu cần)

## 8) RBAC “resource-level” và giới hạn của RBAC

RBAC thuần tuý trả lời câu hỏi:

- “Role này có quyền X không?”

Nhưng nhiều bài toán web cần:

- “User có thể sửa **bản ghi cụ thể** này không?”

Ví dụ:

- chỉ sửa order thuộc org mình
- chỉ sửa ticket thuộc team mình

Giải pháp:

- RBAC cho quyền hành động (`ticket.update`)
- Kèm thêm điều kiện theo resource (orgId/ownerId/status) → đây là lúc cần **ABAC** hoặc policy checks trong code.

## 9) RBAC và JWT/OAuth2 scopes

### 9.1 Scopes có phải roles không?

- Scope là “phạm vi quyền” trong OAuth2.
- Role là khái niệm nội bộ của app.

Bạn có thể map:

- Role → scopes
- hoặc permission → scopes

Nhưng cần nhất quán và tránh nhầm.

### 9.2 Nên nhét role/permission vào token không?

Tuỳ hệ:

- Nếu quyền đổi ít: có thể đưa roles/scopes vào JWT để API check nhanh.
- Nếu quyền đổi thường xuyên: prefer lookup server-side hoặc token ngắn hạn.

## 10) Admin UI và quản trị quyền

RBAC chỉ hiệu quả khi vận hành dễ:

- Danh sách roles rõ nghĩa
- Màn hình gán quyền có mô tả permission
- Có “default roles” (viewer/staff/admin) để onboarding nhanh

Nếu bạn cho phép tạo role custom:

- Cần guardrails (không cho privilege escalation)
- Có audit log thay đổi role/permission

## 11) Constraints: Separation of Duties (SoD)

Một số quy tắc hay gặp:

- Người tạo request không được duyệt request
- Finance không được tự approve khoản vượt hạn mức

RBAC2 giải quyết bằng constraints, nhưng trong web app thường implement bằng rule trong code/policy engine.

## 12) Hiệu năng: caching và precompute

Các cách tối ưu:

- Cache permissions theo user-session (in-memory/Redis)
- Materialize “effective permissions” để check nhanh
- Invalidate cache khi role/permission thay đổi

Chú ý:

- Cache quá lâu có thể gây “quyền đã bị thu hồi nhưng vẫn còn hiệu lực”.
- Token ngắn hạn + refresh rotation giúp giảm rủi ro stale.

## 13) Audit, logging và compliance

Nên audit:

- ai gán role cho ai
- ai thay đổi role/permission
- ai thực hiện hành động nhạy cảm (kèm permission)

Log gợi ý:

- `userId`, `orgId`, `action`, `resourceType`, `resourceId`, `decision` (allow/deny)
- `policyVersion` hoặc `rolesSnapshot`

## 14) Testing RBAC

- Unit test mapping role → permissions
- Integration test endpoints:
  - viewer bị 403 ở `write`
  - staff được 200 ở `update`
- Test multi-tenant isolation: user org A không truy cập org B

## 15) Anti-patterns (lỗi hay gặp)

- Role explosion: tạo quá nhiều role vì cố nhét điều kiện resource/context vào role
- Gán quyền “admin” để chữa cháy (privilege creep)
- Không có tenant scoping → lộ dữ liệu cross-tenant
- Chỉ check role ở UI, không check ở backend
- Hardcode permissions rải rác, không có source of truth
- Không audit thay đổi quyền

## 16) Checklist production (tóm tắt)

- Định nghĩa permission theo nghiệp vụ, có naming convention
- Thiết kế role là bundle permissions, có default roles
- Multi-tenant: role gắn với membership (org/project)
- Enforce ở backend (service), không tin UI
- Thêm layer resource checks (ABAC) khi cần
- Caching hợp lý + invalidate
- Audit log + test coverage cho endpoints quan trọng

---

Nếu bạn muốn, mình có thể bổ sung một mục “RBAC + ABAC hybrid” (khi nào dùng, cách tách permission vs attribute rules) và ví dụ data model cho SaaS có org + project + team.
