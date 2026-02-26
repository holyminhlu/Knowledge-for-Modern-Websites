
# ETL – ELT trong lập trình web (tất tần tật, thực chiến dữ liệu)

## 1) ETL/ELT là gì và vì sao web app cần?

Trong web app, dữ liệu phát sinh ở:

- OLTP database (Postgres/MySQL) của hệ thống nghiệp vụ
- Logs (web server, app logs)
- Events (clickstream, tracking)
- Third-party sources (payment, ads, CRM)

Để làm analytics/BI, ML, reporting, bạn cần pipeline đưa dữ liệu vào **data warehouse/lakehouse** và biến đổi dữ liệu để truy vấn nhanh, đúng, nhất quán.

### 1.1 ETL (Extract – Transform – Load)

- **Extract**: lấy dữ liệu từ nguồn
- **Transform**: làm sạch/chuẩn hoá/biến đổi ở tầng trung gian
- **Load**: nạp vào kho đích

### 1.2 ELT (Extract – Load – Transform)

- Extract từ nguồn
- Load “thô” vào kho đích (warehouse/lake)
- Transform ngay trong kho đích (SQL/engine mạnh)

Điểm khác biệt cốt lõi: vị trí “Transform” diễn ra **trước hay sau** khi load vào kho.

## 2) ETL vs ELT: chọn cái nào?

### 2.1 Khi nào chọn ETL?

ETL hợp khi:

- Kho đích không mạnh về transform (hoặc chi phí query transform quá cao)
- Cần loại bỏ/ẩn dữ liệu nhạy cảm trước khi vào kho
- Nguồn dữ liệu không ổn định, cần chuẩn hoá mạnh trước khi load
- Bạn muốn kiểm soát chặt kiểu dữ liệu và schema trước khi vào warehouse

Nhược điểm:

- Tầng transform trở thành “bottleneck” compute
- Thường khó scale hơn ELT nếu transform nhiều

### 2.2 Khi nào chọn ELT?

ELT hợp khi:

- Warehouse/lakehouse mạnh (BigQuery/Snowflake/Redshift/Databricks)
- Muốn giữ raw data để replay/audit
- Muốn nhiều team tự transform theo nhu cầu (semantic layer)

Nhược điểm:

- Dễ “bừa bãi” nếu không có governance (raw quá nhiều, khó hiểu)
- Nếu không kiểm soát, có thể đẩy dữ liệu nhạy cảm vào kho

### 2.3 Thực tế: “ELT + một chút ETL”

Nhiều hệ production:

- Extract + Load raw
- Transform trong warehouse
- Nhưng vẫn có ETL bước sớm cho:
	- masking/redaction PII
	- dedupe cơ bản
	- chuẩn hoá timestamp/timezone

## 3) Kiến trúc dữ liệu điển hình cho web

### 3.1 Tầng dữ liệu (zones/layers)

Một cách tổ chức phổ biến:

- **Raw/Bronze**: dữ liệu thô, append-only
- **Staging/Silver**: chuẩn hoá, typed, dedupe
- **Mart/Gold**: mô hình phục vụ BI (fact/dim), KPI

### 3.2 Data warehouse vs Data lake vs Lakehouse

- **Warehouse**: tối ưu analytics SQL, schema chặt (BigQuery/Snowflake/Redshift)
- **Lake**: lưu file (S3/GCS) rẻ, flexible, nhưng query cần engine (Spark/Trino)
- **Lakehouse**: lake + table format/ACID (Delta/Iceberg/Hudi)

## 4) Batch vs Streaming (near real-time analytics)

### 4.1 Batch ETL/ELT

- Chạy theo lịch (5 phút/1 giờ/1 ngày)
- Dễ vận hành, phù hợp báo cáo định kỳ

### 4.2 Streaming

- Dữ liệu đổ liên tục (Kafka/Kinesis/PubSub)
- Hợp dashboard near real-time, fraud detection

Trade-off:

- Streaming phức tạp hơn (late events, ordering, exactly-once “ảo”, state)

## 5) Extract (E): lấy dữ liệu từ đâu?

### 5.1 Từ OLTP database

Hai hướng:

- **Query-based extraction**: chạy query theo `updated_at`/watermark
- **CDC (Change Data Capture)**: lấy change log từ binlog/WAL

CDC thường tốt hơn cho scale và correctness (ít miss/dup hơn) nhưng triển khai phức tạp.

### 5.2 Từ logs/events

- App logs
- Clickstream events
- Server access logs

Chú ý:

- Standardize event schema
- Gắn `eventId`, `eventTime`, `ingestTime`

### 5.3 Từ third-party APIs

- Payment, Ads, CRM

Lưu ý:

- Rate limit
- Backfill
- Idempotency

## 6) Load (L): nạp dữ liệu như thế nào?

### 6.1 Full load vs Incremental load

- **Full load**: xoá và nạp lại toàn bộ (đơn giản, tốn)
- **Incremental**: chỉ nạp phần thay đổi (phổ biến)

### 6.2 Watermark

Incremental thường dùng watermark:

- `updated_at` hoặc `eventTime`

Pitfalls:

- Clock skew, timezone
- Update back-in-time

Giải pháp:

- Dùng “lookback window” (ví dụ luôn reload 1–2 ngày gần nhất)
- Hoặc CDC để tránh lệ thuộc timestamp

### 6.3 Upsert và merge

- Warehouse hỗ trợ `MERGE`/upsert.
- Cần key ổn định (`id`/`business_key`).

## 7) Transform (T): biến đổi dữ liệu

### 7.1 Data cleaning & standardization

- Chuẩn hoá timezone
- Parse types (int/decimal)
- Trim/normalize strings
- Dedupe

### 7.2 Data modeling cho BI

Hai cách phổ biến:

- **Dimensional model (Kimball)**: fact + dimension
- **Data vault**: hub/link/satellite (hợp dữ liệu lớn, lineage mạnh)

Trong web analytics:

- Fact: `fact_orders`, `fact_pageviews`
- Dim: `dim_user`, `dim_date`, `dim_product`

### 7.3 SCD (Slowly Changing Dimensions)

Khi dimension thay đổi theo thời gian (ví dụ user đổi plan):

- **SCD Type 1**: overwrite (không lưu lịch sử)
- **SCD Type 2**: lưu version (valid_from/valid_to)

### 7.4 Dữ liệu late/out-of-order

- Streaming/batch đều gặp late event.
- Cần rule:
	- windowing
	- reprocessing
	- dedupe theo eventId

## 8) Data quality: kiểm soát “đúng” và “đủ”

Các kiểm tra quan trọng:

- Schema validation (field tồn tại/kiểu dữ liệu)
- Uniqueness (primary key)
- Completeness (tỷ lệ null)
- Freshness (dữ liệu có cập nhật đúng lịch)
- Validity (range checks)

Khi fail:

- alert
- quarantine dữ liệu
- rollback/re-run pipeline

## 9) Orchestration & scheduling

Bạn cần công cụ điều phối DAG:

- Airflow
- Dagster
- Prefect
- Cloud-native schedulers

Best practices:

- Idempotent tasks
- Retry có backoff
- Separate “extract” và “transform” thành steps rõ
- Version control cho pipeline

## 10) Observability (để pipeline chạy ổn)

Metrics nên có:

- runtime của job
- rows processed
- error rate
- data freshness lag
- warehouse cost/query bytes

Logging:

- job run id
- input watermark
- output partition

Tracing (nếu có):

- lineage giữa tables

## 11) Governance, security, và privacy

### 11.1 PII handling

- Phân loại dữ liệu (public/internal/confidential)
- Masking/redaction cho PII
- Tokenization/encryption nếu cần

### 11.2 Access control

- Principle of least privilege cho warehouse
- Tách quyền read raw vs read marts

### 11.3 Lineage & catalog

- Data catalog để biết table nào từ đâu ra
- Lineage giúp debug và audit

## 12) Backfill và reprocessing

Bạn chắc chắn sẽ cần backfill:

- Khi thêm field mới
- Khi fix bug transform
- Khi thay đổi logic KPI

Best practices:

- Thiết kế pipeline cho phép replay theo partition/date
- Lưu raw đủ lâu để backfill
- Có cơ chế “replace partition” an toàn

## 13) Chi phí (cost) – vấn đề thật sự của ELT

ELT đẩy transform vào warehouse → chi phí query có thể tăng.

Tối ưu:

- Partitioning/clustering
- Incremental models
- Materialize intermediate tables có chọn lọc
- Tránh scan raw toàn bộ mỗi lần

## 14) ETL/ELT trong hệ event-driven

Nếu bạn đã có message broker (Kafka):

- Events có thể là nguồn dữ liệu chính.
- Nhưng cần:
	- schema registry
	- versioning
	- replay semantics

CDC + Kafka + lakehouse là pattern phổ biến để xây dựng “event log” chuẩn.

## 15) Anti-patterns (lỗi hay gặp)

- Không có raw layer → không thể replay/backfill
- Incremental load dựa vào `updated_at` nhưng không có lookback → miss data
- Không dedupe event → double counting KPI
- Transform không versioned → số liệu nhảy lung tung
- Không data quality checks → báo cáo sai mà không biết
- Load PII vào raw mà không có governance
- Job không idempotent → rerun tạo data bẩn

## 16) Checklist production (tóm tắt)

- Chọn ETL vs ELT dựa trên warehouse capability + governance
- Có raw/staging/mart layers
- Incremental + watermark + lookback (hoặc CDC)
- Dedupe + idempotency
- Data quality checks + alerting
- Orchestrator (DAG) + retries/backoff
- Backfill/replay theo partition
- Security: PII handling + least privilege
- Observability: freshness, rows, runtime, cost

---

Nếu bạn cho mình biết stack bạn muốn (BigQuery/Snowflake/Redshift hay lakehouse), mình có thể bổ sung thêm ví dụ “pipeline mẫu” (sources → raw → dbt models → marts) cho đúng môi trường.

