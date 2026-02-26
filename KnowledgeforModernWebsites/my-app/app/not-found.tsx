import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-foreground/80">
        Trang bạn yêu cầu không tồn tại hoặc file Markdown chưa được tìm thấy.
      </p>
      <Link className="underline underline-offset-4" href="/">
        Quay về trang chủ
      </Link>
    </div>
  );
}
