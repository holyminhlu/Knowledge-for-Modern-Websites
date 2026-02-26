---
title: Containerization
description: Handbook thực chiến về containerization cho hệ thống web: Docker/OCI, image build, runtime, networking/storage, Compose, best practices, security và vận hành production.
---

# Containerization trong lập trình web

## 1) Containerization là gì?

**Containerization** là kỹ thuật đóng gói ứng dụng cùng dependency (runtime, libs, tools tối thiểu) thành một **container image** để chạy nhất quán trên nhiều môi trường (dev/CI/staging/prod).

Container không phải VM:

- **VM** ảo hóa cả OS/kernel (thông qua hypervisor). Mỗi VM thường nặng và boot chậm.
- **Container** chia sẻ kernel host (Linux kernel trên Linux; trên Windows/macOS thường chạy qua VM mỏng), cô lập bằng namespaces/cgroups.

Lợi ích cho web apps:

- **Reproducible**: “works on my machine” giảm mạnh.
- **Deploy nhanh**: build once → run anywhere.
- **Scale tốt**: instance ephemeral, dễ autoscale.
- **Chuẩn hóa**: môi trường runtime, logging, healthchecks.

---

## 2) Thuật ngữ quan trọng (OCI/Docker)

- **OCI (Open Container Initiative)**: chuẩn cho image format và runtime.
- **Image**: template bất biến, gồm nhiều layers (filesystem snapshot + metadata).
- **Container**: một instance đang chạy của image.
- **Registry**: nơi lưu image (Docker Hub, GHCR, ECR, GCR...).
- **Tag**: nhãn tham chiếu một manifest (vd: `app:1.2.3`).
- **Digest**: định danh bất biến (sha256), đáng tin hơn tag.
- **Dockerfile**: mô tả cách build image.
- **Entrypoint/CMD**: lệnh chạy chính.
- **Volume / bind mount**: storage gắn vào container.
- **Network**: bridge/host/overlay… dùng để container giao tiếp.

---

## 3) Khi nào nên/không nên containerize?

### Nên

- Deploy lên Kubernetes/ECS/Nomad/Compose.
- Dịch vụ cần scaling nhanh, môi trường đồng nhất.
- CI cần build/test reproducible.

### Cân nhắc kỹ

- App GUI nặng, cần hardware đặc thù.
- Workload cực kỳ latency-sensitive (vẫn làm được nhưng phải tuning kỹ).

### Không nên (hoặc không có lợi)

- Script chạy 1 lần rất đơn giản, không có deployment pipeline.
- Ứng dụng bị ràng buộc chặt với OS host (driver/hardware) mà container không hỗ trợ tốt.

---

## 4) Cách build image đúng chuẩn production

### 4.1 Nguyên tắc: nhỏ, bất biến, tối thiểu

- Chỉ cài thứ cần để **run**, không nhồi tool dev.
- Prefer base image nhỏ (alpine/distroless) nhưng cân nhắc compatibility (glibc vs musl).
- Tránh “latest” trong production: pin version hoặc digest.

### 4.2 Multi-stage builds

Multi-stage giúp tách **builder stage** (compiler, dev deps) và **runtime stage** (chỉ runtime).

Lợi ích:

- Image nhỏ hơn
- Ít bề mặt tấn công hơn
- Build nhanh hơn khi cache tốt

### 4.3 Layering & cache

- COPY những file ít đổi trước (lockfile) để tận dụng cache.
- Gộp các bước liên quan trong một RUN để giảm layers (không quá cực đoan).
- Không để secrets trong layer history.

### 4.4 .dockerignore

- Loại bỏ `node_modules`, build artifacts, `.git`, secrets, logs…
- Giảm context → build nhanh và an toàn hơn.

### 4.5 Image metadata

- Labels (version, commit SHA, build time, source)
- Expose ports (mang tính tài liệu)

---

## 5) Runtime fundamentals: process, signal, health

### 5.1 Một container = một “main process”

- Container lifecycle gắn với PID 1.
- PID 1 phải xử lý signal chuẩn (SIGTERM) để graceful shutdown.
- Nếu dùng shell entrypoint, cẩn thận signal không propagate đúng.

### 5.2 Graceful shutdown

Web servers nên:

- Nhận SIGTERM
- Ngừng nhận request mới
- Draining connections trong thời gian giới hạn
- Flush logs/metrics

### 5.3 Healthchecks

- **Liveness**: process còn sống?
- **Readiness**: sẵn sàng nhận traffic?
- **Startup** (nếu có): giai đoạn warmup.

Quan trọng: health endpoint không được phụ thuộc hoàn toàn vào downstream “bất ổn” (nếu không sẽ tự kill vòng lặp).

---

## 6) Networking cho web services

### 6.1 Port mapping

- Container thường listen trên `0.0.0.0:<port>` trong container.
- Host publish port (vd: 80/443) tuỳ orchestrator.

### 6.2 Service discovery

- Docker Compose: dùng service name như DNS.
- Kubernetes: Service/ClusterIP + DNS.

### 6.3 Reverse proxy / ingress

- Dùng nginx/traefik/envoy để TLS termination, routing, rate limit, headers.
- Mỗi service giữ trách nhiệm app logic; edge concerns đặt ở ingress/gateway.

---

## 7) Storage: stateless vs stateful

### 7.1 Stateless (khuyến nghị)

- Web app nên stateless để scale ngang dễ.
- Session nên đưa ra external store (Redis) hoặc dùng JWT tùy use case.

### 7.2 Volumes

- Dùng volume/bind mount cho data cần persist (uploads, DB data) nhưng production thường tách state ra dịch vụ riêng (S3, managed DB).

### 7.3 Immutable infrastructure

- Không sửa file trong container ở runtime để “fix nóng”.
- Thay vào đó: build image mới và redeploy.

---

## 8) Cấu hình (12-factor) trong container

- Config qua **environment variables** hoặc mounted config files.
- Tách secrets khỏi image.
- Không bake environment-specific config vào image (trừ default hợp lý).

---

## 9) Docker Compose trong dev/staging

Compose phù hợp để:

- Dev local: chạy app + DB + cache + queue.
- Staging nhỏ: demo/POC.

Thực hành tốt:

- Dùng healthcheck + depends_on (nhưng vẫn cần retry trong app).
- Tách file: `compose.yml` (base) + override theo môi trường.
- Không dùng Compose như production orchestrator nếu không có tooling vận hành tương ứng.

---

## 10) Container security (rất quan trọng)

### 10.1 Principle of least privilege

- Không chạy app bằng root nếu không cần.
- Drop Linux capabilities (nếu orchestrator hỗ trợ).
- Read-only filesystem (nếu phù hợp).

### 10.2 Secrets

- Dùng secret manager (Vault/SM/EKS secrets…) thay vì ENV plain text.
- Tránh log secrets.

### 10.3 Supply chain

- Pin base image version/digest.
- Scan CVE cho image.
- Tạo SBOM và (nếu có) ký image, verify khi deploy.

### 10.4 Attack surface

- Image nhỏ + ít packages.
- Xóa package manager/cache nếu không cần.
- Không để SSH server trong container (anti-pattern).

---

## 11) Logging/metrics/tracing trong container

- Logging: ghi ra stdout/stderr để runtime thu thập.
- Metrics: expose endpoint (Prometheus) hoặc sidecar/agent.
- Tracing: propagate trace headers; gắn version/commit SHA vào spans.

---

## 12) Tích hợp với CI/CD

### 12.1 Build

- CI build image từ Dockerfile, tag theo commit SHA.
- Chạy unit/integration tests (có thể trong container).

### 12.2 Publish

- Push lên registry.
- Dùng digest để promote qua environments.

### 12.3 Deploy

- Rolling/blue-green/canary.
- Post-deploy smoke tests + SLO gates.

---

## 13) Những “gotchas” thường gặp khi containerize web apps

### 13.1 Binding sai interface

- App listen `127.0.0.1` trong container → bên ngoài không truy cập được.
- Nên listen `0.0.0.0`.

### 13.2 Timezone/locale

- Thiết lập rõ ràng (ưu tiên UTC).
- Tránh logic phụ thuộc timezone host.

### 13.3 File permissions

- Khi chạy non-root, cần set owner/permissions đúng trong build.

### 13.4 DNS & connection pooling

- Trong môi trường orchestrator, IP có thể thay đổi; dùng DNS và client retry.
- Connection pool nên có TTL/refresh.

### 13.5 Resource limits

- Set CPU/memory limits.
- Tránh OOM killer bằng cách tune runtime (Node/Java/Python).

---

## 14) Checklist containerization production-ready

### Image

- [ ] Multi-stage build
- [ ] Base image pin version/digest
- [ ] `.dockerignore` đầy đủ
- [ ] Tag theo commit SHA + metadata labels
- [ ] Scan CVE + policy gates (tuỳ yêu cầu)

### Runtime

- [ ] Chạy non-root (khi có thể)
- [ ] Graceful shutdown (SIGTERM)
- [ ] Readiness/liveness checks
- [ ] Log ra stdout/stderr
- [ ] Resource limits và tuning runtime

### Security

- [ ] Secrets không nằm trong image/layer
- [ ] Least privilege, drop capabilities
- [ ] SBOM/signing (nếu yêu cầu)

---

## 15) Anti-patterns

- **Dùng tag `latest` cho production**: không truy vết được, dễ “deploy nhầm”.
- **Cài tool debug/ssh vào image prod**: tăng bề mặt tấn công.
- **Lưu state trong container filesystem**: scale/rollout dễ mất dữ liệu.
- **Build lại image cho mỗi environment**: mất nguyên tắc build once, deploy many.
- **Hard-code secrets/config** trong Dockerfile hoặc repo.
- **Không xử lý SIGTERM**: rollout/scale gây downtime.
