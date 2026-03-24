import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthZyon } from "@/contexts/AuthZyonContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Key, Plus, Copy, CheckCheck, PauseCircle, PlayCircle, Ban, CalendarPlus,
  Loader2, RefreshCw, Clock, CheckCircle2, XCircle, Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    inactive: { label: "Não Ativada", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    paused: { label: "Pausada", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    banned: { label: "Banida", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const s = map[status] ?? map.inactive;
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.cls}`}>{s.label}</span>;
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function getDaysRemaining(expiresAt: Date | null | undefined) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Keys() {
  const { user } = useAuthZyon();
  const utils = trpc.useUtils();

  // Generator state
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState<"1" | "7" | "30">("30");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [allCopied, setAllCopied] = useState(false);

  // List state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Add days dialog
  const [addDaysDialog, setAddDaysDialog] = useState<{ id: number; key: string } | null>(null);
  const [daysToAdd, setDaysToAdd] = useState(7);

  const { data: keys = [], isLoading, refetch } = trpc.keys.list.useQuery();

  const generateMutation = trpc.keys.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedKeys(data.keys);
      utils.keys.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success(`${data.keys.length} key(s) gerada(s) com sucesso!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const pauseMutation = trpc.keys.pause.useMutation({
    onSuccess: (data) => {
      utils.keys.list.invalidate();
      toast.success(`Key ${data.status === "paused" ? "pausada" : "reativada"}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const banMutation = trpc.keys.ban.useMutation({
    onSuccess: () => {
      utils.keys.list.invalidate();
      toast.success("Key banida");
    },
    onError: (err) => toast.error(err.message),
  });

  const addDaysMutation = trpc.keys.addDays.useMutation({
    onSuccess: () => {
      utils.keys.list.invalidate();
      setAddDaysDialog(null);
      toast.success(`${daysToAdd} dia(s) adicionado(s)`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (quantity < 1 || quantity > 100) {
      toast.error("Quantidade deve ser entre 1 e 100");
      return;
    }
    generateMutation.mutate({ quantity, durationDays: parseInt(duration) as 1 | 7 | 30 });
  };

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k);
    toast.success("Key copiada!");
  };

  const copyAll = () => {
    navigator.clipboard.writeText(generatedKeys.join("\n"));
    setAllCopied(true);
    toast.success("Todas as keys copiadas!");
    setTimeout(() => setAllCopied(false), 2000);
  };

  const filteredKeys = keys.filter(k => {
    const matchSearch = search === "" || k.keyValue.includes(search.toUpperCase());
    const matchStatus = filterStatus === "all" || k.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const remaining = (user?.keyLimit ?? 0) - (user?.keysGenerated ?? 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Keys</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user?.role !== "admin" && `${remaining} keys disponíveis para gerar`}
              {user?.role === "admin" && "Acesso total a todas as keys"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        {/* Generator */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Gerar Novas Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Duração</Label>
                <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="1">1 Dia</SelectItem>
                    <SelectItem value="7">7 Dias</SelectItem>
                    <SelectItem value="30">30 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><Key className="w-4 h-4 mr-2" /> Gerar {quantity} Key{quantity > 1 ? "s" : ""}</>
              )}
            </Button>

            {/* Generated Keys Result */}
            {generatedKeys.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{generatedKeys.length} key(s) gerada(s):</p>
                  {generatedKeys.length > 1 && (
                    <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5 text-xs">
                      {allCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {allCopied ? "Copiadas!" : "Copiar Todas"}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {generatedKeys.map(k => (
                    <div key={k} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 border border-border">
                      <span className="font-mono text-sm font-bold text-primary tracking-wider">{k}</span>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => copyKey(k)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keys List */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> Keys Geradas ({filteredKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-32">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar key..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 bg-input border-border text-foreground text-sm h-8"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-input border-border text-foreground text-sm h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="inactive">Não Ativadas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="paused">Pausadas</SelectItem>
                  <SelectItem value="banned">Banidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma key encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredKeys.map(k => {
                  const daysLeft = getDaysRemaining(k.expiresAt);
                  return (
                    <div key={k.id} className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary tracking-wider">{k.keyValue}</span>
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyKey(k.keyValue)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <StatusBadge status={k.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Criada: {formatDate(k.createdAt)}</span>
                        <span>Duração: {k.durationDays} dia{k.durationDays > 1 ? "s" : ""}</span>
                        {k.activatedAt && <span>Ativada: {formatDate(k.activatedAt)}</span>}
                        {k.expiresAt && (
                          <span className={daysLeft !== null && daysLeft <= 2 ? "text-amber-400" : ""}>
                            Expira: {formatDate(k.expiresAt)}
                            {daysLeft !== null && ` (${daysLeft}d)`}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {k.status !== "banned" && (
                        <div className="flex gap-2 pt-1">
                          {(k.status === "active" || k.status === "paused") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => pauseMutation.mutate({ id: k.id })}
                              disabled={pauseMutation.isPending}
                            >
                              {k.status === "paused"
                                ? <><PlayCircle className="w-3 h-3 text-emerald-400" /> Reativar</>
                                : <><PauseCircle className="w-3 h-3 text-amber-400" /> Pausar</>
                              }
                            </Button>
                          )}
                          {user?.role === "admin" && k.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setAddDaysDialog({ id: k.id, key: k.keyValue })}
                            >
                              <CalendarPlus className="w-3 h-3 text-blue-400" /> +Dias
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Banir key ${k.keyValue}?`)) banMutation.mutate({ id: k.id });
                            }}
                            disabled={banMutation.isPending}
                          >
                            <Ban className="w-3 h-3" /> Banir
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Days Dialog */}
      <Dialog open={!!addDaysDialog} onOpenChange={() => setAddDaysDialog(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Adicionar Dias</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Key: <span className="font-mono font-bold text-primary">{addDaysDialog?.key}</span></p>
            <div className="space-y-2">
              <Label>Dias a adicionar</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={daysToAdd}
                onChange={e => setDaysToAdd(parseInt(e.target.value) || 1)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDaysDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => addDaysMutation.mutate({ id: addDaysDialog!.id, days: daysToAdd })}
              disabled={addDaysMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {addDaysMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
