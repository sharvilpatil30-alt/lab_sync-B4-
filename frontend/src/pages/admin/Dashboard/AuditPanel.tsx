import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../services/api/client";
export function AuditPanel() {
  const query = useQuery({
    queryKey: ["admin-audit-scheduling"],
    queryFn: async () => {
      const [audit, scheduling] = await Promise.all([
        apiClient.get("/admin/audit"),
        apiClient.get("/admin/scheduling"),
      ]);
      return {
        audit: audit.data.data as any[],
        scheduling: scheduling.data.data as any[],
      };
    },
    refetchInterval: 20000,
  });
  return (
    <section className="glass-panel rounded-xl p-5 space-y-3">
      <h2 className="font-semibold">Audit history & scheduling decisions</h2>
      {query.isLoading && <p>Loading persisted events…</p>}
      {query.error && (
        <p role="alert">Unable to retrieve events: {query.error.message}</p>
      )}
      {query.data && (
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="font-semibold mb-2">Recent audit events</h3>
            {query.data.audit.slice(0, 10).map((a) => (
              <p key={a.id} className="py-1 break-all">
                {new Date(a.created_at).toLocaleString()} · {a.action} ·{" "}
                {a.after?.booking_id || a.after?.target || a.actor_id}
              </p>
            ))}
            {!query.data.audit.length && <p>No audit events recorded.</p>}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Recent scheduling decisions</h3>
            {query.data.scheduling.slice(0, 10).map((s) => (
              <p key={s.id} className="py-1 break-all">
                {s.lab_code} · {s.policy} · {s.decision} · {s.state} ·{" "}
                {s.booking_id}
              </p>
            ))}
            {!query.data.scheduling.length && (
              <p>No scheduling decisions recorded.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
