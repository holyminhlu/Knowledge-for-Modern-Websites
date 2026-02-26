export type KmwTopic = {
  slug: string;
  label: string;
  fileName: string;
};

export type KmwCategory = {
  slug: string;
  label: string;
  folderName: string;
  topics: KmwTopic[];
};

export const KMW_SITE = {
  name: "KMW",
  fullName: "Knowledge for Modern Websites",
} as const;

// Menu structure + mapping to the Markdown files in the repository root.
export const KMW_NAV: KmwCategory[] = [
  {
    slug: "architecture",
    label: "Architecture & Design Patterns (Kiến trúc & mẫu thiết kế)",
    folderName: "Architecture&Design Patterns",
    topics: [
      {
        slug: "api-gateway",
        label: "API Gateway (Cổng API)",
        fileName: "API_Gateway.md",
      },
      {
        slug: "circuit-breaker-pattern",
        label: "Circuit breaker pattern (Ngắt mạch lỗi)",
        fileName: "Circuit_breaker_pattern.md",
      },
      {
        slug: "clean-architecture",
        label: "Clean Architecture (Kiến trúc sạch)",
        fileName: "Clean_Architecture.md",
      },
      {
        slug: "layered-architecture",
        label: "Layered Architecture (Kiến trúc phân lớp)",
        fileName: "Layered_Architecture.md",
      },
      {
        slug: "microservices",
        label: "Microservices (Vi dịch vụ)",
        fileName: "Microservices.md",
      },
      {
        slug: "solid-principle",
        label: "SOLID Principle (Nguyên tắc SOLID)",
        fileName: "SOLID_Principle.md",
      },
    ],
  },
  {
    slug: "authentication",
    label: "Authentication & Authorization (Xác thực & phân quyền)",
    folderName: "Authentication&Authorization",
    topics: [
      { slug: "abac", label: "ABAC (Phân quyền theo thuộc tính)", fileName: "ABAC.md" },
      {
        slug: "access-token-refresh-token",
        label: "Access Token Refresh Token (Access/Refresh token)",
        fileName: "Access_Token_Refresh_Token.md",
      },
      {
        slug: "json-web-token",
        label: "JSON Web Token (JWT)",
        fileName: "JSON_Web_Token.md",
      },
      {
        slug: "mfa-multi-factor-auth",
        label: "MFA multi factor auth (Xác thực đa yếu tố)",
        fileName: "MFA_multi_factor_auth.md",
      },
      { slug: "oauth2", label: "OAuth2 (Uỷ quyền)", fileName: "OAuth2.md" },
      {
        slug: "role-based-access-control",
        label: "Role Based Access Control (Phân quyền theo vai trò)",
        fileName: "Role_Based_Access_Control.md",
      },
      {
        slug: "session-management",
        label: "Session Management (Quản lý phiên)",
        fileName: "Session_Management.md",
      },
    ],
  },
  {
    slug: "security",
    label: "Security (Bảo mật ứng dụng)",
    folderName: "Security",
    topics: [
      {
        slug: "rate-limit-api",
        label: "Rate Limit API (Giới hạn tần suất)",
        fileName: "Rate_Limit_API.md",
      },
      { slug: "security", label: "Security (Tổng quan)", fileName: "Security.md" },
      {
        slug: "security-nang-cao",
        label: "Security nâng cao (Nâng cao)",
        fileName: "Security_nâng_cao.md",
      },
      {
        slug: "sql-injection",
        label: "SQL Injection (Tiêm SQL)",
        fileName: "SQL_Injection.md",
      },
    ],
  },
  {
    slug: "devops",
    label: "DevOps & Deployment (Vận hành & triển khai)",
    folderName: "DevOps&Deployment",
    topics: [
      {
        slug: "blue-green-deployment",
        label: "Blue-Green deployment (Triển khai xanh-xanh)",
        fileName: "Blue-Green_deployment.md",
      },
      {
        slug: "canary-deployment",
        label: "Canary deployment (Triển khai canary)",
        fileName: "Canary_deployment.md",
      },
      { slug: "ci-cd", label: "CI-CD (Tích hợp & triển khai liên tục)", fileName: "CI-CD.md" },
      {
        slug: "containerization",
        label: "Containerization (Đóng gói container)",
        fileName: "Containerization.md",
      },
      { slug: "feature-flag", label: "Feature flag (Cờ tính năng)", fileName: "Feature_flag.md" },
    ],
  },
  {
    slug: "scalability",
    label: "Scalability & High Availability (Mở rộng & sẵn sàng cao)",
    folderName: "Scalability&High Availability",
    topics: [
      { slug: "cdn", label: "CDN (Mạng phân phối nội dung)", fileName: "CDN.md" },
      {
        slug: "horizontal-scaling",
        label: "Horizontal scaling (Mở rộng ngang)",
        fileName: "Horizontal_scaling.md",
      },
      {
        slug: "load-balancing",
        label: "Load balancing (Cân bằng tải)",
        fileName: "Load_balancing.md",
      },
      { slug: "redis-cache", label: "Redis cache (Bộ nhớ đệm)", fileName: "Redis_cache.md" },
    ],
  },
  {
    slug: "data",
    label: "Data & Database Engineering (Dữ liệu & CSDL)",
    folderName: "Data&DatabaseEngineering",
    topics: [
      {
        slug: "database-best-practice",
        label: "Database Best Practice (Thực hành tốt)",
        fileName: "Database_Best_Practice.md",
      },
      { slug: "etl-elt", label: "ETL-ELT (Xử lý dữ liệu)", fileName: "ETL-ELT.md" },
      { slug: "hasura", label: "Hasura (GraphQL engine)", fileName: "Hasura.md" },
      { slug: "search-engine", label: "Search Engine (Tìm kiếm)", fileName: "Search_Engine.md" },
    ],
  },
  {
    slug: "async",
    label: "Async Processing & Event-Driven (Bất đồng bộ & sự kiện)",
    folderName: "Async Processing&Event-Driven",
    topics: [
      { slug: "message-queue", label: "Message Queue (Hàng đợi)", fileName: "Message_Queue.md" },
      { slug: "real-time", label: "Real time (Thời gian thực)", fileName: "Real_time.md" },
      { slug: "sync-async", label: "Sync–Async (Đồng bộ vs bất đồng bộ)", fileName: "Sync–Async.md" },
    ],
  },
  {
    slug: "observability",
    label: "Observability (Giám sát hệ thống)",
    folderName: "Observability",
    topics: [
      {
        slug: "distributed-tracing",
        label: "Distributed tracing (Theo dõi phân tán)",
        fileName: "Distributed_tracing.md",
      },
      {
        slug: "logging-monitoring",
        label: "Logging Monitoring (Ghi log & giám sát)",
        fileName: "Logging_Monitoring.md",
      },
    ],
  },
  {
    slug: "frontend",
    label: "Frontend Rendering Strategy (Chiến lược render)",
    folderName: "FrontendRenderingStrategy",
    topics: [
      {
        slug: "ssr-csr",
        label: "SSR_CSR (Render server/client)",
        fileName: "SSR_CSR.md",
      },
    ],
  },
];

export function getCategory(categorySlug: string): KmwCategory | undefined {
  return KMW_NAV.find((c) => c.slug === categorySlug);
}

export function getTopic(
  categorySlug: string,
  topicSlug: string,
): { category: KmwCategory; topic: KmwTopic } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  const topic = category.topics.find((t) => t.slug === topicSlug);
  if (!topic) return undefined;
  return { category, topic };
}

export function getAllTopicRoutes(): Array<{ category: string; topic: string }> {
  return KMW_NAV.flatMap((category) =>
    category.topics.map((topic) => ({ category: category.slug, topic: topic.slug })),
  );
}
