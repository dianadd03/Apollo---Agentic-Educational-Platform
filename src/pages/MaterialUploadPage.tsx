import { UploadCloud, Loader2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import type { MaterialKind, TopicLevel, UploadedMaterialResponse } from "@/types/models";

const materialTypeOptions: MaterialKind[] = ["article", "video", "book", "documentation", "tutorial", "pdf", "course", "other"];
const difficultyOptions: TopicLevel[] = ["beginner", "intermediate", "advanced"];

export function MaterialUploadPage() {
  const { user } = useAuth();
  const [values, setValues] = useState({
    canonical_name: "",
    material_type: "pdf" as MaterialKind,
    difficulty: "intermediate" as TopicLevel,
    summary: "",
    quality_score: "0.7",
    ease_score: "0.6",
    trust_score: "0.7",
    tags: "",
    topic_titles: "",
    is_published: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedMaterialResponse | null>(null);

  const isStaff = useMemo(() => user?.role === "professor" || user?.role === "admin", [user]);

  if (!isStaff) {
    return <Navigate to="/library" replace />;
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Choose a file to upload first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, typeof value === "boolean" ? String(value) : value);
      });
      formData.append("file", selectedFile);
      const response = await api.uploadMaterial(formData);
      setUploaded(response);
      setValues({
        canonical_name: "",
        material_type: "pdf",
        difficulty: "intermediate",
        summary: "",
        quality_score: "0.7",
        ease_score: "0.6",
        trust_score: "0.7",
        tags: "",
        topic_titles: "",
        is_published: true,
      });
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload material.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Material Upload" subtitle="Professor and admin upload workspace" role={user?.role}>
      <div className="space-y-6">
        <Card className="p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#a3835b]">Trusted ingestion</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[#f4ead6] font-serif">Upload internal learning materials for Apollo’s DB-first retrieval.</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#dccfa6]/80">
                Uploaded files are stored on the server, registered as internal materials, tagged to topics, and become eligible for ranking before web fallback.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Material title" value={values.canonical_name} onChange={(event) => setValues((current) => ({ ...current, canonical_name: event.target.value }))} />
            <input
              type="file"
              className="w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6] file:mr-4 file:rounded-xl file:border-0 file:bg-[#c29f60] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#12141a]"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <select
              className="w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6]"
              value={values.material_type}
              onChange={(event) => setValues((current) => ({ ...current, material_type: event.target.value as MaterialKind }))}
            >
              {materialTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              className="w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6]"
              value={values.difficulty}
              onChange={(event) => setValues((current) => ({ ...current, difficulty: event.target.value as TopicLevel }))}
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <Input placeholder="Topics (comma separated)" value={values.topic_titles} onChange={(event) => setValues((current) => ({ ...current, topic_titles: event.target.value }))} />
            <Input placeholder="Tags (comma separated)" value={values.tags} onChange={(event) => setValues((current) => ({ ...current, tags: event.target.value }))} />
            <Input placeholder="Quality score (0-1)" value={values.quality_score} onChange={(event) => setValues((current) => ({ ...current, quality_score: event.target.value }))} />
            <Input placeholder="Ease score (0-1)" value={values.ease_score} onChange={(event) => setValues((current) => ({ ...current, ease_score: event.target.value }))} />
            <Input placeholder="Trust score (0-1)" value={values.trust_score} onChange={(event) => setValues((current) => ({ ...current, trust_score: event.target.value }))} />
            <label className="flex items-center gap-3 rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6]">
              <input
                type="checkbox"
                checked={values.is_published}
                onChange={(event) => setValues((current) => ({ ...current, is_published: event.target.checked }))}
              />
              Publish immediately
            </label>
          </div>
          <textarea
            className="mt-4 min-h-32 w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6] placeholder:text-[#dccfa6]/50"
            placeholder="Summary or teaching note"
            value={values.summary}
            onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))}
          />

          {error ? <div className="mt-4 rounded-2xl border border-[#4e1c24]/50 bg-[#2a0e12] px-4 py-3 text-sm text-[#c26060]">{error}</div> : null}

          {uploaded ? (
            <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              Uploaded <span className="font-semibold">{uploaded.canonical_name}</span> and stored it at <span className="font-mono">{uploaded.file_path}</span>.
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#dccfa6]/70">
              <ShieldAlert className="h-4 w-4 text-[#c29f60]" />
              Only professor/admin accounts can upload trusted internal materials.
            </div>
            <Button onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload material
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
