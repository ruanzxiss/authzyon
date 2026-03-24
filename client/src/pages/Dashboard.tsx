import { useAuthZyon } from "@/contexts/AuthZyonContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, CheckCircle2, PauseCircle, XCircle, Users, TrendingUp, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

function StatCard({ title, value, icon: Icon, color, sub }: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuthZyon();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bem-vindo, <span className="text-primary font-semibold">{user?.username}</span>
            {user?.role === "admin" && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">Admin</span>}
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-5 h-24" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              title="Total de Keys"
              value={stats?.totalKeys ?? 0}
              icon={Key}
              color="bg-blue-500/20 text-blue-400"
            />
            <StatCard
              title="Keys Ativas"
              value={stats?.activeKeys ?? 0}
              icon={CheckCircle2}
              color="bg-emerald-500/20 text-emerald-400"
            />
            <StatCard
              title="Não Ativadas"
              value={stats?.inactiveKeys ?? 0}
              icon={Clock}
              color="bg-slate-500/20 text-slate-400"
            />
            <StatCard
              title="Keys Pausadas"
              value={stats?.pausedKeys ?? 0}
              icon={PauseCircle}
              color="bg-amber-500/20 text-amber-400"
            />
            <StatCard
              title="Keys Banidas"
              value={stats?.bannedKeys ?? 0}
              icon={XCircle}
              color="bg-red-500/20 text-red-400"
            />
            {user?.role === "admin" && (
              <StatCard
                title="Usuários"
                value={stats?.totalUsers ?? 0}
                icon={Users}
                color="bg-purple-500/20 text-purple-400"
              />
            )}
          </div>
        )}

        {/* User Info */}
        {user?.role !== "admin" && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Seu Limite de Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Keys geradas</span>
                <span className="text-foreground font-semibold">{user?.keysGenerated} / {user?.keyLimit}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((user?.keysGenerated ?? 0) / (user?.keyLimit ?? 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(user?.keyLimit ?? 0) - (user?.keysGenerated ?? 0)} keys restantes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Guide */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Guia Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Key className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Gerar Keys</p>
                <p className="text-xs text-muted-foreground">Acesse "Gerenciar Keys" para criar novas licenças de 1, 7 ou 30 dias</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Ativação de Keys</p>
                <p className="text-xs text-muted-foreground">O tempo de expiração começa apenas quando a key é ativada no app iOS</p>
              </div>
            </div>
            {user?.role === "admin" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Users className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Gerenciar Usuários</p>
                  <p className="text-xs text-muted-foreground">Crie usuários, defina limites de keys e gerencie acessos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
