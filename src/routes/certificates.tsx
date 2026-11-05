import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PortalGate } from "@/components/PortalGate";
import { listMyCertificates } from "@/lib/virtual.functions";
import { CertificateActions } from "@/components/virtual/CertificateDialog";

export const Route = createFileRoute("/certificates")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Certificates | ABHI Learning HUB" },
      { name: "description", content: "Download and share the certificates you have earned." },
      { property: "og:title", content: "My Certificates | ABHI Learning HUB" },
      { property: "og:description", content: "Your ABHI training certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PortalGate>{() => <Certs />}</PortalGate>,
});

function Certs() {
  const q = useQuery({ queryKey: ["my-certs"], queryFn: () => listMyCertificates() });
  return (
    <EmployeeShell title="My Certificates" subtitle="Download and share your achievements">
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
        {q.data?.length === 0 && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No certificates yet. Complete a virtual session to earn one.</p>}
        {q.data?.map((c) => (
          <div key={c.cert_no} className="rounded-lg border bg-card p-5">
            <div className="mb-3 flex items-start gap-3">
              <Award className="h-6 w-6 text-primary" />
              <div><p className="font-semibold">{c.training_name}</p>
                <p className="text-xs text-muted-foreground">{c.cert_no} · {new Date(c.issued_at).toLocaleDateString("en-GB")}</p></div>
            </div>
            <CertificateActions cert={c} />
          </div>
        ))}
      </div>
    </EmployeeShell>
  );
}
