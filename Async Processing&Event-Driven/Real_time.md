# Real-time trong lập trình web (từ cơ bản đến triển khai production)

## 1) Real-time là gì?

Trong web, **real-time** thường không có nghĩa “tức thời tuyệt đối”, mà là **độ trễ đủ thấp để người dùng cảm nhận sự cập nhật diễn ra ngay lập tức**.

Một số khái niệm hay dùng:

- **Latency (độ trễ)**: thời gian từ lúc sự kiện xảy ra → UI nhận và hiển thị.
- **End-to-end latency budget**: chia ngân sách độ trễ cho từng chặng (client → network → edge/LB → app → broker → app → client).
- **Near real-time**: cập nhật theo giây (1–5s), vẫn “real-time” với dashboard/analytics nhiều trường hợp.
- **Soft real-time** vs **Hard real-time**:
  - Web đa phần là soft real-time (trễ vài trăm ms vẫn chấp nhận), khác với hard real-time (trễ vượt ngưỡng là lỗi nghiêm trọng) trong hệ nhúng.

### Khi nào cần real-time?

Các use case phổ biến:

- Chat, customer support, comment live
- Thông báo (notifications), badge count
- Live dashboard (monitoring, order status, tracking)
- Multiplayer game, presence (online/offline), typing indicator
- Collaborative editing (Google Docs-like)
- Trading/price ticker (cần kiểm soát độ trễ và thứ tự)

## 2) Bài toán cốt lõi của real-time trên web

Để “real-time” hoạt động tốt, bạn cần xử lý đồng thời nhiều vấn đề:

- **Cơ chế push**: server đẩy dữ liệu sang client (khác với request/response truyền thống).
- **Kết nối dài (long-lived connection)**: duy trì kết nối để giảm overhead.
- **Fan-out**: một sự kiện → nhiều người nhận (room/topic/follower).
- **Scale connections**: hàng nghìn đến hàng triệu kết nối đồng thời.
- **Đảm bảo đúng quyền**: user chỉ nhận được những event mà họ được phép.
- **Độ tin cậy**: mất mạng, reconnect, trùng event, thiếu event.
- **Backpressure**: client chậm, mạng nghẽn, server phải xử lý thế nào.
- **Quan sát/điều hành**: metrics, logging, tracing để debug.

## 3) Các cơ chế real-time phổ biến trong web

### 3.1 Polling (short polling)

- Client định kỳ gọi API (ví dụ mỗi 2s) để hỏi có gì mới.
- Ưu: đơn giản, chạy được mọi nơi.
- Nhược: tốn request, độ trễ phụ thuộc chu kỳ polling, dễ gây tải.
- Hợp với: near real-time, traffic thấp.

### 3.2 Long polling

- Client gọi API, server giữ request mở cho đến khi có dữ liệu (hoặc timeout), rồi client gọi lại.
- Ưu: giảm request rỗng so với polling, vẫn dùng HTTP.
- Nhược: vẫn tốn tài nguyên (threads/connection), phức tạp hơn, dễ bị proxy/timeouts.
- Hợp với: fallback khi không dùng được WebSocket/SSE.

### 3.3 Server-Sent Events (SSE)

- Kết nối **HTTP một chiều**: server → client.
- Dựa trên `text/event-stream` (EventSource trong trình duyệt).
- Ưu:
  - Tự động reconnect.
  - Hỗ trợ resume qua `Last-Event-ID`.
  - Dễ đi qua proxy hơn WebSocket trong nhiều hệ.
  - Rất phù hợp cho notifications, live feeds, dashboard.
- Nhược:
  - **Một chiều** (client muốn gửi lên server vẫn phải dùng HTTP riêng).
  - Giới hạn tùy browser/proxy (số connection/host).
  - Không phù hợp cho payload nhị phân lớn.

### 3.4 WebSocket

- Kết nối **full-duplex** lâu dài (2 chiều) sau bước handshake HTTP.
- Ưu:
  - 2 chiều, latency thấp, phù hợp chat/game/collab.
  - Có thể gửi text hoặc binary.
- Nhược:
  - Cần xử lý reconnect/heartbeat ứng dụng.
  - LB/proxy phải hỗ trợ `Upgrade`.
  - Stateful hơn trong vận hành (connection affinity, draining khi deploy).

### 3.5 WebRTC (DataChannel)

- P2P (hoặc SFU/MCU) cho audio/video, cũng có data channel.
- Ưu:
  - P2P latency thấp, tối ưu media.
- Nhược:
  - Phức tạp (NAT traversal, ICE/STUN/TURN).
  - Thường không dùng cho “chat text” thông thường; hay dùng cho call/streaming.

### 3.6 Socket.IO và các thư viện “real-time abstraction”

- Thư viện như **Socket.IO** thường cung cấp:
  - fallback (polling → websocket), rooms, ack, reconnect.
- Đổi lại: có overhead, vendor-specific protocol, phải đồng bộ client/server.

### 3.7 GraphQL Subscriptions (và “realtime GraphQL”)

- **GraphQL Subscriptions** thường chạy trên WebSocket (hoặc một số transport tương tự) để server push kết quả.
- Ưu:
  - Client chỉ cần “subscribe” theo schema, dễ tích hợp với hệ sinh thái GraphQL.
  - Tái sử dụng auth, type system.
- Nhược:
  - Cần thiết kế cẩn thận để không tạo query nặng chạy liên tục.
  - Khi scale, vẫn quay lại bài toán pub/sub và fan-out.

Biến thể liên quan:

- **GraphQL Live Query**: server tự re-run query khi data thay đổi, phù hợp dashboard.
- Các nền tảng như **Hasura** hỗ trợ subscription dựa trên database triggers/streaming, tiện cho CRUD realtime.

### 3.8 Streaming qua HTTP (gRPC streaming / HTTP chunked)

- Một số hệ dùng streaming response (server gửi dần) dựa trên HTTP/2.
- Trên browser, gRPC truyền thống bị hạn chế; có thể dùng gRPC-web (tùy use case) hoặc SSE/WebSocket là phổ biến hơn.

## 4) Chọn công nghệ nào?

### Câu hỏi gợi ý để chọn

- Bạn cần **2 chiều** (client gửi liên tục) hay chỉ **server push**?
- Bạn cần **ordering** trong một room? Có cần replay?
- Số lượng client đồng thời? Tần suất event (msg/s)?
- Payload: nhỏ (JSON) hay lớn (binary)?
- Hạ tầng proxy/LB có hỗ trợ WebSocket không?

### Quy tắc chọn nhanh (thực dụng)

- **Notifications / live feed / dashboard**: ưu tiên **SSE**.
- **Chat / collab / game nhẹ**: **WebSocket**.
- **Video/audio call**: **WebRTC**.
- **MVP đơn giản / traffic thấp**: polling/long polling (sau đó nâng cấp).

## 5) Kiến trúc real-time điển hình (production)

### 5.1 Các thành phần thường gặp

- **Client** (web/mobile): giữ connection + render UI.
- **Edge / Load Balancer**: terminate TLS, route traffic.
- **Real-time Gateway** (WebSocket/SSE server): quản lý connection, auth, subscribe rooms.
- **App Services**: xử lý nghiệp vụ (order, chat, notification).
- **Message Broker / PubSub**: Redis PubSub/Streams, NATS, Kafka, RabbitMQ… để phân phối event giữa nhiều instance.
- **Storage** (DB): lưu trạng thái, lịch sử chat, notification, event log.

### 5.2 Vì sao cần broker/pubsub?

Nếu bạn chỉ chạy 1 instance gateway, bạn có thể giữ tất cả connection trong RAM và broadcast trực tiếp.

Nhưng khi scale lên nhiều instance:

- User A có thể kết nối vào instance #1
- User B vào instance #2
- Khi có event, gateway #1 cần “nói chuyện” với gateway #2 để B nhận được

=> Cần **pub/sub** hoặc **event bus** để fan-out liên instance.

### 5.3 Stateful vs stateless gateway

- Gateway **luôn stateful ở mức connection** (socket nằm trong RAM), nhưng bạn nên giữ **business state** càng ít càng tốt.
- Thực tế hay dùng:
  - mapping `connectionId -> userId`
  - mapping `userId -> set(connectionId)` (đa thiết bị)
  - mapping `roomId -> set(connectionId)`

Phần còn lại (quyền truy cập room, message history, unread count…) nên nằm ở service/DB.

### 5.4 Pattern phổ biến: “Realtime Gateway/BFF”

- Tách một service chuyên **quản lý kết nối** và **fan-out** (gateway) khỏi các service nghiệp vụ.
- Nghiệp vụ phát event ra broker; gateway chỉ subscribe và push.
- Lợi ích:
  - Gateway tối ưu cho connection/IO.
  - Service nghiệp vụ tối ưu cho transaction/DB.
  - Dễ scale độc lập.

## 6) Fan-out, Rooms/Topics và quản lý subscribe

### 6.1 Mô hình phân phối

- **Unicast**: server → 1 user
- **Multicast/Room**: server → nhóm user
- **Broadcast**: server → tất cả (hiếm, dễ DDoS chính mình)

### 6.2 Thiết kế “channel/room”

Gợi ý đặt tên channel:

- Theo user: `user:{userId}` (private)
- Theo team/org: `org:{orgId}`
- Theo entity: `order:{orderId}` (theo quyền)
- Theo topic: `news:{category}`

Nguyên tắc:

- Channel name nên **deterministic** để dễ route.
- Subscribe phải **kiểm tra quyền** (ABAC/RBAC) trước khi join.
- Tránh để client tự ý subscribe vào “wildcard” quá rộng.

## 7) Độ tin cậy: delivery semantics, ordering, idempotency

### 7.1 Semantics cơ bản

- **At-most-once**: có thể mất event nhưng không bao giờ trùng (thực tế khó tuyệt đối).
- **At-least-once**: có thể trùng event nhưng cố gắng không mất.
- “Exactly-once” end-to-end thường **không thực tế** trong distributed system; thay vào đó dùng **idempotency**.

### 7.2 Idempotency (chống trùng)

- Mỗi event nên có `eventId` (UUID) hoặc `(streamId, sequence)`.
- Client có thể cache `lastSeenSequence` theo room để bỏ qua event cũ.
- Server/consumer xử lý dựa trên “đã xử lý eventId chưa”.

### 7.3 Ordering (thứ tự)

- Ordering toàn cục là đắt; thường chỉ cần **ordering theo room/stream**.
- Để có ordering theo room, có thể:
  - publish vào 1 partition/key theo `roomId` (Kafka)
  - serialize publish theo room (broker hỗ trợ)
  - attach `sequence` tăng dần trong room (service cấp số)

### 7.4 Replay / resume sau reconnect

- SSE hỗ trợ `Last-Event-ID` khá tự nhiên.
- WebSocket thường tự thiết kế:
  - client gửi `resumeToken` hoặc `lastSequence`
  - server gửi bù từ event store/stream

Nếu bạn không có event store, reconnect sẽ chỉ nhận “từ giờ trở đi”. Với notifications “best-effort” có thể chấp nhận.

### 7.5 Collaborative real-time: OT và CRDT (tóm lược)

Nếu bạn làm **collaborative editing** (nhiều người sửa cùng tài liệu), “real-time transport” chỉ là phần nhỏ; khó nhất là **đồng bộ state + xử lý xung đột**:

- **OT (Operational Transformation)**: biến đổi operation để giữ hội tụ. Dùng nhiều trong các hệ đời đầu.
- **CRDT (Conflict-free Replicated Data Type)**: cấu trúc dữ liệu đảm bảo hội tụ khi merge; phổ biến hơn trong nhiều thư viện hiện đại.

Điểm cần nhớ:

- Cần **identity** cho operation/event, causality (vector clock/lamport clock tùy mức), và cơ chế **garbage collection**.
- Thường kết hợp **WebSocket** + **snapshot** + **delta ops**.

## 8) Backpressure, slow consumers và chính sách drop

Real-time không chỉ là gửi nhanh; còn là **không làm sập hệ thống khi client nhận chậm**.

Các chiến lược:

- **Giới hạn buffer per connection**: nếu vượt → drop hoặc disconnect.
- **Coalescing**: gộp nhiều update thành 1 (ví dụ “latest price”).
- **Sampling**: giảm tần suất update UI.
- **Priority**: ưu tiên event quan trọng (order filled) hơn event phụ (typing).
- **Ack/credit-based flow control**: phức tạp nhưng hiệu quả cho stream dày.

### 8.1 Heartbeat và phát hiện kết nối “nửa chết”

- Network/mobile có thể khiến TCP/WebSocket “trông như còn sống” nhưng thực tế không truyền được.
- Dùng:
  - WebSocket ping/pong (nếu library hỗ trợ)
  - hoặc heartbeat ở tầng ứng dụng (client gửi `heartbeat` mỗi N giây)
- Nếu quá T giây không thấy heartbeat → đóng connection để client reconnect.

## 9) Scale: từ 1 máy đến nhiều region

### 9.1 Những giới hạn hay gặp

- Số connection đồng thời (file descriptors, memory)
- CPU (serialize JSON, encryption TLS)
- Network throughput (fan-out lớn)
- GC pauses (Node/Java) khi payload lớn hoặc allocations nhiều

### 9.2 Load balancer và sticky sessions

- WebSocket: thường cần LB L4 hoặc L7 hỗ trợ upgrade.
- Sticky sessions (connection affinity) có thể giúp nhưng không bắt buộc nếu mỗi connection không cần truy cập state ở instance khác.
- Điều quan trọng hơn: **pub/sub giữa instances** để fan-out.

### 9.3 Sharding

- Shard theo `userId` hoặc `roomId` để phân tán tải.
- Khi fan-out cực lớn (livestream), dùng:
  - hierarchical fan-out
  - edge push / CDN hỗ trợ streaming (tùy use case)

### 9.4 Multi-region

- Đưa gateway gần user để giảm latency (geo routing).
- Dữ liệu event cần replicate.
- Chấp nhận trade-off giữa consistency và latency.

### 9.5 Tuning hạ tầng (những thứ hay vỡ ở production)

- **Proxy timeout**: tăng read timeout cho SSE/WS, tránh bị cắt kết nối.
- **Buffering**:
  - Với SSE, cần tắt proxy buffering để event không bị “dồn cục”.
- **File descriptors**: tăng giới hạn FD cho process/OS.
- **TLS termination**: cân nhắc terminate ở LB/edge để giảm CPU ở app.
- **Rolling deploy**: đảm bảo gateway hỗ trợ drain (xem mục 12).

## 10) Bảo mật cho real-time

### 10.1 Authentication

Các cách phổ biến:

- Cookie session (ưu thế khi cùng domain, cần cân nhắc CSRF)
- Bearer token (JWT/opaque) gửi trong:
  - query string (dễ lộ qua log, nên hạn chế)
  - header trong handshake (tùy client/libraries)
  - message “authenticate” đầu phiên (WS)

Khuyến nghị:

- Token ngắn hạn + refresh theo cơ chế HTTP chuẩn.
- Rotate token: khi token hết hạn, client reconnect.

### 10.2 Authorization (quyền subscribe)

- Luôn validate `join room` ở server.
- Với room theo entity (`order:{id}`), kiểm tra user có quyền xem order đó.
- Tránh “security by obscurity” (room name khó đoán) như biện pháp chính.

### 10.3 Origin/CORS và CSRF

- WebSocket không phải CORS như fetch, nhưng bạn vẫn nên kiểm tra `Origin`.
- Nếu dùng cookie auth, cần chiến lược chống CSRF (token, SameSite, origin checks).

### 10.4 Rate limiting và chống abuse

- Rate limit theo:
  - IP
  - userId
  - connectionId
- Giới hạn:
  - số connection/user
  - số subscribe/giây
  - số message gửi/giây

### 10.5 Data validation

- Validate schema của message (JSON schema/protobuf).
- Giới hạn kích thước payload.
- Không tin client gửi lên.

### 10.6 Một số lưu ý bảo mật riêng cho WebSocket

- Kiểm tra `Origin` trong handshake.
- Chặn subprotocol/lựa chọn subprotocol rõ ràng nếu dùng.
- Không cho phép message “đa hình” tùy tiện; nên whitelist `type`.
- Nếu nhận binary, cần giới hạn size và validate chặt.

## 11) Observability: đo, log, trace

### 11.1 Metrics nên có

- `active_connections` (theo instance, theo region)
- `connections_opened_total`, `connections_closed_total` (lý do close)
- `messages_in_total`, `messages_out_total`
- `send_queue_bytes` / `dropped_messages_total`
- `p50/p95/p99 end_to_end_latency_ms` (nếu đo được)
- `reconnects_total` và tỷ lệ reconnect theo client version

### 11.2 Logging

- Log theo connection lifecycle: connect/auth/subscribe/unsubscribe/disconnect.
- Không log token/PII nhạy cảm.

### 11.3 Distributed tracing

- Propagate `traceId` trong event payload hoặc headers nội bộ.
- Lưu ý: với WebSocket, “request” không còn rõ; bạn cần define span cho từng message quan trọng.

## 12) Triển khai và vận hành (deploy/rollback)

### 12.1 Graceful shutdown

Khi rolling update:

- Stop nhận connection mới (drain)
- Giữ connection hiện tại trong một thời gian (grace period)
- Thông báo client reconnect nếu cần

### 12.2 Versioning protocol

- Gắn `protocolVersion` hoặc `schemaVersion`.
- Khi thay đổi format event, hỗ trợ song song (backward compatible) trong một khoảng thời gian.

### 12.3 Canary/Blue-green

- Với gateway, canary cần lưu ý behavior khác nhau giữa versions.
- Theo dõi reconnect spike khi rollout.

## 13) Thiết kế payload, schema và tối ưu hiệu năng

- **Payload nhỏ**: gửi “delta” thay vì toàn bộ state.
- **Nén**: cân nhắc gzip/deflate (tùy stack). Nén giảm băng thông nhưng tăng CPU.
- **Format**:
  - JSON: dễ debug, phổ biến.
  - Protobuf/MessagePack: nhỏ hơn/nhanh hơn, phù hợp high-throughput.
- **Envelope chuẩn** (gợi ý):

```json
{
  "type": "chat.message.created",
  "eventId": "...",
  "ts": 1700000000000,
  "stream": "room:123",
  "sequence": 456,
  "data": { "messageId": "...", "text": "..." }
}
```

## 14) Ví dụ tối giản

> Mục tiêu: minh họa khái niệm, không phải framework chuẩn.

### 14.1 SSE: server push một chiều

**HTTP response** phải có `Content-Type: text/event-stream` và không được buffer.

Format SSE cơ bản:

```
id: 123
event: notification
data: {"title":"New message"}

```

Client (browser):

```js
const es = new EventSource("/events");
es.addEventListener("notification", (e) => {
  const payload = JSON.parse(e.data);
  console.log(payload);
});
```

### 14.2 WebSocket: 2 chiều

Thông lệ tốt:

- Gửi `ping/pong` hoặc heartbeat để phát hiện connection chết.
- Reconnect với exponential backoff + jitter.
- Message có `type` + validate.

Client (browser):

```js
const ws = new WebSocket("wss://example.com/ws");

ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: "..." }));
ws.onmessage = (msg) => {
  const event = JSON.parse(msg.data);
  console.log(event.type, event.data);
};
```

### 14.3 Reconnect strategy (pseudo)

```js
let attempt = 0;

function nextDelayMs() {
  const base = Math.min(30_000, 500 * 2 ** attempt);
  const jitter = Math.random() * 0.3 * base;
  return base + jitter;
}

function connect() {
  const ws = new WebSocket("wss://example.com/ws");

  ws.onopen = () => {
    attempt = 0;
    // auth + resubscribe
  };

  ws.onclose = () => {
    attempt += 1;
    setTimeout(connect, nextDelayMs());
  };

  return ws;
}

connect();
```

## 15) Checklist production (tóm tắt)

- Chọn cơ chế: SSE (1 chiều) vs WebSocket (2 chiều) vs WebRTC (media)
- AuthN/AuthZ: validate subscribe, kiểm tra `Origin`, rate limit
- Reliability: `eventId`, ordering theo stream, reconnect + resume nếu cần
- Backpressure: giới hạn buffer, drop/coalesce khi overload
- Scale: pub/sub giữa instances, sharding theo room/user, graceful shutdown khi deploy
- Observability: metrics connection/msg/latency/drop, logs lifecycle, tracing theo message

## 16) Anti-patterns (những lỗi rất hay gặp)

- “Broadcast cho tất cả” thay vì room/topic → tự tạo DDoS nội bộ
- Không kiểm tra quyền khi subscribe → rò rỉ dữ liệu
- Không có giới hạn payload/rate limit → bị spam làm nghẽn gateway
- Không có chính sách backpressure → một client chậm kéo sập instance
- Không có strategy reconnect/resume → mất event hoặc trùng event khó debug
- Log token/PII trong sự kiện realtime → rủi ro bảo mật nghiêm trọng

---

Nếu bạn cho mình biết use case cụ thể (chat, notification, dashboard hay collaborative), mình có thể bổ sung một kiến trúc tham chiếu “chuẩn” (gồm flow publish/subscribe + chọn broker) đúng với yêu cầu đó.
