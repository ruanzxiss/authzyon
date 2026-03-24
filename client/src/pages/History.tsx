import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, CheckCircle2, XCircle, RefreshCw, Globe } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const { data: logins = [], isLoading, refetch } = trpc.history.login.useQuery();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Login</h1>
            <p className="text-muted-foreground text-sm mt-1">{logins.length} registro(s) encontrado(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-primary" /> Registros de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : logins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logins.map(log => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-shrink-0">
                      {log.success === 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{log.username}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${log.success === 1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {log.success === 1 ? "Sucesso" : "Falhou"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {log.ipAddress && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {log.ipAddress}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
