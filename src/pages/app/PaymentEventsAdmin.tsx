import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RefreshCw, Wand2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PaymentEvent = {
  id: string;
  provider: string;
  event_id: string;
  event_type: string | null;
  reference: string | null;
  created_at: string;
  payload: any;
};

type Sub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  paystack_reference: string | null;
  created_at: string;
  expires_at: string | null;
};

type Profile = { id: string; first_name: string | null; email: string | null; plan: string };

const STATUS_TONE: Record<string, string> = {
  active: "bg-ghana-green text-white",
  trial: "bg-ghana-gold text-ghana-brown",
  expired: "bg-muted text-muted-foreground",
  canceled: "bg-ghana-red text-white",
  failed: "bg-ghana-red text-white",
};

export default function PaymentEventsAdmin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // filters
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<string>("all");
  const [subStatus, setSubStatus] = useState<string>("all");
  const [matchFilter, setMatchFilter] = useState<string>("all"); // events: matched/unmatched

  async function load() {
    setLoading(true);
    const [evtRes, subsRes] = await Promise.all([
      supabase.from("payment_events").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    setLoading(false);
    if (evtRes.error) { toast.error(evtRes.error.message); return; }
    if (subsRes.error) { toast.error(subsRes.error.message); return; }
    const subRows = (subsRes.data ?? []) as Sub[];
    setEvents((evtRes.data ?? []) as PaymentEvent[]);
    setSubs(subRows);

    const ids = Array.from(new Set(subRows.map((s) => s.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, email, plan")
        .in("id", ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function reactivate(reference: string) {
    setBusyRef(reference);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-reconcile", {
        body: { reference },
      });
      if (error) throw error;
      const r = data?.results?.[0];
      if (r?.activated) {
        toast.success(`Re-activated · plan ${r.plan ?? "?"}`);
      } else {
        toast.warning(`Not activated: ${r?.error ?? "Paystack reports unsuccessful"}`);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-activation failed");
    } finally {
      setBusyRef(null);
    }
  }

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.event_type && set.add(e.event_type));
    return Array.from(set).sort();
  }, [events]);

  const subByRef = useMemo(() => {
    const m: Record<string, Sub> = {};
    subs.forEach((s) => { if (s.paystack_reference) m[s.paystack_reference] = s; });
    return m;
  }, [subs]);

  const term = search.trim().toLowerCase();

  const filteredEvents = events.filter((e) => {
    if (eventType !== "all" && e.event_type !== eventType) return false;
    const sub = e.reference ? subByRef[e.reference] : null;
    if (matchFilter === "matched" && !sub) return false;
    if (matchFilter === "unmatched" && sub) return false;
    if (matchFilter === "stuck" && (!sub || sub.status === "active")) return false;
    if (!term) return true;
    const prof = sub ? profiles[sub.user_id] : null;
    return (
      e.reference?.toLowerCase().includes(term) ||
      e.event_type?.toLowerCase().includes(term) ||
      e.event_id.toLowerCase().includes(term) ||
      sub?.user_id.toLowerCase().includes(term) ||
      prof?.email?.toLowerCase().includes(term) ||
      prof?.first_name?.toLowerCase().includes(term)
    );
  });

  const filteredSubs = subs.filter((s) => {
    if (subStatus !== "all" && s.status !== subStatus) return false;
    if (!term) return true;
    const prof = profiles[s.user_id];
    return (
      s.paystack_reference?.toLowerCase().includes(term) ||
      s.user_id.toLowerCase().includes(term) ||
      s.plan.toLowerCase().includes(term) ||
      prof?.email?.toLowerCase().includes(term) ||
      prof?.first_name?.toLowerCase().includes(term)
    );
  });

  if (authLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/app/discover" replace />;

  const stuckCount = subs.filter((s) => s.status !== "active" && s.paystack_reference).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="heading-gold font-display text-2xl font-bold">Payment events</h1>
        <Button onClick={load} disabled={loading} size="sm" variant="outline" className="rounded-full">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="rounded-2xl p-3 text-xs text-ghana-brown bg-ghana-gold/10 border-ghana-gold/40 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Use <b>Re-activate</b> on a stuck row to re-verify with Paystack and apply the plan if the
          charge succeeded. Idempotent — safe to click more than once.
          {stuckCount > 0 && <> Currently <b>{stuckCount}</b> non-active subscription{stuckCount === 1 ? "" : "s"} with a reference.</>}
        </p>
      </Card>

      <div className="grid gap-2 md:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, email, name, user id…"
          className="md:col-span-3"
        />
      </div>

      <Tabs defaultValue="events">
        <TabsList className="rounded-full">
          <TabsTrigger value="events" className="rounded-full">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="activations" className="rounded-full">Activations ({subs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue placeholder="Event type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {eventTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={matchFilter} onValueChange={setMatchFilter}>
              <SelectTrigger><SelectValue placeholder="Match" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="matched">Matched to subscription</SelectItem>
                <SelectItem value="unmatched">Unmatched (no subscription row)</SelectItem>
                <SelectItem value="stuck">Matched but not active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredEvents.length === 0 && (
            <Card className="rounded-2xl p-4 text-sm text-muted-foreground">No events match these filters.</Card>
          )}

          {filteredEvents.map((e) => {
            const sub = e.reference ? subByRef[e.reference] : null;
            const prof = sub ? profiles[sub.user_id] : null;
            const isOpen = !!expanded[e.id];
            const tone = sub ? STATUS_TONE[sub.status] ?? "bg-muted text-foreground" : "bg-muted text-muted-foreground";
            const isStuck = sub && sub.status !== "active";
            return (
              <Card key={e.id} className="rounded-2xl p-3 text-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-ghana-brown text-white">{e.event_type ?? "event"}</Badge>
                      {sub ? (
                        <Badge className={`capitalize ${tone}`}>sub: {sub.status}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-ghana-red text-ghana-red">no subscription</Badge>
                      )}
                      {isStuck && <Badge className="bg-ghana-red text-white">stuck</Badge>}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                      ref: {e.reference ?? "—"}
                    </div>
                    {prof && (
                      <div className="text-xs text-ghana-brown truncate">
                        {prof.first_name ?? "—"} · <span className="text-muted-foreground">{prof.email ?? "no email"}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {e.reference && (
                      <Button
                        size="sm"
                        disabled={busyRef === e.reference}
                        onClick={() => reactivate(e.reference!)}
                        className="rounded-full bg-ghana-green text-white hover:bg-ghana-green/90"
                      >
                        <Wand2 className={`h-3 w-3 mr-1 ${busyRef === e.reference ? "animate-pulse" : ""}`} />
                        {busyRef === e.reference ? "Working…" : "Re-activate"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded((x) => ({ ...x, [e.id]: !x[e.id] }))}
                      className="rounded-full text-xs"
                    >
                      {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                      payload
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <pre className="rounded-lg bg-muted/50 p-2 text-[10px] overflow-x-auto max-h-64">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="activations" className="space-y-3">
          <Select value={subStatus} onValueChange={setSubStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial / pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {filteredSubs.length === 0 && (
            <Card className="rounded-2xl p-4 text-sm text-muted-foreground">No subscriptions match.</Card>
          )}

          {filteredSubs.map((s) => {
            const prof = profiles[s.user_id];
            const tone = STATUS_TONE[s.status] ?? "bg-muted text-foreground";
            const planMismatch = prof?.plan && prof.plan !== s.plan && s.status === "active";
            return (
              <Card key={s.id} className="rounded-2xl p-3 text-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ghana-brown truncate">
                      {prof?.first_name ?? "—"} <span className="text-muted-foreground font-normal">· {prof?.email ?? "no email"}</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground break-all">
                      ref: {s.paystack_reference ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge className="bg-ghana-brown text-white capitalize">{s.plan}</Badge>
                    <Badge className={`capitalize ${tone}`}>{s.status}</Badge>
                    {s.status === "active" && <CheckCircle2 className="h-4 w-4 text-ghana-green" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div>Amount: <span className="text-foreground">{s.amount} {s.currency}</span></div>
                  <div>Created: <span className="text-foreground">{new Date(s.created_at).toLocaleString()}</span></div>
                  {s.expires_at && (
                    <div className="col-span-2">Expires: <span className="text-foreground">{new Date(s.expires_at).toLocaleString()}</span></div>
                  )}
                  {planMismatch && (
                    <div className="col-span-2 text-ghana-red">Profile plan ({prof?.plan}) doesn't match subscription plan ({s.plan})</div>
                  )}
                </div>
                {s.paystack_reference && s.status !== "active" && (
                  <Button
                    size="sm"
                    disabled={busyRef === s.paystack_reference}
                    onClick={() => reactivate(s.paystack_reference!)}
                    className="rounded-full bg-ghana-green text-white hover:bg-ghana-green/90"
                  >
                    <Wand2 className={`h-3 w-3 mr-1 ${busyRef === s.paystack_reference ? "animate-pulse" : ""}`} />
                    {busyRef === s.paystack_reference ? "Working…" : "Re-activate"}
                  </Button>
                )}
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}