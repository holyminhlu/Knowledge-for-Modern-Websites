---
title: SSR vs CSR (và các chiến lược render hiện đại)
description: Handbook thực chiến về chiến lược render frontend cho web: CSR, SSR, SSG, ISR, hydration/streaming, SEO, performance, caching, bảo mật, và lựa chọn kiến trúc theo use case.
---

# SSR/CSR trong lập trình web

## 1) Từ “rendering strategy” đến trải nghiệm người dùng

Khi bạn chọn CSR/SSR/SSG/ISR, thực chất bạn đang quyết định:

- **HTML ban đầu** được tạo ở đâu (server hay browser) và khi nào.
- **JS tải về** bao nhiêu và có bắt buộc để thấy nội dung hay không.
- **SEO/crawlability** và chia sẻ link (OG tags) hoạt động ra sao.
- **Hiệu năng cảm nhận** (TTFB, FCP, LCP, INP) và khả năng cache/CDN.
- **Độ phức tạp vận hành**: server rendering, edge, cache invalidation, observability.

Không có “chiến lược tốt nhất” cho mọi trang; đúng hơn là **đúng chiến lược cho từng route/use case**.

---

## 2) Định nghĩa nhanh

### 2.1 CSR (Client-Side Rendering)

- Server trả về HTML “vỏ” (shell) + JS bundle.
- Browser tải JS, chạy code, fetch data, rồi render UI.

Ưu:

- Tận dụng caching tĩnh tốt cho asset.
- Interactivity mạnh, app-like.
- Server đơn giản (có thể chỉ serve static files).

Nhược:

- Nội dung có thể đến muộn (phụ thuộc JS + data fetch).
- SEO có thể khó hơn nếu bot không chạy JS tốt.
- Dễ bị “JS bloat” và performance xấu trên mobile.

### 2.2 SSR (Server-Side Rendering)

- Mỗi request, server render HTML đầy đủ (hoặc phần lớn) rồi trả về.
- Browser nhận HTML, hiển thị sớm; sau đó tải JS để **hydrate** (gắn event handlers, biến trang thành interactive).

Ưu:

- TTFB/FCP có thể tốt nếu server nhanh.
- SEO/OG tags thường dễ.
- Cảm giác tải trang “có nội dung” sớm.

Nhược:

- Server tốn CPU/memory hơn, cần scale.
- Time-to-interactive phụ thuộc hydration (JS vẫn phải tải).
- Cache khó hơn vì HTML phụ thuộc user/session.

### 2.3 SSG (Static Site Generation)

- Render HTML **tại build time** (trước khi deploy).
- Serve qua CDN như file tĩnh.

Ưu:

- Rất nhanh và rẻ (CDN cache).
- Tốt cho SEO.
- Độ ổn định cao.

Nhược:

- Nội dung động theo user gần như không phù hợp.
- Build time có thể dài nếu nhiều pages.
- Dữ liệu cập nhật yêu cầu rebuild hoặc cơ chế bổ sung.

### 2.4 ISR (Incremental Static Regeneration)

- Kết hợp SSG + khả năng **revalidate** (tạo lại trang) theo thời gian hoặc trigger.

Ưu:

- Cân bằng giữa tốc độ CDN và dữ liệu cập nhật.

Nhược:

- Phức tạp hơn: cache invalidation, consistency, stale content.

### 2.5 Hybrid rendering

Một ứng dụng thực tế thường là hybrid:

- Landing pages: SSG/ISR
- Product listing: SSR/ISR
- Authenticated dashboard: SSR hoặc CSR (tuỳ)
- Admin tools: CSR (đơn giản)

---

## 3) Các chỉ số hiệu năng liên quan (Web Vitals)

- **TTFB**: thời gian nhận byte đầu tiên (SSR thường ảnh hưởng mạnh).
- **FCP**: khi nội dung đầu tiên xuất hiện.
- **LCP**: khi nội dung chính xuất hiện.
- **INP** (thay thế FID): độ trễ phản hồi tương tác.
- **CLS**: layout shift.

Gợi ý:

- CSR thường TTFB tốt (HTML shell nhanh) nhưng FCP/LCP có thể xấu nếu JS/data nặng.
- SSR/SSG cải thiện FCP/LCP nhưng nếu hydration nặng thì INP/TTI xấu.

---

## 4) Hydration, rehydration và các vấn đề thường gặp

### 4.1 Hydration là gì?

- SSR trả HTML + dữ liệu ban đầu.
- Browser tải JS bundle và “gắn” logic React/Vue/etc vào DOM hiện có.

### 4.2 Hydration cost

- JS parse/compile/execution có thể đắt trên mobile.
- Nếu component tree lớn, hydration làm chậm tương tác.

### 4.3 Hydration mismatch

Nguyên nhân:

- Render server và client khác nhau (dựa vào `Date.now()`, random, timezone, user-agent, feature detection).
- Dữ liệu thay đổi giữa lúc SSR và CSR fetch.

Cách giảm:

- Tránh non-deterministic output.
- Serialize “initial state” nhất quán.
- Dùng boundary/partial hydration nếu framework hỗ trợ.

### 4.4 Partial/Selective hydration (ý tưởng)

- Không hydrate toàn bộ trang; chỉ hydrate phần cần tương tác.
- Thường đi kèm component islands.

---

## 5) Streaming SSR và server components (khái niệm)

### 5.1 Streaming SSR

- Server bắt đầu gửi HTML từng phần khi sẵn sàng.
- Giúp người dùng thấy layout/nội dung dần, giảm perceived latency.

Yêu cầu:

- Hạ tầng hỗ trợ streaming (proxy/load balancer không buffer toàn bộ).
- Thiết kế UI phù hợp với suspense/loading boundaries.

### 5.2 Server Components / Islands architecture

- Một phần UI render ở server và không cần gửi JS xuống client.
- Phần tương tác mới là client components.

Lợi ích:

- Giảm JS bundle.
- Cải thiện INP/TTI.

Đổi lại:

- Tư duy dữ liệu & component boundaries phức tạp hơn.

---

## 6) SEO & social sharing

### 6.1 SEO thực tế cần gì?

- HTML có nội dung chính và metadata.
- Các thẻ `title`, `meta description`, canonical.
- Open Graph/Twitter cards đúng cho share.
- Structured data (JSON-LD) nếu cần.

### 6.2 SSR/SSG thường thuận lợi

- Bot có thể crawl HTML ngay.

### 6.3 CSR vẫn có thể SEO, nhưng phải làm đúng

- Nếu dựa hoàn toàn vào JS để render nội dung, crawl có thể chậm/không ổn định.
- Có thể dùng pre-rendering/SSR cho các route quan trọng.

---

## 7) Caching: điểm mạnh lớn nhất của SSG/ISR

### 7.1 Caching layers

- **Browser cache**: static assets.
- **CDN/Edge cache**: HTML/JSON.
- **Reverse proxy cache**: Varnish/Nginx.
- **Application cache**: in-memory/Redis.

### 7.2 Cache cho SSR

- Nếu HTML phụ thuộc user/auth, khó cache toàn trang.
- Có thể cache theo:
  - Route công khai (public pages)
  - Segment (geo, language)
  - Micro-caching vài giây

### 7.3 Stale-while-revalidate

- Trả bản cached (stale) nhanh, đồng thời refresh nền.
- Phù hợp nội dung không quá nhạy thời gian.

---

## 8) Dữ liệu và auth: vấn đề “đau đầu” khi SSR

### 8.1 Authenticated SSR

Thách thức:

- SSR cần biết user là ai (cookies/session).
- Gọi API/data layer từ server.
- Tránh SSR tạo “N+1 calls” cho từng widget.

Thực hành tốt:

- Server-side fetch dùng credential forwarding an toàn.
- Prefer BFF (Backend-for-Frontend) để tối ưu data shape.
- Dùng caching theo user/tenant khi hợp lý.

### 8.2 CSR cho dashboard

- Dashboard thường nặng tương tác; CSR đôi khi hợp lý.
- Tuy nhiên vẫn có thể dùng SSR cho shell + CSR cho nội dung.

---

## 9) Bảo mật theo từng strategy

### CSR

- XSS rất nguy hiểm vì JS nhiều; cần CSP, escape output, tránh `dangerouslySetInnerHTML`.
- Token storage: cân nhắc HttpOnly cookies vs localStorage (tuỳ mô hình).

### SSR

- SSR có thể bị SSRF nếu server fetch URL theo input user.
- Rò rỉ dữ liệu do cache sai scope (cache HTML của user A cho user B).
- Cần chống injection trong template/serialization.

### SSG/ISR

- Ít rủi ro runtime hơn, nhưng build pipeline phải an toàn (supply chain).

---

## 10) Deploy & vận hành

### 10.1 CSR/SSG

- Có thể host hoàn toàn trên CDN/static hosting.
- Scale gần như “miễn phí” so với SSR.

### 10.2 SSR

- Cần compute (server/edge functions).
- Cần observability: latency theo route, error rate, cold start.
- Cần auto-scaling và capacity planning.

### 10.3 Edge rendering

- Render gần người dùng (giảm latency).
- Hạn chế: runtime APIs bị giới hạn, cold start, kết nối DB trực tiếp khó; thường cần edge-friendly data access.

---

## 11) Cách chọn SSR/CSR/SSG/ISR theo use case

### 11.1 Landing / marketing pages

- Ưu tiên: SEO, tốc độ, cache.
- Khuyến nghị: **SSG/ISR**.

### 11.2 Blog/docs

- Khuyến nghị: **SSG** (hoặc ISR nếu cập nhật thường xuyên).

### 11.3 E-commerce (listing/product)

- Ưu tiên: SEO + freshness (giá/tồn kho).
- Khuyến nghị: **SSR + caching** hoặc **ISR + revalidate**.

### 11.4 Dashboard sau đăng nhập

- Ưu tiên: interactivity, data per-user.
- Khuyến nghị: **CSR** hoặc **SSR shell + CSR data**.

### 11.5 Search

- Nếu SEO quan trọng: SSR cho kết quả tìm kiếm (công khai), CSR cho refinement/filter.

---

## 12) Patterns thực chiến

### 12.1 App Shell + Hydrate

- SSR shell/layout, CSR fetch phần data nặng.

### 12.2 BFF (Backend-for-Frontend)

- Tổng hợp dữ liệu cho SSR để giảm round-trips.

### 12.3 Route-level strategy

- Mỗi route chọn strategy riêng (hybrid) thay vì “một kiểu cho tất cả”.

### 12.4 Progressive enhancement

- Nội dung cơ bản hoạt động không cần JS; JS chỉ tăng trải nghiệm.

---

## 13) Checklist production-ready

### Performance

- [ ] Đo Web Vitals (field + lab) theo route
- [ ] Giảm JS bundle (code-splitting, treeshake)
- [ ] Tránh hydration cost quá lớn (partial hydration/islands nếu có)
- [ ] Image optimization + lazy loading

### SEO

- [ ] Metadata/OG tags đúng
- [ ] Canonical URLs
- [ ] Structured data (nếu cần)

### Caching

- [ ] Cache policy rõ ràng cho HTML/JSON/assets
- [ ] Tránh cache leak dữ liệu per-user
- [ ] Có chiến lược invalidation/revalidate

### Reliability

- [ ] Graceful degradation khi data fetch lỗi
- [ ] Observability (latency/error per route)
- [ ] Runbook cho sự cố SSR/edge

---

## 14) Anti-patterns

- **SSR mọi thứ** dù không cần SEO → tăng chi phí và độ phức tạp.
- **CSR mọi thứ** cho site cần SEO mạnh → crawlability không ổn định.
- **Hydrate toàn bộ trang** với JS nặng → INP xấu trên mobile.
- **Cache HTML sai scope** → leak dữ liệu user.
- **Dựa vào server render nhưng backend chậm** → TTFB tăng, UX tệ.
