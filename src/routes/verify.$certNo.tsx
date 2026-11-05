import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyCertificate } from "@/lib/virtual.functions";

export const Route = createFileRoute("/verify/$certNo")({
  loader: ({ params }) => verifyCertificate({ data: { certNo: params.certNo } }),
  head: ({ loaderData, params }) => {
    const t = loaderData ? `${loaderData.employee_name} — ${loaderData.training_name}` : `Certificate ${params.certNo}`;
    return {
      meta: [
        { title: `${t} | ABHI Certificate` },
        { name: "description", content: "Verified training certificate issued by ABHI Microfinance Bank L&D." },
        { property: "og:title", content: `${t} | ABHI Certificate` },
        { property: "og:description", content: "Verified training certificate issued by ABHI Microfinance Bank L&D." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <p className="p-8 text-center">Unable to check this certificate right now.</p>,
  notFoundComponent: () => <p className="p-8 text-center">Certificate not found.</p>,
  component: Verify,
});

function Verify() {
  const c = Route.useLoaderData();
  const { certNo } = Route.useParams();
  const valid = c && !c.revoked;
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-8 text-center shadow-lg">
        {valid ? <CheckCircle2 className="mx-auto h-12 w-12 text-primary" /> : <XCircle className="mx-auto h-12 w-12 text-destructive" />}
        <h1 className="mt-3 text-xl font-bold">{valid ? "Verified certificate" : "Certificate not valid"}</h1>
        {c ? (
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.certificate_title}</p>
            <p className="text-lg font-semibold">{c.employee_name}</p>
            <p>{c.training_name}</p>
            <p className="text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} · {c.cert_no}</p>
            <p className="pt-3 text-xs text-muted-foreground">Issued by ABHI Microfinance Bank — Learning & Development</p>
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">No certificate found with number {certNo}.</p>}
      </div>
    </div>
  );
}
