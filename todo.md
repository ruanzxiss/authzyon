# AuthZyon - TODO

## Backend / Database
- [x] Schema: tabelas app_users, license_keys, login_history, audit_logs, key_activations
- [x] Autenticação customizada (RUAN/RUAN123 admin + usuários criados pelo admin)
- [x] JWT session management customizado (sem OAuth Manus)
- [x] API: criar key, listar keys, pausar/banir/adicionar dias
- [x] API: validar key iOS (endpoint público)
- [x] API: ativar key iOS (endpoint público)
- [x] API: verificar sessão iOS (endpoint público)
- [x] Gerador de keys A-Z 10-14 caracteres maiúsculos
- [x] Contagem de expiração iniciando apenas após ativação
- [x] Gerenciamento de usuários (criar, banir, editar limite de keys)
- [x] Histórico de login com timestamp e IP
- [x] Notificações ao admin (key ativada, limite atingido, próxima de expirar)
- [x] Logs de auditoria salvos em S3
- [x] Upload de foto de perfil em S3

## Frontend
- [x] Tela de login customizada (não usar OAuth Manus)
- [x] DashboardLayout com sidebar
- [x] Dashboard com estatísticas (keys geradas, ativas, pausadas, usuários)
- [x] Página de geração de keys (quantidade, duração 1/7/30 dias, copiar todas)
- [x] Listagem de keys com status e ações (pausar, banir, adicionar dias)
- [x] Página de gerenciamento de usuários (apenas admin)
- [x] Histórico de login
- [x] Edição de perfil com foto
- [x] Design responsivo mobile-first

## Documentação iOS
- [x] Documentação Swift para integração .dylib
- [x] Código Objective-C para integração .dylib
- [x] Tela de login iOS (título FFH4X, campo key, mensagens de sucesso/erro)
- [x] Armazenamento local de sessão iOS (UserDefaults/Keychain)
- [x] Fluxo de validação automática ao abrir app

## Testes
- [x] Testes vitest para rotas de API
- [x] Testes de validação de keys
