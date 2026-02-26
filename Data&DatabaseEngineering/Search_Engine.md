# Search Engine trong lập trình web (tất tần tật, thực chiến)

## 1) Search Engine là gì và khác DB query thế nào?

Trong web, “search” thường có nghĩa:

- tìm theo **ngôn ngữ tự nhiên** (full-text)
- hỗ trợ **typo**, **synonyms**, **ranking**
- lọc theo facets (category/price/brand)
- highlight, autocomplete

Database (OLTP) mạnh về:

- transaction, join, consistency
- query chính xác theo điều kiện

Search engine mạnh về:

- full-text + relevance (xếp hạng)
- text analysis (tokenization, stemming)
- faceted search, aggregations
- tốc độ truy vấn cho read-heavy

Nguyên tắc:

- DB là **source of truth**.
- Search index là **read model** tối ưu cho search.

## 2) Các khái niệm nền tảng

### 2.1 Inverted index (chỉ mục đảo)

Thay vì lưu “document → từ”, inverted index lưu “từ → danh sách documents chứa từ đó”.

Ví dụ:

- token `"iphone"` xuất hiện ở doc 12, 30, 99
- query nhanh vì lookup theo token

### 2.2 Document

Trong Elasticsearch/OpenSearch, đơn vị được index là **document** (thường là JSON) đại diện cho một entity (product, article, user…).

### 2.3 Analyzer

Analyzer biến text thành tokens:

- lowercase
- bỏ dấu/normalize
- stemming/lemmatization (tuỳ ngôn ngữ)
- stopwords

Analyzer quyết định “search có ra đúng không”.

### 2.4 Mapping/Schema

Định nghĩa kiểu field:

- `text` (full-text)
- `keyword` (exact match, filtering, aggregations)
- `number`, `date`, `boolean`, `geo_point`…

Sai mapping là nguyên nhân phổ biến của search lỗi/slow.

## 3) Các loại search phổ biến trong web

### 3.1 Full-text search

- match query, phrase query, boolean
- relevance scoring

### 3.2 Autocomplete / Typeahead

- gợi ý khi người dùng gõ
- thường dùng prefix search hoặc completion suggester

### 3.3 Faceted search (filter + aggregation)

- filter theo category/brand/price range
- hiển thị số lượng theo facet

### 3.4 Fuzzy search (typo tolerance)

- `iphnoe` vẫn ra `iphone`
- cần cẩn trọng vì tốn CPU nếu cấu hình quá rộng

### 3.5 Synonyms

- `"đt"` ≈ `"điện thoại"`
- `"notebook"` ≈ `"laptop"`

### 3.6 Geo search

- tìm theo khoảng cách, near me
- cần field geo và index phù hợp

## 4) Ranking/Relevance (xếp hạng) – phần khó nhất

Search không chỉ “có/không”, mà là “kết quả nào ở trên”.

Yếu tố ảnh hưởng:

- TF-IDF/BM25 (mặc định của nhiều engine)
- field boosting (title quan trọng hơn description)
- freshness (bài mới)
- popularity (sales, clicks)
- personalization (tuỳ user)

Chiến lược thực dụng:

1. Làm relevance “cơ bản đúng” bằng analyzer + mapping
2. Boost field hợp lý
3. Thêm business signals (popularity, in-stock)
4. Đo lường và tune dựa trên logs

## 5) Chọn giải pháp: DB FTS vs Elasticsearch/OpenSearch vs Algolia

### 5.1 Full-text search trong DB (Postgres/MySQL)

Ưu:

- đơn giản, ít hệ phụ
- consistency mạnh (cùng DB)

Nhược:

- khả năng ranking/facets/typo/synonyms có thể hạn chế
- scale search workload có thể ảnh hưởng OLTP

Hợp khi:

- data nhỏ-trung bình
- yêu cầu search cơ bản

### 5.2 Elasticsearch/OpenSearch

Ưu:

- full-text mạnh, analyzers đa dạng
- aggregations/facets tốt
- scale theo shards/replicas

Nhược:

- vận hành phức tạp (cluster, heap, GC)
- eventual consistency với DB

### 5.3 SaaS search (Algolia/Meilisearch Cloud…)

Ưu:

- setup nhanh, UX tốt (autocomplete, typo)
- ít vận hành

Nhược:

- chi phí theo usage
- lock-in

## 6) Kiến trúc đồng bộ dữ liệu: DB → Search index

Vì DB là source of truth, bạn cần pipeline sync:

### 6.1 Khi nào update index?

- Create/update/delete ở DB
- Thay đổi inventory/price/status

### 6.2 Các cách sync phổ biến

1. **Dual-write (app viết DB và search)**
   - dễ làm nhưng dễ lệch nếu 1 bên fail

2. **Outbox + consumer** (khuyến nghị)
   - write DB + outbox trong cùng transaction
   - consumer đọc outbox và cập nhật search

3. **CDC (Change Data Capture)**
   - đọc WAL/binlog để bắt changes
   - phù hợp hệ lớn, giảm coupling

### 6.3 Reindex

Bạn sẽ cần reindex khi:

- đổi mapping/analyzer
- đổi logic ranking
- thêm field

Chiến lược reindex an toàn:

- tạo index mới `products_v2`
- bulk reindex
- chuyển alias từ `products` → `products_v2`
- xoá v1 sau khi ổn định

## 7) Modeling dữ liệu cho search

### 7.1 Denormalize có chủ đích

Search index thường chứa document “đủ để search”:

- product + categoryName + brandName + tags + price + inStock…

Không nên rely vào join realtime trong search.

### 7.2 Text vs keyword

- Field cần search: `text`
- Field cần filter/sort/group: `keyword`/numeric/date

### 7.3 Sort

- Sort theo price/date cần field kiểu numeric/date.
- Sort theo text cần keyword subfield.

## 8) Pagination trong search

### 8.1 Offset pagination

- Dễ dùng.
- Nhưng deep pagination chậm (tốn).

### 8.2 Search-after / cursor

- Tốt cho deep pagination.
- Cần sort ổn định và cursor.

Trong UI e-commerce, thường giới hạn số page hoặc dùng cursor.

## 9) Performance & scaling

### 9.1 Shards và replicas (ES/OpenSearch)

- Shard là đơn vị phân mảnh dữ liệu.
- Replica tăng availability và tăng throughput read.

Pitfalls:

- Quá nhiều shards nhỏ → overhead lớn.
- Shard quá to → khó di chuyển/rebalance.

### 9.2 Query optimization

- Filter context (cacheable) vs scoring queries
- Giới hạn fuzzy
- Tránh wildcard leading `*term`
- Precompute fields (normalize) để giảm runtime cost

### 9.3 Bulk indexing

- Dùng bulk API.
- Tune batch size.
- Throttle để không làm cluster quá tải.

## 10) Consistency và trải nghiệm người dùng

Search index thường **eventually consistent**.

Các tình huống:

- user vừa tạo product nhưng search chưa thấy

Giải pháp UX:

- với admin: hiển thị trực tiếp từ DB cho màn quản trị
- với search: chấp nhận delay vài giây
- có thể “refresh” index cho một số use case (tốn tài nguyên)

## 11) Security & access control

### 11.1 Không expose cluster public

- Đặt search engine trong private network
- API backend là nơi kiểm soát authz

### 11.2 Filter theo tenant

- Multi-tenant: mọi document có `tenant_id`
- Query luôn filter `tenant_id`
- Cẩn trọng tránh bug “quên filter” → lộ dữ liệu

### 11.3 Field-level security

- Nếu dữ liệu nhạy cảm, đừng index hoặc index ở index riêng.

## 12) Observability (để tune relevance và vận hành)

### 12.1 Metrics vận hành

- query rate, p95 latency
- error rate
- CPU/memory/heap, GC
- indexing rate
- refresh/merge time
- disk usage

### 12.2 Search analytics

- top queries
- zero-result queries
- click-through rate
- conversion rate từ search

Những dữ liệu này giúp tune synonyms, boosting, và UI.

## 13) Testing relevance

Hai lớp test:

- Unit test analyzer/mapping (tokenization có đúng không)
- Relevance test: tập query → expected top results (golden set)

Nếu có đủ data:

- A/B testing ranking

## 14) Anti-patterns (lỗi hay gặp)

- Dùng DB làm search engine bằng `LIKE '%term%'` trên bảng lớn
- Không có pipeline sync chuẩn (dual-write không xử lý failure)
- Không có reindex strategy (đổi mapping là “toang”)
- Index sai kiểu field (text vs keyword) → filter/sort không chạy
- Cho fuzzy quá rộng → query chậm
- Expose Elasticsearch ra internet
- Quên tenant filter trong query

## 15) Checklist production (tóm tắt)

- Chọn giải pháp đúng: DB FTS vs ES/OpenSearch vs SaaS
- Thiết kế mapping + analyzer cho ngôn ngữ (tiếng Việt cần normalize/khử dấu tuỳ yêu cầu)
- Denormalize document đủ dùng cho search
- Sync từ DB bằng outbox/CDC, có retry + DLQ
- Có reindex + alias strategy
- Giới hạn query complexity (fuzzy/wildcard), rate limit
- Observability đầy đủ + search analytics
- Security: private cluster + tenant filtering

---

Nếu bạn muốn, mình có thể bổ sung một mục riêng về “Search tiếng Việt” (khử dấu, word segmentation, synonyms) và một kiến trúc mẫu “OLTP → outbox → consumer → Elasticsearch”.
