import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthZyon } from "@/contexts/AuthZyonContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, Plus, Ban, Edit2, Loader2, RefreshCw, Key, ShieldOff, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

export default function UserManagement() {
  const { user } = useAuthZyon();
  const [, setLocation] = useLocation();

  // Redirect non-admins
  if (user && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const utils = trpc.useUtils();
  const { data: users = [], isLoading, refetch } = trpc.users.list.useQuery();

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(50);

  // Edit limit dialog
  const [editDialog, setEditDialog] = useState<{ id: number; username: string; limit: number } | null>(null);
  const [editLimit, setEditLimit] = useState(50);

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setCreateDialog(false);
      setNewUsername(""); setNewPassword(""); setNewKeyLimit(50);
      toast.success("Usuário criado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const banMutation = trpc.users.ban.useMutation({
    onSuccess: (data) => {
      utils.users.list.invalidate();
      toast.success(data.isBanned ? "Usuário banido" : "Usuário desbanido");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateLimitMutation = trpc.users.updateLimit.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setEditDialog(null);
      toast.success("Limite atualizado!");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
            <p className="text-muted-foreground text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={() => setCreateDialog(true)} className="gap-2 bg-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5" /> Novo Usuário
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                        {u.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{u.username}</span>
                        {u.role === "admin" && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Admin</span>
                        )}
                        {u.isBanned === 1 && (
                          <span className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">Banido</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Key className="w-3 h-3" /> {u.keysGenerated}/{u.keyLimit} keys
                        </span>
                        {u.lastSignedIn && (
                          <span className="text-xs text-muted-foreground">
                            Último login: {format(new Date(u.lastSignedIn), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - não mostrar para o próprio admin */}
                    {u.role !== "admin" && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setEditDialog({ id: u.id, username: u.username, limit: u.keyLimit }); setEditLimit(u.keyLimit); }}
                        >
                          <Edit2 className="w-3 h-3" /> Limite
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs gap-1 ${u.isBanned ? "text-emerald-400 hover:text-emerald-400" : "text-destructive hover:text-destructive"}`}
                          onClick={() => banMutation.mutate({ id: u.id })}
                          disabled={banMutation.isPending}
                        >
                          {u.isBanned ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                          {u.isBanned ? "Desbanir" : "Banir"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                placeholder="Nome de usuário"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Senha de acesso"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Limite de Keys</Label>
              <Input
                type="number"
                min={1}
                max={99999}
                value={newKeyLimit}
                onChange={e => setNewKeyLimit(parseInt(e.target.value) || 1)}
                className="bg-input border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">Máximo de keys que este usuário pode gerar</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ username: newUsername, password: newPassword, keyLimit: newKeyLimit })}
              disabled={createMutation.isPending || !newUsername || !newPassword}
              className="bg-primary text-primary-foreground"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Editar Limite de Keys</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Usuário: <span className="font-semibold text-foreground">{editDialog?.username}</span></p>
            <div className="space-y-2">
              <Label>Novo Limite</Label>
              <Input
                type="number"
                min={1}
                max={99999}
                value={editLimit}
                onChange={e => setEditLimit(parseInt(e.target.value) || 1)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => updateLimitMutation.mutate({ id: editDialog!.id, keyLimit: editLimit })}
              disabled={updateLimitMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {updateLimitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
