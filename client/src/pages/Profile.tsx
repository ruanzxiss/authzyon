import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthZyon } from "@/contexts/AuthZyonContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Camera, Save, Loader2, Key, Shield } from "lucide-react";

export default function Profile() {
  const { user, refetch } = useAuthZyon();
  const fileRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: (data) => {
      toast.success("Perfil atualizado!");
      setNewPassword(""); setConfirmPassword("");
      setAvatarPreview(null); setAvatarBase64(null);
      refetch();
      setSaving(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setSaving(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    updateMutation.mutate({
      avatarBase64: avatarBase64 || undefined,
      newPassword: newPassword || undefined,
    });
  };

  const hasChanges = !!avatarBase64 || !!newPassword;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações de conta</p>
        </div>

        {/* Avatar Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Foto de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarPreview || user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-card hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.username}</p>
              <p className="text-sm text-muted-foreground capitalize">{user?.role === "admin" ? "Administrador" : "Usuário"}</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={() => fileRef.current?.click()}>
                Alterar foto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Usuário</span>
              </div>
              <span className="font-semibold text-foreground">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Função</span>
              </div>
              <span className="font-semibold text-foreground capitalize">{user?.role === "admin" ? "Administrador" : "Usuário"}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Keys Geradas</span>
              </div>
              <span className="font-semibold text-foreground">{user?.keysGenerated} / {user?.keyLimit}</span>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Nova Senha</Label>
              <Input
                type="password"
                placeholder="Digite a nova senha"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Confirmar Senha</Label>
              <Input
                type="password"
                placeholder="Confirme a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
