import { DetailRoute } from "@/components/detail";

export function generateStaticParams() {
  return [{ id: "local" }];
}

export default function Page() {
  return <DetailRoute />;
}
