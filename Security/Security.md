---
title: Security trong lập trình web
description: Handbook security tổng quan (production-ready) cho hệ thống web: threat modeling, secure design, OWASP risks, auth/authz, API security, data protection, DevSecOps, cloud/container hardening, monitoring và incident response.
---

# Security trong lập trình web

## 0) Mục tiêu và phạm vi

Tài liệu này là “bức tranh tổng quan” về security cho web (frontend + backend + API + infra). Nội dung tập trung vào **phòng thủ** và vận hành production.

Trong repo này, một số chủ đề đã có bài riêng:

- SQL Injection: xem `SQL_Injection.md`
- Rate limiting: xem `Rate_Limit_API.md`
- Security nâng cao (k8s/supply chain/IR...): xem `Security_nâng_cao.md`
- AuthN/AuthZ: xem thư mục `Authentication&Authorization/` (JWT, OAuth2, MFA, RBAC, ABAC...)

---

## 1) Tư duy nền tảng: security là quản trị rủi ro

### 1.1 Mô hình CIA

- **Confidentiality**: dữ liệu không bị lộ
- **Integrity**: dữ liệu không bị sửa trái phép
- **Availability**: hệ thống không bị gián đoạn

### 1.2 “Assume breach” và blast radius

- Luôn giả định: một ngày nào đó sẽ có sự cố.
- Thiết kế để:
  - phát hiện sớm
  - giới hạn phạm vi ảnh hưởng
  - khôi phục nhanh

### 1.3 Defense in depth

Không có lớp phòng thủ nào đủ một mình:

- Secure coding + input validation
- Auth/authz đúng
- Network segmentation
- Secrets management
- Monitoring/alerting

---

## 2) Threat modeling (nên làm trước khi code)

### 2.1 Xác định

- **Assets**: dữ liệu người dùng, tiền, API keys, admin panel...
- **Actors**: user thường, admin, attacker, insider, bot.
- **Trust boundaries**: browser ↔ edge ↔ app ↔ DB/queue ↔ third-party.

### 2.2 Data flow (thực dụng)

Vẽ luồng dữ liệu cho feature:

- input đến từ đâu
- đi qua service nào
- được lưu ở đâu
- ai có quyền truy cập

### 2.3 Output

- Danh sách threats lớn + mitigations.
- Quyết định logging/audit.
- Yêu cầu security tests.

---

## 3) Các rủi ro phổ biến (OWASP-style, theo nhóm)

### 3.1 Broken Access Control

- IDOR, thiếu tenant scoping, thiếu kiểm tra quyền trên từng resource.

Phòng thủ:

- Authorization checks ở server, per-resource.
- RBAC/ABAC rõ ràng.
- Multi-tenant isolation.

### 3.2 Injection

- SQLi, NoSQL injection, command injection, template injection.

Phòng thủ:

- Parameterized queries, allowlists cho phần dynamic.
- Schema validation.

### 3.3 Auth & session issues

- Weak passwords, credential stuffing, token leakage.

Phòng thủ:

- MFA/step-up
- Rate limit login
- Secure cookies
- Token rotation và short-lived access tokens (tuỳ hệ)

### 3.4 Cryptographic failures

- TLS cấu hình yếu, lưu plaintext, sai hashing password.

Phòng thủ:

- HTTPS bắt buộc
- Password hashing chuẩn
- KMS/secret manager

### 3.5 Security misconfiguration

- Bucket public, debug mode bật, default creds.

Phòng thủ:

- IaC + policy checks
- secure defaults
- environment separation

### 3.6 SSRF & unsafe integrations

- Server fetch theo input; webhooks không verify signature.

Phòng thủ:

- allowlist + block private ranges
- verify webhook signatures + replay protection

### 3.7 Supply chain

- Dependencies độc hại, secrets lộ trong CI.

Phòng thủ:

- lockfile
- dependency scan
- secrets scanning
- least privilege CI

---

## 4) Authentication & session security

### 4.1 Cookies vs tokens (tổng quan)

- Web app truyền thống: cookie-based session (HttpOnly).
- APIs/mobile: token-based (OAuth2/OIDC) với access token ngắn hạn.

### 4.2 Cookie best practices

- `HttpOnly`, `Secure`, `SameSite`.
- Rotate session id sau login.
- Idle timeout + absolute timeout.

### 4.3 MFA

- Bật MFA cho admin và hành động nhạy cảm.
- Ưu tiên WebAuthn/passkeys nếu có.

### 4.4 Chống brute-force và credential stuffing

- Rate limit theo IP + theo account.
- Backoff + lockout có kiểm soát.
- Captcha/challenge khi cần.

---

## 5) Authorization (RBAC/ABAC) và multi-tenant

### 5.1 RBAC

- Role → permissions.
- Dễ quản trị cho hệ thống có vai trò rõ.

### 5.2 ABAC

- Quyết định theo attributes (user, resource, environment).
- Linh hoạt cho multi-tenant và policy phức tạp.

### 5.3 Multi-tenant isolation

- Mọi truy vấn phải filter theo tenant scope.
- Không tin client gửi `tenantId` là đúng.
- Audit các hành động quản trị tenant.

---

## 6) API security

### 6.1 Input validation

- Validate theo schema (OpenAPI/JSON schema).
- Giới hạn size payload.

### 6.2 Rate limiting & quotas

- Limit theo API key/user/tenant.
- Trả `429` + `Retry-After`.

### 6.3 CORS

- Allowlist origins.
- Không dùng `*` với credentials.

### 6.4 Error handling

- Không leak stack traces cho client.
- Error codes nhất quán.

### 6.5 Webhooks

- Verify signature + timestamp.
- Idempotency.

---

## 7) Frontend/browser security

### 7.1 XSS

- Escape output đúng context.
- CSP (bật dần, giảm `unsafe-inline`).
- Sanitize user-generated HTML.

### 7.2 CSRF

- SameSite cookies + CSRF token cho state-changing requests.

### 7.3 Clickjacking

- `frame-ancestors` trong CSP.

### 7.4 Security headers

- HSTS, CSP, nosniff, referrer-policy, permissions-policy.

---

## 8) Data security

### 8.1 Data minimization

- Chỉ thu thập dữ liệu cần thiết.

### 8.2 Encryption

- In transit: HTTPS.
- At rest: encryption trên storage/DB.
- Dữ liệu cực nhạy: app-level encryption (tuỳ).

### 8.3 Logging & PII

- Không log secrets.
- Redact PII.
- Retention phù hợp.

---

## 9) Infrastructure & deployment security (tổng quan)

### 9.1 Network segmentation

- DB/cache trong private subnet.
- Security groups / network policies.

### 9.2 Container hardening

- Run as non-root.
- Minimal base images.
- Scan images.

### 9.3 Secrets management

- Secret manager.
- OIDC/workload identity nếu có.

---

## 10) DevSecOps (secure SDLC)

### 10.1 Trong CI

- Lint + tests
- SAST
- dependency scanning (CVE + license)
- secrets scanning

### 10.2 Trong CD

- Artifact immutability (build once, deploy many).
- Policy gates (IaC scanning, image scanning).
- Progressive delivery (canary) để giảm blast radius.

---

## 11) Monitoring, detection, và incident response

### 11.1 Logging/audit

- Auth events (login fail/success, MFA)
- Admin actions
- Data exports

### 11.2 Alerts

- Spike 401/403/429
- Unusual login pattern
- WAF blocks tăng

### 11.3 Incident response

- Runbooks cho leak credentials, account takeover, DDoS, data breach.
- Rotate keys/secrets nhanh.
- Postmortem để cải tiến.

---

## 12) Checklist security production-ready

### Ứng dụng

- [ ] Input validation + parameterized queries
- [ ] Auth đúng chuẩn + MFA cho admin
- [ ] Authorization per-resource, multi-tenant scoping
- [ ] XSS/CSRF/CORS cấu hình đúng
- [ ] Rate limiting cho endpoints nhạy cảm

### Dữ liệu

- [ ] Encryption in transit + at rest
- [ ] PII redaction trong logs
- [ ] Retention policies

### Hạ tầng

- [ ] Private DB/cache
- [ ] Secrets trong secret manager
- [ ] Container/image scanning

### Quy trình

- [ ] SAST + dependency + secrets scan trong CI
- [ ] Audit logs + alerting
- [ ] Incident runbooks

---

## 13) Anti-patterns

- **Tin vào “internal network”** và bỏ auth giữa services.
- **CORS mở bừa** (allow-all + credentials).
- **Log secrets/PII**.
- **DB user quyền quá cao**.
- **Không có rate limiting** cho login và endpoints đắt.
- **Không có audit trail** cho admin actions.
