---
title: Security nâng cao cho Web
description: Handbook security thực chiến cho hệ thống web: threat modeling, secure design, app/API hardening, secrets/crypto, supply chain, cloud/k8s security, observability và incident response.
---

# Security nâng cao trong lập trình web

## 0) Phạm vi

Tài liệu này tập trung vào **phòng thủ** và vận hành **production** cho hệ thống web (frontend, backend, APIs, microservices, cloud/k8s). Mục tiêu là giảm rủi ro bị khai thác và giảm thiểu thiệt hại nếu sự cố xảy ra.

---

## 1) Tư duy nền: bảo mật là quản trị rủi ro

### 1.1 Security ≠ “không có lỗ hổng”

Trong thực tế, mục tiêu là:

- Giảm xác suất bị tấn công thành công
- Giảm “blast radius” khi bị tấn công
- Phát hiện sớm, phản ứng nhanh (MTTD/MTTR thấp)

### 1.2 CIA + AAA

- **Confidentiality**: không lộ dữ liệu
- **Integrity**: dữ liệu không bị sửa trái phép
- **Availability**: hệ thống hoạt động ổn định

- **Authentication**: bạn là ai?
- **Authorization**: bạn được làm gì?
- **Accounting/Auditing**: bạn đã làm gì?

---

## 2) Threat modeling (khởi điểm của security nâng cao)

### 2.1 Assets, actors, boundaries

- Assets: dữ liệu người dùng, tiền, API keys, hệ thống thanh toán, admin panel...
- Actors: user thường, admin, attacker, insiders, third-party.
- Trust boundaries: browser ↔ edge ↔ services ↔ DB, third-party.

### 2.2 Attack surfaces thường gặp

- Public APIs
- Auth flows (login, reset password, OTP)
- Uploads và file processing
- Webhooks endpoints
- Admin/internal tools
- CI/CD và supply chain

### 2.3 Thực hành tốt

- Mỗi feature lớn nên có threat model nhẹ (1–2 trang):
  - data flows
  - threats chính
  - mitigations
  - residual risks

---

## 3) Secure-by-design: nguyên tắc kiến trúc

### 3.1 Defense in depth

- Không dựa vào 1 lớp duy nhất (ví dụ chỉ WAF hoặc chỉ auth).

### 3.2 Least privilege

- Quyền tối thiểu cho:
  - users/roles
  - services (service-to-service)
  - CI runners
  - database accounts

### 3.3 Zero Trust (thực dụng)

- Không tin “mạng nội bộ” mặc định an toàn.
- Xác thực/ủy quyền giữa services, mTLS nếu phù hợp.

### 3.4 Secure defaults

- Default là “deny”/“off”.
- Feature flags nhạy cảm default OFF.

### 3.5 Separation of duties

- Tách quyền deploy, quyền quản trị secrets, quyền DB admin.

---

## 4) Authentication & session security (nâng cao)

### 4.1 Session cookies (khuyến nghị cho web)

- HttpOnly + Secure + SameSite.
- Rotating session id sau login.
- Session expiration rõ:
  - idle timeout
  - absolute timeout

### 4.2 Token-based (JWT) – khi nào hợp lý

- Hợp cho stateless APIs và service-to-service.
- Cẩn thận:
  - token lifetime
  - revocation/rotation
  - key management (JWKS, `kid`)

### 4.3 MFA / step-up auth

- Bắt buộc cho admin/high-risk actions.
- Ưu tiên WebAuthn/passkeys nếu có.

### 4.4 Credential stuffing & brute force

- Rate limiting theo IP + theo account.
- Risk-based checks (device, geo, impossible travel).
- Captcha/challenge khi cần.

### 4.5 Account recovery

- Recovery codes, reset flows có audit.
- Chống enumeration: response đồng nhất.

---

## 5) Authorization hardening

### 5.1 RBAC/ABAC và multi-tenant isolation

- Mọi query phải enforce scope theo tenant.
- Tránh “IDOR” (Insecure Direct Object References):
  - luôn kiểm tra quyền trên resource

### 5.2 Centralized policy vs decentralized checks

- Centralized policy engine giúp consistency.
- Nhưng cần fallback/availability.

### 5.3 Auditability

- Log các hành động nhạy cảm:
  - thay đổi quyền
  - đổi email/phone
  - đổi payout/billing
  - tạo API keys

---

## 6) Input handling & injection defense

### 6.1 Validation + canonicalization

- Validate theo schema (types, lengths, patterns).
- Normalize/canonicalize trước khi validate (unicode, whitespace) nếu cần.

### 6.2 SQL injection

- Dùng prepared statements/ORM an toàn.
- Không nối chuỗi SQL.
- Least privilege DB user.

### 6.3 Command injection

- Tránh shelling-out.
- Nếu buộc phải gọi command: allowlist + không ghép chuỗi.

### 6.4 NoSQL injection

- Không pass object trực tiếp vào query filters.
- Validate operators.

### 6.5 Template injection

- Không render template từ input user.

---

## 7) XSS, CSRF, CORS và browser security

### 7.1 XSS

Phòng thủ:

- Escape output đúng context (HTML, attribute, JS, URL).
- CSP (Content-Security-Policy) chặt dần.
- Tránh inline scripts.
- Sanitize HTML nếu cho phép user content.

### 7.2 CSRF

- Dùng SameSite cookies + CSRF token cho state-changing requests.
- Double-submit cookie hoặc synchronizer token.

### 7.3 CORS

- CORS không phải security boundary cho server, nhưng ảnh hưởng browser.
- Tránh `Access-Control-Allow-Origin: *` với credentials.
- Allowlist origins rõ ràng.

### 7.4 Security headers

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

---

## 8) SSRF và webhooks

### 8.1 SSRF (Server-Side Request Forgery)

Rủi ro khi server fetch URL theo input user.

Phòng thủ:

- Allowlist domains/hosts.
- Block metadata IPs/localhost/private ranges.
- DNS pinning/resolve & verify IP.
- Timeout ngắn, giới hạn redirect.

### 8.2 Webhooks security

- Verify signature (HMAC) + timestamp.
- Idempotency keys.
- Replay protection.
- Rate limiting.

---

## 9) File uploads & content security

- Giới hạn size và loại file.
- Lưu file vào object storage (không giữ trong web root).
- Quét malware nếu cần.
- Tạo URL download có quyền (signed URLs) cho nội dung private.
- Tránh “content-type confusion”: set `Content-Type` và `Content-Disposition` đúng.

---

## 10) Secrets management

### 10.1 Nguyên tắc

- Không commit secrets vào git.
- Không đặt secrets trong logs.
- Rotate định kỳ hoặc khi nghi ngờ lộ.

### 10.2 Nguồn secrets

- Secret manager (Vault, cloud secret manager).
- OIDC/workload identity thay cho long-lived keys nếu có.

### 10.3 Phân quyền

- Secrets theo environment.
- App chỉ đọc secrets cần thiết.

---

## 11) Cryptography (thực dụng)

### 11.1 In transit

- HTTPS bắt buộc.
- TLS config hiện đại.

### 11.2 At rest

- Encrypt disks/volumes.
- Với dữ liệu cực nhạy: app-level encryption.

### 11.3 Password hashing

- Dùng thuật toán hashing mạnh (Argon2/bcrypt/scrypt).
- Không bao giờ lưu plaintext.

### 11.4 Key management

- Keys được quản lý trong KMS/HSM nếu cần.
- Rotate keys + audit.

---

## 12) API security nâng cao

### 12.1 Authentication/authorization cho APIs

- OAuth2/OIDC đúng flow (Auth Code + PKCE cho browser/mobile).
- Scopes và audience rõ.

### 12.2 Rate limiting & abuse prevention

- Rate limit theo user/tenant/ip.
- Throttling + quotas cho public APIs.

### 12.3 Request validation

- Enforce schema (OpenAPI/JSON schema) ở gateway hoặc app.
- Reject unknown fields nếu hợp.

### 12.4 Error handling

- Không leak internal details.
- Error messages nhất quán, có error codes.

---

## 13) Data security: phân loại, minimization, retention

- Data classification (public/internal/confidential/regulated).
- Data minimization: thu ít nhất cần.
- Retention policies + deletion.
- Masking/anonymization trong logs và analytics.

---

## 14) Infrastructure & cloud/Kubernetes security

### 14.1 Network segmentation

- Private subnets cho DB/cache.
- Security groups / network policies.

### 14.2 Kubernetes hardening (tổng quan)

- RBAC tối thiểu.
- Pod security (run as non-root, read-only FS nếu phù hợp).
- Limit egress (chống data exfiltration).
- Secrets management.

### 14.3 Container security

- Base images pin version/digest.
- Vulnerability scanning.
- SBOM + signing nếu cần.

---

## 15) Supply chain security (CI/CD)

- Pin dependencies (lockfile).
- Scan dependencies (CVE + licenses).
- SAST, secrets scanning.
- Build artifact immutability: build once, deploy many.
- Ký artifact/image và verify khi deploy (nếu yêu cầu).
- Quyền CI runners tối thiểu.

---

## 16) Logging, monitoring, detection

### 16.1 Security logging

- Auth events: login success/fail, MFA challenges.
- Admin actions.
- Key rotation events.
- WAF blocks.

### 16.2 Alerting

- Spike 401/403/429.
- Unusual login patterns.
- Data export volume bất thường.

### 16.3 Traceability

- Correlation IDs, trace_id.
- Audit trails immutable nếu có yêu cầu compliance.

---

## 17) Incident response & readiness

- Runbooks cho:
  - credential leak
  - account takeover
  - DDoS
  - data breach
- Playbook rotate secrets/keys.
- Backup & restore drills.
- Postmortems: tập trung cải tiến hệ thống.

---

## 18) Secure SDLC (quy trình)

- Security requirements từ đầu.
- Code review checklist.
- Automated scanning trong CI.
- Pen test/bug bounty (tuỳ tổ chức).
- Threat modeling cho features quan trọng.

---

## 19) Checklist security nâng cao (production)

### App & API

- [ ] Auth đúng chuẩn (cookies/JWT) + MFA cho admin
- [ ] Authorization enforce per-resource (chống IDOR)
- [ ] Input validation theo schema
- [ ] XSS/CSRF/CORS cấu hình đúng
- [ ] Rate limiting cho endpoints nhạy cảm

### Secrets & crypto

- [ ] Secrets trong secret manager
- [ ] Rotation và audit
- [ ] Password hashing chuẩn
- [ ] TLS/HTTPS bắt buộc

### Infra & supply chain

- [ ] Least privilege (cloud/IAM/k8s)
- [ ] Network segmentation + protect origin
- [ ] Image/dependency scanning
- [ ] SBOM/signing nếu cần

### Detection & response

- [ ] Security logs + audit trails
- [ ] Alerts theo dấu hiệu tấn công
- [ ] Runbooks và diễn tập

---

## 20) Anti-patterns

- **Tin vào “internal network”** và bỏ auth giữa services.
- **CORS cấu hình bừa** (allow-all + credentials).
- **Log secrets/PII**.
- **Dùng JWT lifetime dài** không có rotation/revocation.
- **Không enforce tenant scope** (multi-tenant data leak).
- **CI runners quyền quá cao**.
- **Không có runbook** khi sự cố xảy ra.
