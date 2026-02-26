export type TopicIllustration = {
  title: string;
  mermaid: string;
};

export function getTopicIllustration(
  categorySlug: string,
  topicSlug: string,
): TopicIllustration | null {
  const key = `${categorySlug}/${topicSlug}`;

  switch (key) {
    case "architecture/api-gateway":
      return {
        title: "Sơ đồ tổng quan API Gateway",
        mermaid: `flowchart LR
  U[User/Client] --> G[API Gateway]
  G --> A[AuthN/AuthZ]
  G --> S1[Service A]
  G --> S2[Service B]
  G --> S3[Service C]
  S1 --> D1[(DB A)]
  S2 --> D2[(DB B)]
  S3 --> D3[(DB C)]`,
      };

    case "architecture/circuit-breaker-pattern":
      return {
        title: "Circuit Breaker states",
        mermaid: `stateDiagram-v2
  [*] --> Closed
  Closed --> Open: failures >= threshold
  Open --> HalfOpen: after timeout
  HalfOpen --> Closed: successes >= threshold
  HalfOpen --> Open: failure`,
      };

    case "authentication/oauth2":
      return {
        title: "OAuth2 Authorization Code flow (tổng quan)",
        mermaid: `sequenceDiagram
  participant U as User
  participant B as Browser
  participant C as Client App
  participant AS as Authorization Server
  participant RS as Resource Server

  U->>B: Open login
  B->>AS: /authorize (client_id, redirect_uri, scope)
  AS-->>B: Login + consent
  B->>AS: Submit credentials
  AS-->>B: Redirect with code
  B->>C: Send code to redirect_uri
  C->>AS: Exchange code for tokens
  AS-->>C: access_token (+ refresh_token)
  C->>RS: Call API with access_token
  RS-->>C: Protected data`,
      };

    case "authentication/json-web-token":
      return {
        title: "JWT usage (tổng quan)",
        mermaid: `sequenceDiagram
  participant U as User
  participant C as Client
  participant API as API Server

  U->>C: Login
  C->>API: POST /login
  API-->>C: JWT access token
  C->>API: Request with Authorization: Bearer JWT
  API->>API: Verify signature + claims
  API-->>C: Response`,
      };

    case "scalability/load-balancing":
      return {
        title: "Load Balancing (tổng quan)",
        mermaid: `flowchart LR
  U[Clients] --> LB[Load Balancer]
  LB --> N1[App Instance 1]
  LB --> N2[App Instance 2]
  LB --> N3[App Instance 3]
  N1 --> C[(Cache)]
  N2 --> C
  N3 --> C
  N1 --> DB[(Database)]
  N2 --> DB
  N3 --> DB`,
      };

    case "scalability/cdn":
      return {
        title: "CDN caching path (tổng quan)",
        mermaid: `flowchart LR
  U[User] --> E[CDN Edge]
  E -->|Cache hit| U
  E -->|Cache miss| O[Origin Server]
  O --> E
  E --> U`,
      };

    case "authentication/session-management":
      return {
        title: "Session-based auth (cookie) (tổng quan)",
        mermaid: `sequenceDiagram
  participant U as User
  participant B as Browser
  participant S as Server
  participant ST as Session Store

  U->>B: Login
  B->>S: POST /login
  S->>ST: Create session
  ST-->>S: session_id
  S-->>B: Set-Cookie: session_id (HttpOnly)
  B->>S: Request with Cookie
  S->>ST: Lookup session_id
  ST-->>S: session data
  S-->>B: Response`,
      };

    default:
      return null;
  }
}
