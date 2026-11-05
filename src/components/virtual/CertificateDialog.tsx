import { useState } from "react";
import { Download, Eye, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createLeaderboardPost, uploadLeaderboardMedia } from "@/lib/leaderboard-data";
import { supabase } from "@/integrations/supabase/client";
import type { Certificate } from "@/lib/virtual.functions";
import logo from "@/assets/abhi-logo.png.asset.json";
import certificateStamp from "@/assets/abhi-certificate-stamp.png";
import sardarSignature from "@/assets/sardar-hasan-raza-signature.png.asset.json";
import yasirSignature from "@/assets/yasir-babar-signature.png.asset.json";

const verifyUrl = (no: string) => `${window.location.origin}/verify/${no}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const normalizedName = (name?: string | null) => (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const SIGNATURES: Record<string, string> = {
  "sardar hasan raza": sardarSignature.url,
  "yasir babar": yasirSignature.url,
};
const signatureFor = (name?: string | null) => SIGNATURES[normalizedName(name)] ?? null;

async function loadImage(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const context = c.getContext("2d");
    if (!context) return null;
    context.drawImage(bmp, 0, 0);
    return c.toDataURL("image/png");
  } catch { return null; }
}

export async function downloadCertificate(c: Certificate) {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;
  doc.setFillColor(8, 24, 46); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(255, 255, 255); doc.rect(10, 10, W - 20, H - 20, "F");
  doc.setDrawColor(113, 199, 172); doc.setLineWidth(1.5); doc.rect(15, 15, W - 30, H - 30);
  const img = await loadImage(logo.url);
  if (img) doc.addImage(img, "PNG", W / 2 - 25, 22, 50, 18);
  doc.setTextColor(8, 24, 46);
  doc.setFont("helvetica", "bold"); doc.setFontSize(28);
  doc.text(c.certificate_title.toUpperCase(), W / 2, 58, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text("This is to certify that", W / 2, 74, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  doc.text(c.employee_name, W / 2, 90, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  if (c.designation_name) doc.text(c.designation_name, W / 2, 99, { align: "center" });
  doc.setFontSize(13);
  doc.text("has successfully completed the virtual training", W / 2, 113, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(doc.splitTextToSize(c.training_name, 220), W / 2, 125, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text(`Issued on ${fmt(c.issued_at)}${c.score_pct != null ? ` · Post-test score ${Math.round(c.score_pct)}%` : ""}`, W / 2, 142, { align: "center" });
  const signatureUrl = signatureFor(c.signatory_name);
  if (signatureUrl) {
    const [signature, stamp] = await Promise.all([loadImage(signatureUrl), loadImage(certificateStamp)]);
    if (signature) doc.addImage(signature, "PNG", 59, 145, 32, 25);
    if (stamp) doc.addImage(stamp, "PNG", 88, 145, 25, 25, undefined, "FAST", -8);
  }
  doc.setDrawColor(8, 24, 46); doc.setLineWidth(0.4); doc.line(40, 172, 110, 172);
  doc.text(c.signatory_name ?? "Head of Learning & Development", 75, 178, { align: "center" });
  doc.setFontSize(10);
  doc.text(c.signatory_designation ?? "ABHI Microfinance Bank", 75, 184, { align: "center" });
  const qr = await QR.toDataURL(verifyUrl(c.cert_no), { margin: 0, width: 300 });
  doc.addImage(qr, "PNG", W - 60, 150, 28, 28);
  doc.setFontSize(8);
  doc.text(`Certificate No. ${c.cert_no}`, W - 46, 183, { align: "center" });
  doc.save(`${c.cert_no}.pdf`);
}

async function bitmap(src: string) {
  try { return await createImageBitmap(await (await fetch(src)).blob()); } catch { return null; }
}

/** Renders the same certificate layout as the PDF onto a canvas and returns a JPEG blob. */
export async function certificateToJpeg(c: Certificate): Promise<Blob> {
  const QR = await import("qrcode");
  const S = 6, W = 297, H = 210;
  const cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  const g = cv.getContext("2d")!;
  g.scale(S, S);
  g.fillStyle = "#08182e"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#ffffff"; g.fillRect(10, 10, W - 20, H - 20);
  g.strokeStyle = "#71c7ac"; g.lineWidth = 1.5; g.strokeRect(15, 15, W - 30, H - 30);
  const lg = await bitmap(logo.url);
  if (lg) g.drawImage(lg, W / 2 - 25, 22, 50, 18);
  g.fillStyle = "#08182e"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  const t = (s: string, x: number, y: number, size: number, bold = false) => {
    g.font = `${bold ? "bold " : ""}${size * 0.3528}px Helvetica, Arial, sans-serif`;
    g.fillText(s, x, y, 250);
  };
  t(c.certificate_title.toUpperCase(), W / 2, 58, 28, true);
  t("This is to certify that", W / 2, 74, 13);
  t(c.employee_name, W / 2, 90, 26, true);
  if (c.designation_name) t(c.designation_name, W / 2, 99, 12);
  t("has successfully completed the virtual training", W / 2, 113, 13);
  t(c.training_name, W / 2, 125, 18, true);
  t(`Issued on ${fmt(c.issued_at)}${c.score_pct != null ? ` · Post-test score ${Math.round(c.score_pct)}%` : ""}`, W / 2, 142, 12);
  const sigUrl = signatureFor(c.signatory_name);
  if (sigUrl) {
    const [sig, stamp] = await Promise.all([bitmap(sigUrl), bitmap(certificateStamp)]);
    if (sig) g.drawImage(sig, 59, 145, 32, 25);
    if (stamp) {
      g.save(); g.translate(100.5, 157.5); g.rotate((-8 * Math.PI) / 180);
      g.globalAlpha = 0.85; g.drawImage(stamp, -12.5, -12.5, 25, 25); g.restore();
    }
  }
  g.strokeStyle = "#08182e"; g.lineWidth = 0.4;
  g.beginPath(); g.moveTo(40, 172); g.lineTo(110, 172); g.stroke();
  t(c.signatory_name ?? "Head of Learning & Development", 75, 178, 12);
  t(c.signatory_designation ?? "ABHI Microfinance Bank", 75, 184, 10);
  const qr = await bitmap(await QR.toDataURL(verifyUrl(c.cert_no), { margin: 0, width: 300 }));
  if (qr) g.drawImage(qr, W - 60, 150, 28, 28);
  t(`Certificate No. ${c.cert_no}`, W - 46, 183, 8);
  return await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not create image"))), "image/jpeg", 0.92));
}


export function CertificateActions({ cert, showView = true }: { cert: Certificate; showView?: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const submitPost = async () => {
    setPosting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in first.");
      const blob = await certificateToJpeg(cert);
      const file = new File([blob], `${cert.cert_no}.jpg`, { type: "image/jpeg" });
      const mediaPath = await uploadLeaderboardMedia(file, auth.user.id);
      const body = comment.trim() || `🎓 Completed "${cert.training_name}" and earned my certificate!`;
      await createLeaderboardPost({ body, mediaPath, mediaType: "image" });
      toast.success("Sent to L&D for approval. It will appear on the Leaderboard once approved.");
      setPostOpen(false);
      setComment("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post to Leaderboard");
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showView && <Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="mr-1 h-4 w-4" />View Certificate</Button>}
        <Button onClick={() => void downloadCertificate(cert)}><Download className="mr-1 h-4 w-4" />Download PDF</Button>
        <Button variant="secondary" onClick={() => setPostOpen(true)}><Trophy className="mr-1 h-4 w-4" />Post on Leaderboard</Button>
      </div>
      {showView && <CertificateDialog cert={cert} open={previewOpen} onOpenChange={setPreviewOpen} />}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post certificate on Leaderboard</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add a comment (optional). Your certificate will be posted as a picture with your comment and reviewed by L&D before it becomes visible.
          </p>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} placeholder="e.g. Grateful for this learning opportunity!" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPostOpen(false)} disabled={posting}>Cancel</Button>
            <Button onClick={() => void submitPost()} disabled={posting}>{posting ? "Posting…" : "Submit for approval"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CertificateDialog({ cert, open, onOpenChange }: { cert: Certificate | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!cert) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>🎓 Congratulations, {cert.employee_name}!</DialogTitle></DialogHeader>
        <div className="rounded-lg border-4 border-sidebar bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{cert.certificate_title}</p>
          <p className="mt-3 text-2xl font-bold">{cert.employee_name}</p>
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <p className="mt-2 text-lg font-semibold">{cert.training_name}</p>
          <p className="mt-3 text-xs text-muted-foreground">{fmt(cert.issued_at)} · {cert.cert_no}</p>
          <div className="relative mx-auto mt-5 flex w-52 flex-col items-center border-b border-sidebar pb-1">
            {signatureFor(cert.signatory_name) ? (
              <>
                <img src={signatureFor(cert.signatory_name) ?? undefined} alt={`Signature of ${cert.signatory_name}`} className="h-14 w-24 object-contain" />
                <img src={certificateStamp} alt="ABHI authority stamp" className="absolute right-3 -top-1 h-16 w-16 -rotate-[8deg] object-contain opacity-80" />
              </>
            ) : <div className="h-14" />}
          </div>
          <p className="mt-1 text-sm font-medium">{cert.signatory_name ?? "Head of Learning & Development"}</p>
          <p className="text-xs text-muted-foreground">{cert.signatory_designation ?? "ABHI Microfinance Bank"}</p>
        </div>
        <CertificateActions cert={cert} showView={false} />
      </DialogContent>
    </Dialog>
  );
}
