import { UploadCloud, Loader2, ShieldAlert } from "lucide-react";
import { Sparkles } from "lucide-react";
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
const difficultyOptions: TopicLevel[] = ["beginner", "intermediate", "advanced", "expert"];
type UploadSource = "file" | "link";

export function MaterialUploadPage() {
  const { user } = useAuth();
  const fieldClassName = "min-h-14 px-5 py-4 text-base";
  const selectClassName = "min-h-14 w-full rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-5 py-4 text-base text-[var(--input-text)]";
  const [values, setValues] = useState({
    canonical_name: "",
    material_type: "pdf" as MaterialKind,
    difficulty: "intermediate" as TopicLevel,
    summary: "",
    quality_score: "",
    ease_score: "",
    trust_score: "",
    tags: "",
    topic_titles: "",
    is_published: true,
  });
  const [source, setSource] = useState<UploadSource>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [materialTypeTouched, setMaterialTypeTouched] = useState(false);
  const [difficultyTouched, setDifficultyTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedMaterialResponse | null>(null);

  const isStaff = useMemo(() => user?.role === "professor" || user?.role === "admin", [user]);

  if (!isStaff) {
    return <Navigate to="/library" replace />;
  }

  const handleSubmit = async () => {
    if (source === "file" && !selectedFile) {
      setError("Choose a file to upload first.");
      return;
    }
    if (source === "link" && !hasValue(link)) {
      setError("Add a link first.");
      return;
    }
    if (!hasValue(values.canonical_name)) {
      setError("Add a material title first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = source === "file" ? await uploadSelectedFile() : await uploadLinkedMaterial();
      setUploaded(response);
      setSuccess("Material uploaded.");
      setValues({
        canonical_name: "",
        material_type: "pdf",
        difficulty: "intermediate",
        summary: "",
        quality_score: "",
        ease_score: "",
        trust_score: "",
        tags: "",
        topic_titles: "",
        is_published: true,
      });
      setMaterialTypeTouched(false);
      setDifficultyTouched(false);
      setSelectedFile(null);
      setLink("");
      setSource("file");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload material.");
    } finally {
      setLoading(false);
    }
  };

  const hasValue = (value: string) => value.trim().length > 0;

  const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

  const normalizedScore = (value: string) => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) return 0.5;
    return Math.min(Math.max(parsed, 0), 1);
  };

  const scoreToFormValue = (score: number) => (Math.min(Math.max(score, 0), 100) / 100).toFixed(2);

  const materialTypeFromFile = (file: File): MaterialKind => {
    const filename = file.name.toLowerCase();
    if (filename.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
    if (filename.endsWith(".md")) return "documentation";
    if (filename.endsWith(".txt") || file.type.startsWith("text/")) return "other";
    return "other";
  };

  const fieldHelp = {
    canonical_name: "The display name students will see for this material.",
    source: "Choose whether you are uploading a local file or saving an external learning link.",
    file: "PDF, TXT, or Markdown files can be analyzed and stored by Apollo.",
    link: "Paste a video, book, article, documentation, tutorial, or course URL.",
    material_type: "The format Apollo uses for filtering and recommendation ranking.",
    difficulty: "The learner level Apollo should associate with this material.",
    topic_titles: "Main subject areas connected to this material. Separate multiple topics with commas.",
    tags: "Short keywords used for search and categorization. Separate multiple tags with commas.",
    quality_score: "A 0-1 score for educational quality, structure, correctness, and usefulness.",
    ease_score: "A 0-1 score for how easy this material is for students to understand.",
    trust_score: "A 0-1 score for credibility, references, author/institution signals, and completeness.",
    is_published: "Published materials are immediately available for Apollo retrieval and ranking.",
    summary: "A short description or teaching note shown with the material.",
  };

  const FieldLabel = ({ label, help }: { label: string; help: string }) => (
    <label className="space-y-1">
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#c29f60]">{label}</span>
      <span className="block text-xs leading-5 text-[var(--library-copy-color)]">{help}</span>
    </label>
  );

  const uploadSelectedFile = async () => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      const fallbackScores: Record<string, string> = {
        quality_score: "0.5",
        ease_score: "0.5",
        trust_score: "0.5",
      };
      const formValue = typeof value === "string" && !hasValue(value) && key in fallbackScores ? fallbackScores[key] : value;
      formData.append(key, typeof formValue === "boolean" ? String(formValue) : formValue);
    });
    formData.append("file", selectedFile as File);
    return api.uploadMaterial(formData);
  };

  const uploadLinkedMaterial = async () => api.createLinkedMaterial({
    canonical_name: values.canonical_name,
    link: link.trim(),
    material_type: values.material_type,
    difficulty: values.difficulty,
    summary: hasValue(values.summary) ? values.summary : null,
    quality_score: normalizedScore(values.quality_score),
    ease_score: normalizedScore(values.ease_score),
    trust_score: normalizedScore(values.trust_score),
    tags: splitCsv(values.tags),
    topic_titles: splitCsv(values.topic_titles),
    is_published: values.is_published,
  });

  const handleExtractMetadata = async () => {
    if (source === "file" && !selectedFile) {
      setError("Choose a file before extracting metadata.");
      return;
    }
    if (source === "link" && !hasValue(link)) {
      setError("Add a link before extracting metadata.");
      return;
    }

    setExtracting(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      if (source === "file") {
        formData.append("file", selectedFile as File);
      } else {
        formData.append("link", link.trim());
      }
      const metadata = await api.extractMaterialMetadata(formData);
      setValues((current) => ({
        ...current,
        canonical_name: hasValue(current.canonical_name) ? current.canonical_name : metadata.title,
        material_type: materialTypeTouched ? current.material_type : metadata.material_type,
        topic_titles: hasValue(current.topic_titles) ? current.topic_titles : metadata.topics.join(", "),
        tags: hasValue(current.tags) ? current.tags : metadata.tags.join(", "),
        difficulty: difficultyTouched ? current.difficulty : metadata.difficulty,
        quality_score: hasValue(current.quality_score) ? current.quality_score : scoreToFormValue(metadata.material_quality_score),
        ease_score: hasValue(current.ease_score) ? current.ease_score : scoreToFormValue(metadata.ease_of_understanding_score),
        trust_score: hasValue(current.trust_score) ? current.trust_score : scoreToFormValue(metadata.trust_score),
        summary: hasValue(current.summary) ? current.summary : metadata.summary,
      }));
      setSuccess(`Metadata filled where fields were empty. ${metadata.short_reason}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to extract metadata.");
    } finally {
      setExtracting(false);
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
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--section-title-color)] font-serif">Upload internal learning materials for Apollo’s DB-first retrieval.</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--library-copy-color)]">
                Uploaded files are stored on the server, registered as internal materials, tagged to topics, and become eligible for ranking before web fallback.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel label="Material title" help={fieldHelp.canonical_name} />
              <Input className={fieldClassName} placeholder="Material title" value={values.canonical_name} onChange={(event) => setValues((current) => ({ ...current, canonical_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Source type" help={fieldHelp.source} />
              <div className="flex overflow-hidden rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] p-1">
                {(["file", "link"] as UploadSource[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`min-h-12 flex-1 rounded-xl px-5 py-3 text-base font-medium ${source === option ? "bg-[#c29f60] text-[var(--btn-primary-text,#12141a)]" : "text-[var(--input-text)]"}`}
                    onClick={() => setSource(option)}
                  >
                    {option === "file" ? "File" : "Link"}
                  </button>
                ))}
              </div>
            </div>
            {source === "file" ? (
              <div className="space-y-2">
                <FieldLabel label="File" help={fieldHelp.file} />
                <input
                  type="file"
                  className="min-h-14 w-full rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-5 py-4 text-base text-[var(--input-text)] file:mr-4 file:rounded-xl file:border-0 file:bg-[#c29f60] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--btn-primary-text,#12141a)]"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    if (file && !materialTypeTouched) {
                      setValues((current) => ({ ...current, material_type: materialTypeFromFile(file) }));
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLabel label="Material link" help={fieldHelp.link} />
                <Input className={fieldClassName} placeholder="Material link" value={link} onChange={(event) => setLink(event.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <FieldLabel label="Format" help={fieldHelp.material_type} />
              <select
                className={selectClassName}
                value={values.material_type}
                onChange={(event) => {
                  setMaterialTypeTouched(true);
                  setValues((current) => ({ ...current, material_type: event.target.value as MaterialKind }));
                }}
              >
                {materialTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel label="Level" help={fieldHelp.difficulty} />
              <select
                className={selectClassName}
                value={values.difficulty}
                onChange={(event) => {
                  setDifficultyTouched(true);
                  setValues((current) => ({ ...current, difficulty: event.target.value as TopicLevel }));
                }}
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel label="Topics" help={fieldHelp.topic_titles} />
              <Input className={fieldClassName} placeholder="Topics (comma separated)" value={values.topic_titles} onChange={(event) => setValues((current) => ({ ...current, topic_titles: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Tags" help={fieldHelp.tags} />
              <Input className={fieldClassName} placeholder="Tags (comma separated)" value={values.tags} onChange={(event) => setValues((current) => ({ ...current, tags: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Quality score" help={fieldHelp.quality_score} />
              <Input className={fieldClassName} placeholder="Quality score (0-1)" value={values.quality_score} onChange={(event) => setValues((current) => ({ ...current, quality_score: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Ease score" help={fieldHelp.ease_score} />
              <Input className={fieldClassName} placeholder="Ease score (0-1)" value={values.ease_score} onChange={(event) => setValues((current) => ({ ...current, ease_score: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Trust score" help={fieldHelp.trust_score} />
              <Input className={fieldClassName} placeholder="Trust score (0-1)" value={values.trust_score} onChange={(event) => setValues((current) => ({ ...current, trust_score: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Publish" help={fieldHelp.is_published} />
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-5 py-4 text-base text-[var(--input-text)]">
                <input
                  type="checkbox"
                  checked={values.is_published}
                  onChange={(event) => setValues((current) => ({ ...current, is_published: event.target.checked }))}
                />
                Publish immediately
              </label>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <FieldLabel label="Summary" help={fieldHelp.summary} />
            <textarea
              className="min-h-40 w-full rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-5 py-4 text-base text-[var(--input-text)] placeholder:text-[var(--input-placeholder)]"
              placeholder="Summary or teaching note"
              value={values.summary}
              onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))}
            />
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-[var(--badge-danger-border)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-text)]">{error}</div> : null}
          {success ? <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

          {uploaded ? (
            <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              Uploaded <span className="font-semibold">{uploaded.canonical_name}</span> and stored it at <span className="font-mono">{uploaded.file_path}</span>.
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--library-copy-color)]">
              <ShieldAlert className="h-4 w-4 text-[#c29f60]" />
              Only professor/admin accounts can upload trusted internal materials.
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => void handleExtractMetadata()} disabled={(source === "file" ? !selectedFile : !hasValue(link)) || extracting || loading}>
                {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {extracting ? "Extracting..." : "Auto-fill metadata"}
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={loading || extracting}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {source === "file" ? "Upload material" : "Save link"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

