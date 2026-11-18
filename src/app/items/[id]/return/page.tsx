import { ReturnRoute } from "@/components/return-form";

export function generateStaticParams() {
  return [{ id: "local" }];
}

export default function Page() {
  return <ReturnRoute />;
}
