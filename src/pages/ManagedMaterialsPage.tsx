import { CheckCircle2, ExternalLink, Loader2, Power, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { resolveMaterialUrl } from "@/lib/materialUrls";
import { api } from "@/services/api";
import type { ManagedMaterialResponse } from "@/types/models";

export function ManagedMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<ManagedMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const isStaff = useMemo(() => user?.role === "professor" || user?.role === "admin", [user]);
  const isAdmin = user?.role === "admin";

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const response = await api.getManagedMaterials();
      setMaterials(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load managed materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    void loadMaterials();
  }, [isStaff]);

  if (!isStaff) {
    return <Navigate to="/library" replace />;
  }

  const handleVerify = async (material: ManagedMaterialResponse) => {
    setWorkingId(material.id);
    try {
      const updated = await api.verifyMaterial(material.id, !material.is_verified);
      setMaterials((current) => current.map((item) => (item.id === material.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update verification.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleActive = async (material: ManagedMaterialResponse) => {
    setWorkingId(material.id);
    try {
      const updated = await api.setMaterialActive(material.id, !material.is_active);
      setMaterials((current) => current.map((item) => (item.id === material.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update activation.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (material: ManagedMaterialResponse) => {
    const confirmed = window.confirm(`Delete "${material.canonical_name}" from the database?`);
    if (!confirmed) return;

    setWorkingId(material.id);
    try {
      await api.deleteMaterial(material.id);
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete material.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AppShell title="Managed Materials" subtitle="Professor/admin moderation workspace" role={user?.role}>
      <div className="space-y-6">
        <Card className="p-6 lg:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#a3835b]">Trusted collection</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--section-title-color)] font-serif">Open and manage internal materials.</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--library-copy-color)]">
                Review professor/admin managed materials, confirm verification, and deactivate low-quality entries without leaving the app.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void loadMaterials()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </Card>

        {error ? <Card className="p-4 text-sm text-rose-300 border-rose-900 bg-rose-950/40">{error}</Card> : null}

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-[var(--library-copy-color)]">Loading managed materials...</div>
          ) : materials.length === 0 ? (
            <div className="p-8 text-sm text-[var(--library-copy-color)]">No professor/admin managed materials are available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--table-header-bg)] text-[var(--table-header-text)]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Material</th>
                    <th className="px-5 py-4 font-medium">Topics</th>
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Source</th>
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => {
                    const openTarget = resolveMaterialUrl(material.link ?? material.file_path);
                    return (
                      <tr key={material.id} className="border-t border-[#c29f60]/10 align-top">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[var(--foreground)]">{material.canonical_name}</div>
                          <div className="mt-2 text-xs text-[var(--library-copy-color)] break-all">{openTarget || "No location"}</div>
                          {material.summary ? <div className="mt-2 text-sm text-[var(--library-copy-color)]">{material.summary}</div> : null}
                        </td>
                        <td className="px-5 py-4 text-[var(--library-copy-color)]">{material.topics.map((topic) => topic.title).join(", ") || "Unassigned"}</td>
                        <td className="px-5 py-4 text-[var(--library-copy-color)]">{material.material_type}</td>
                        <td className="px-5 py-4">
                          <div className="space-y-2 text-xs">
                            <div className={material.is_verified ? "text-emerald-300" : "text-amber-300"}>
                              {material.is_verified ? "Verified" : "Not verified"}
                            </div>
                            <div className={material.is_active ? "text-sky-300" : "text-rose-300"}>
                              {material.is_active ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--library-copy-color)]">{material.source_type}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <a href={openTarget || "#"} target="_blank" rel="noreferrer">
                              <Button variant="secondary" disabled={!openTarget}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open
                              </Button>
                            </a>
                            <Button variant="secondary" disabled={workingId === material.id} onClick={() => void handleVerify(material)}>
                              {workingId === material.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                              {material.is_verified ? "Unverify" : "Verify"}
                            </Button>
                            <Button variant={material.is_active ? "danger" : "secondary"} disabled={workingId === material.id} onClick={() => void handleActive(material)}>
                              {workingId === material.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                              {material.is_active ? "Deactivate" : "Reactivate"}
                            </Button>
                            {isAdmin ? (
                              <Button variant="danger" disabled={workingId === material.id} onClick={() => void handleDelete(material)}>
                                {workingId === material.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
