---
title: CI/CD (Continuous Integration / Continuous Delivery / Continuous Deployment)
description: Handbook thực chiến về CI/CD cho hệ thống web (monolith, microservices, frontend, backend), bao gồm pipeline design, quality gates, security, release strategies, và vận hành production.
---

# CI/CD trong lập trình web

## 1) CI/CD là gì? (và vì sao quan trọng)

### Continuous Integration (CI)

- **CI** là thực hành tích hợp code thường xuyên vào nhánh chính (main/master) và **tự động** chạy build + test + kiểm tra chất lượng.
- Mục tiêu: phát hiện lỗi sớm, giảm “integration hell”, giữ codebase ở trạng thái có thể release.

### Continuous Delivery (CD)

- **Continuous Delivery** là khả năng **luôn sẵn sàng deploy** lên production (hoặc staging) bất cứ lúc nào.
- Có thể vẫn cần bước “approve”/“manual gate” trước khi deploy production.

### Continuous Deployment

- **Continuous Deployment** là tự động deploy lên production khi pass toàn bộ quality gates (không cần thao tác thủ công).
- Yêu cầu hệ thống quan sát tốt, rollback/roll-forward nhanh, rủi ro được kiểm soát (feature flags/canary/blue-green).

### Giá trị cốt lõi

- **Nhanh hơn**: rút ngắn lead time từ commit → production.
- **An toàn hơn**: thay đổi nhỏ, có kiểm soát, có quan sát.
- **Lặp lại được**: mọi bước build/test/deploy là “code”, giảm sai sót thủ công.
- **Audit/compliance**: có log, trace, artifact rõ ràng.

---

## 2) Các khái niệm nền tảng

### Pipeline

- Pipeline = chuỗi stages/jobs chạy theo thứ tự hoặc song song.
- Nên **deterministic**: cùng input → cùng output.

### Runner/Agent

- Máy/VM/container thực thi job. Có thể self-hosted hoặc managed.

### Artifact

- Sản phẩm build (ví dụ: Docker image, binary, frontend bundle, Helm chart).
- Quy tắc quan trọng: **build once, deploy many** (một artifact được promote qua dev → staging → prod).

### Environments

- Dev, Staging/Preprod, Prod… kèm cấu hình và quyền truy cập khác nhau.
- Mỗi environment nên có “source of truth” và quy trình promote rõ ràng.

### Quality Gates

- Điều kiện bắt buộc để merge/deploy (test pass, coverage threshold, vuln scan, policy check...).

---

## 3) Thiết kế pipeline CI cho web

### 3.1 Triggers phổ biến

- `pull_request`/MR: chạy validate trước khi merge.
- `push` lên main: chạy build chính, publish artifact.
- `tag`/release: build release, generate changelog, publish.
- `schedule`: security scan định kỳ, dependency updates.

### 3.2 Trình tự “golden path” (CI)

1. **Checkout** + xác định version (commit SHA, semver, build number)
2. **Install deps** (lockfile bắt buộc)
3. **Lint/format** (fail fast)
4. **Unit tests** (song song hóa)
5. **Build** (backend/frontend)
6. **Integration tests** (DB/cache/mock services)
7. **Security checks** (SAST, dependency scan, secrets scan)
8. **Package & publish artifact** (image/bundle)
9. **Generate SBOM + sign** (khuyến nghị)

### 3.3 Monorepo vs Polyrepo

- **Monorepo**: cần “change detection” để chỉ build/test phần bị ảnh hưởng; dễ chuẩn hóa pipeline.
- **Polyrepo**: pipeline đơn giản hơn theo repo; cần chuẩn hóa templates và versioning strategy giữa services.

### 3.4 Caching & tăng tốc

- Cache dependencies (npm/pnpm, pip, Maven, Go modules...).
- Cache build outputs (vd: turborepo, bazel) nếu phù hợp.
- Dùng test sharding/parallel matrix.

### 3.5 Chống flaky tests

- Tách test không ổn định khỏi gates bắt buộc (tạm thời) và theo dõi flake rate.
- Fix root cause: race condition, timeouts, shared state.
- Không “re-run until green” như một giải pháp lâu dài.

---

## 4) Testing strategy trong CI/CD

### 4.1 Test Pyramid (áp dụng linh hoạt)

- **Unit**: nhanh, nhiều, chạy mọi PR.
- **Integration/Component**: test service + dependencies (DB/queue) ở mức vừa.
- **E2E**: chậm, ít hơn; chạy theo lịch hoặc trước release.

### 4.2 Frontend

- Lint/Typecheck (TS), unit (Jest/Vitest), component (Testing Library), e2e (Playwright/Cypress).
- Snapshot tests nên dùng có chọn lọc (dễ noise).

### 4.3 Backend/API

- Contract tests (OpenAPI/GraphQL schema, consumer-driven contract).
- Migration tests (schema changes).
- Load/perf smoke (khi cần, thường preprod).

---

## 5) CD: Từ artifact đến production

### 5.1 Build once, deploy many

- CI build ra artifact bất biến (immutable): image gắn tag theo SHA.
- CD chỉ **kéo artifact** và deploy theo config environment.

### 5.2 Infrastructure as Code (IaC)

- Terraform/Pulumi/CloudFormation cho hạ tầng.
- Helm/Kustomize/manifest cho Kubernetes.
- GitOps (Argo CD/Flux) giúp “desired state” rõ ràng và audit tốt.

### 5.3 Quản lý cấu hình

- Tách **config** khỏi **code**.
- Dùng config store/secret manager theo environment.
- Không commit secrets vào repo.

### 5.4 Approvals & change management

- Environment production có thể yêu cầu approve.
- Luôn giữ audit trail: ai approve, deploy gì, lúc nào.

---

## 6) Chiến lược release/deploy cho web

### 6.1 Rolling update

- Deploy dần từng instance.
- Cần readiness/liveness probes, graceful shutdown, connection draining.

### 6.2 Blue–Green

- Hai môi trường song song (blue/green); switch traffic một lần.
- Rollback nhanh bằng cách chuyển traffic về môi trường cũ.

### 6.3 Canary / Progressive Delivery

- Chia traffic theo %/header/cohort/region.
- Có **SLO gates**: error rate, latency, saturation, business KPIs.
- Tự động rollback/roll-forward dựa trên metrics.

### 6.4 Feature Flags

- Giảm coupling giữa deploy và release.
- Hỗ trợ “dark launch”, A/B testing, gradual rollout.
- Cần lifecycle: tạo → rollout → dọn dẹp flag.

### 6.5 Database migrations & backward compatibility

- Ưu tiên “expand/contract”:
  - Expand: thêm cột/bảng mới, code đọc/ghi song song (backward compatible).
  - Contract: dọn schema cũ sau khi rollout hoàn tất.
- Tránh “breaking migration” trong một lần deploy.

---

## 7) Security trong CI/CD (DevSecOps)

### 7.1 Những kiểm tra nên có

- **Secrets scanning**: phát hiện keys/token bị lộ.
- **Dependency scanning**: CVE, license policy.
- **SAST**: lỗi code phổ biến.
- **Container image scanning**: OS packages + libs.
- **IaC scanning**: cấu hình cloud/k8s sai.
- (Tuỳ hệ thống) **DAST** hoặc API security tests ở staging.

### 7.2 Supply chain security

- Pin dependencies bằng lockfile.
- Tạo **SBOM** (Software Bill of Materials).
- Ký artifact/image (sigstore/cosign) và verify khi deploy.
- Hạn chế quyền runner: principle of least privilege.

### 7.3 Quản lý secrets

- Dùng OIDC/workload identity thay vì long-lived keys nếu nền tảng hỗ trợ.
- Secrets chỉ được truy cập theo environment, theo job cần thiết.

---

## 8) Observability cho pipeline và cho release

### 8.1 Metrics quan trọng (DORA)

- Deployment frequency
- Lead time for changes
- Change failure rate
- MTTR (mean time to restore)

### 8.2 Release observability

- Gắn nhãn version/build vào logs/metrics/traces.
- Dashboard theo version để phát hiện regression.
- Alert theo SLO/SLI, tránh alert spam.

### 8.3 Post-deploy verification

- Smoke tests/health checks sau deploy.
- Synthetic checks với user flows quan trọng.

---

## 9) Branching & release strategy

### 9.1 Trunk-based development (khuyến nghị cho CI/CD mạnh)

- Nhánh ngắn, merge thường xuyên.
- Feature flags để ẩn tính năng chưa sẵn sàng.

### 9.2 GitFlow (khi cần quy trình release nặng)

- Nhiều nhánh (develop/release/hotfix) có thể tăng phức tạp.
- Cần kỷ luật cao để tránh drift.

### 9.3 Versioning

- SemVer cho API/library.
- Với services: tag theo SHA + release tag (vd: `v1.2.3`) để dễ truy vết.

---

## 10) Mẫu pipeline tham khảo (khái niệm)

### 10.1 CI cho backend (gợi ý)

- Lint/format → unit tests → integration tests → build image → scan → publish

### 10.2 CI cho frontend (gợi ý)

- Install → lint/typecheck → unit/component tests → build → e2e (tuỳ) → publish static artifacts

### 10.3 CD (gợi ý)

- Promote artifact → deploy staging → smoke + policy checks → approve → deploy prod (rolling/blue-green/canary)

Lưu ý: cú pháp YAML cụ thể sẽ khác nhau giữa GitHub Actions/GitLab CI/Jenkins/Azure DevOps, nhưng nguyên tắc “build once, deploy many” và quality gates vẫn giữ nguyên.

---

## 11) Checklist triển khai CI/CD production-ready

### CI checklist

- [ ] Pipeline chạy dưới 10–15 phút cho PR (hoặc có phân tầng: fast/slow)
- [ ] Lockfile bắt buộc, build reproducible
- [ ] Test strategy rõ ràng, flaky tests được đo và xử lý
- [ ] Artifact immutable, có version/traceability
- [ ] Chạy security scans tối thiểu: secrets + dependencies + SAST

### CD checklist

- [ ] Môi trường staging gần giống production (ít nhất về topology & config quan trọng)
- [ ] Deploy có health checks, readiness, graceful shutdown
- [ ] Có rollback/roll-forward rõ ràng
- [ ] DB migrations backward compatible
- [ ] Observability theo version, có SLO gates cho canary

### Governance checklist

- [ ] Quyền của runner tối thiểu, secrets quản lý đúng chuẩn
- [ ] Audit log cho deploy/approve
- [ ] SBOM + ký artifact (nếu yêu cầu an ninh/compliance cao)

---

## 12) Anti-patterns thường gặp

- **Deploy từ source thay vì artifact**: mỗi environment build ra thứ khác nhau → khó debug.
- **Pipeline quá chậm**: dev tìm cách bypass gates.
- **Chạy tests không ổn định**: mất niềm tin vào CI.
- **Không có chiến lược rollback**: sự cố nhỏ thành outage lớn.
- **Secrets nằm trong repo hoặc log**: rủi ro nghiêm trọng.
- **DB migration breaking**: deploy thất bại hoặc downtime.
- **Không quan sát theo version**: canary/rollout không có dữ liệu để quyết định.

---

## 13) Gợi ý lộ trình nâng cấp CI/CD cho team

1. Chuẩn hóa CI tối thiểu: lint + unit + build + artifact
2. Thêm integration tests và caching để giữ pipeline nhanh
3. Thêm security scans + policy gates
4. Chuẩn hóa CD: staging, promote artifact, rollback
5. Progressive delivery: canary + SLO gates + feature flags
6. Supply chain: SBOM + signing + verify
