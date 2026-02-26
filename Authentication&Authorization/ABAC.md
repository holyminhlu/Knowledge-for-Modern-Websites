# ABAC (Attribute-Based Access Control) trong lập trình web

## 1) ABAC là gì?

**ABAC** là mô hình phân quyền trong đó quyết định “cho phép hay từ chối” được đưa ra dựa trên **tập thuộc tính (attributes)** của:

- **Subject** (người/đối tượng truy cập): user/service/app
- **Resource** (tài nguyên): bản ghi DB, API endpoint, file, order, invoice…
- **Action** (hành động): `read`, `create`, `update`, `delete`, `approve`, `export`…
- **Environment/Context** (bối cảnh): thời gian, IP, device posture, location, risk score, tenant…

Nói ngắn gọn: thay vì “role A làm được X”, ABAC là “ai làm gì lên cái gì trong điều kiện nào”.

ABAC đặc biệt phù hợp với web hiện đại có:

- Multi-tenant (nhiều tổ chức)
- Tài nguyên có owner/team/project
- Yêu cầu theo ngữ cảnh (giờ hành chính, MFA, thiết bị quản trị…)
- Quy tắc phức tạp (compliance, dữ liệu nhạy cảm)

## 2) ABAC khác gì RBAC?

### 2.1 RBAC (Role-Based)

- Quyền gắn vào **role**.
- User được gán role.
- Dễ hiểu, dễ quản lý ở hệ nhỏ-trung.

Nhược điểm thường gặp:

- **Role explosion**: nhiều biến thể role (team A read-only, team A read-write, team B…)
- Khó biểu diễn điều kiện theo resource/context (owner, region, thời gian)

### 2.2 ABAC

- Quyền được quyết định bởi **policy + attributes**.
- Có thể mô tả rule giàu ngữ cảnh.

Trade-off:

- Mạnh hơn nhưng **phức tạp hơn**: cần mô hình dữ liệu thuộc tính, policy lifecycle, audit.

### 2.3 Thực tế: “RBAC + ABAC”

Rất nhiều hệ production dùng kết hợp:

- Role để phân “tầng quyền” (admin, staff, customer)
- ABAC để ràng buộc theo resource (chỉ xem đơn thuộc org mình, chỉ sửa khi trạng thái cho phép)

## 3) Mô hình policy trong ABAC

Một quyết định authorization ABAC thường là:

`allow = Policy(subject, action, resource, environment)`

Ví dụ policy (diễn đạt tự nhiên):

- User được `read` invoice nếu `invoice.orgId == user.orgId`.
- User được `approve` payment nếu `user.department == "finance"` và `amount < user.approvalLimit`.
- Admin được `export` dữ liệu nhạy cảm chỉ khi `MFA == true` và request đến từ `corporateNetwork == true`.

### 3.1 Các loại attribute thường dùng

**Subject attributes**

- `userId`, `orgId`, `roles`, `groups`
- `department`, `title`, `employmentType`
- `mfaEnabled`, `riskScore`
- `scopes` (OAuth), `clientId` (machine-to-machine)

**Resource attributes**

- `ownerId`, `orgId`, `projectId`
- `classification` (public/internal/confidential)
- `status` (draft/approved/archived)
- `amount`, `currency`, `region`

**Environment/context attributes**

- `ip`, `geo`, `time`, `dayOfWeek`
- `deviceTrusted`, `networkZone`
- `requestMethod`, `requestPath` (cẩn trọng nếu dùng path-based)

## 4) Kiến trúc chuẩn: PEP / PDP / PIP / PAP

ABAC được chuẩn hoá theo kiểu “policy decision”:

- **PEP (Policy Enforcement Point)**: nơi _enforce_ quyết định (API gateway, middleware, service)
- **PDP (Policy Decision Point)**: nơi _ra quyết định_ allow/deny (policy engine)
- **PIP (Policy Information Point)**: nguồn cung cấp attribute (DB, directory, HR system, cache)
- **PAP (Policy Administration Point)**: nơi quản trị policy (UI quản trị, repo policy)

Flow điển hình:

1. Request vào API
2. PEP thu thập context (subject/action/resource)
3. PEP gọi PDP để evaluate policy
4. PDP trả allow/deny (+ obligations nếu có)
5. PEP enforce + log audit

## 5) Triển khai ABAC trong web: “đặt ở đâu?”

### 5.1 ABAC ở API Gateway

Ưu:

- Chặn sớm, giảm tải downstream.

Nhược:

- Khó thực hiện **resource-level** nếu gateway không có đủ resource attributes.

Thực tế:

- Gateway thường xử lý coarse-grained (auth, scopes, route-level)
- Service xử lý fine-grained (resource-level ABAC)

### 5.2 ABAC ở Service (khuyến nghị cho resource-level)

- Service có domain data và hiểu “resource” nhất.
- Dễ enforce theo status/owner/orgId.

### 5.3 ABAC ở Database (Row-Level Security)

- Một số hệ dùng RLS (ví dụ Postgres) để enforce theo row.
- Mạnh nhưng cần cẩn trọng:
  - Debug khó hơn
  - Policy logic phức tạp dễ bị phân tán

## 6) Thiết kế “action” và tránh lẫn với HTTP

Đừng chỉ dùng `GET/POST/PUT/DELETE` làm action.

Nên mô hình action theo nghiệp vụ:

- `order.read`, `order.cancel`, `order.refund`
- `invoice.export`
- `user.invite`

Sau đó map HTTP route → action.

## 7) Policy effects, obligations, và deny-by-default

### 7.1 Deny-by-default

- Nếu không match policy → **deny**.
- Tránh “allow-by-default” vì dễ rò rỉ dữ liệu.

### 7.2 Obligations (ràng buộc kèm theo)

PDP có thể trả về “allow nhưng kèm điều kiện”, ví dụ:

- Allow `read` nhưng phải **mask** một số field
- Allow `export` nhưng bắt buộc **log audit** ở mức cao

Trong thiết kế đơn giản, obligations có thể implement ngay ở service layer.

## 8) Policy language và công cụ phổ biến

Bạn có 3 hướng chính:

### 8.1 Tự viết policy trong code

- Nhanh cho dự án nhỏ.
- Nhưng dễ bị:
  - rải logic khắp nơi
  - khó audit và review policy

### 8.2 Policy engine độc lập (khuyến nghị khi hệ phức tạp)

Ví dụ:

- **OPA (Open Policy Agent)** + **Rego**
- **AWS Cedar** (ngôn ngữ policy)
- Một số hệ dùng **Casbin** (hỗn hợp RBAC/ABAC, tuỳ adapter)

Lợi ích:

- Policy tách khỏi code, có thể review như config
- Dễ test policy
- Có thể dùng cùng một policy cho nhiều service

### 8.3 DB-level policies / RLS

- Enforce ở tầng dữ liệu.

## 9) Ví dụ ABAC (dạng pseudo)

### 9.1 Owner + tenant

Cho phép xem document nếu cùng org và:

- là owner hoặc
- có role `org_admin`

Pseudo:

```
allow if resource.orgId == subject.orgId
	and (
		resource.ownerId == subject.userId
		or "org_admin" in subject.roles
	)
```

### 9.2 Điều kiện theo trạng thái

Cho phép hủy đơn nếu:

- cùng org
- là owner
- order đang `pending`

```
allow if action == "order.cancel"
	and resource.orgId == subject.orgId
	and resource.ownerId == subject.userId
	and resource.status == "pending"
```

### 9.3 Điều kiện theo environment

Cho phép export nếu:

- role admin
- đã MFA
- trong corporate network

```
allow if action == "invoice.export"
	and "admin" in subject.roles
	and environment.mfa == true
	and environment.networkZone == "corp"
```

## 10) Tích hợp với JWT/OAuth2

### 10.1 Token chứa attributes nào?

Token (JWT) nên chứa **minimal** attributes:

- `sub` (userId)
- `orgId`/`tenantId`
- `roles` hoặc `groups`
- `scopes` (OAuth)
- `mfa` (nếu có thể đảm bảo)

Không nên nhồi tất cả attribute động vào JWT vì:

- token phình to
- attribute thay đổi cần revoke/rotate
- rủi ro lộ thông tin

### 10.2 Attribute động lấy ở đâu?

- PIP truy vấn DB/cache để lấy resource attributes (ownerId/status/classification)
- Với dữ liệu nhạy cảm, prefer “look up server-side”

## 11) Performance: caching và “đừng gọi PDP quá đắt”

ABAC có thể bị chậm nếu mỗi request phải gọi PDP + query nhiều nguồn.

Chiến lược tối ưu:

- **Local PDP sidecar** (OPA sidecar) để giảm network hop
- Cache attributes hot (role/group/org membership)
- Cache decision ngắn hạn khi an toàn (ví dụ 1–10s) theo key:
  - `(subjectId, action, resourceId, contextHash)`
- Tránh cache quá lâu nếu policy/attributes thay đổi nhanh.

Đo lường:

- p95 latency của policy evaluation
- cache hit rate

## 12) Audit và compliance

ABAC thường đi kèm yêu cầu audit:

- Log ai (subject) làm gì (action) lên gì (resource) trong bối cảnh nào
- Log quyết định allow/deny + policy version

Gợi ý log fields:

- `requestId`, `traceId`
- `subjectId`, `orgId`
- `action`, `resourceType`, `resourceId`
- `decision` (allow/deny)
- `policyVersion`
- `reason` (nếu có)

## 13) Testing policy (bắt buộc nếu ABAC lớn)

- Unit test policy rules theo bảng case:
  - owner vs non-owner
  - cross-tenant
  - status transitions
  - context (MFA/network)
- Regression test khi đổi policy.

## 14) Pitfalls / Anti-patterns

- Nhầm authN (xác thực) với authZ (phân quyền)
- Dùng ABAC nhưng thiếu attribute nguồn sự thật (data model không có `orgId/ownerId`)
- Policy rải trong code, mỗi service một kiểu, không test → drift
- Allow-by-default hoặc thiếu deny rule rõ ràng
- Dùng route/path làm resource duy nhất → không kiểm soát row-level
- Nhét attribute động vào JWT khiến token stale → quyền không cập nhật
- Không audit deny/allow → không giải trình được

## 15) Checklist triển khai ABAC trong web

- Xác định rõ: subject/resource/action/environment
- Chuẩn hoá action theo nghiệp vụ (không chỉ HTTP verbs)
- Thuộc tính resource bắt buộc: `orgId/tenantId`, `ownerId`, `status`, `classification`
- Chọn nơi enforce: service layer cho fine-grained; gateway cho coarse-grained
- Deny-by-default + logging/audit
- Idempotency/consistency không liên quan trực tiếp ABAC, nhưng cần cho workflow nhạy cảm
- Test policy + versioning + rollout an toàn

---

Nếu bạn muốn, mình có thể bổ sung thêm một mục “ABAC trong microservices” với hai kiểu triển khai phổ biến: (1) OPA sidecar per-service, (2) centralized PDP + caching, kèm ưu/nhược và khi nào chọn.
