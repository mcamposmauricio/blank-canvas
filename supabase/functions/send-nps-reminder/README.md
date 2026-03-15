# Configuração do Gmail API para Envio de E-mails

Este documento explica como configurar e usar a API do Gmail para envio de e-mails de lembrete NPS.

## Pré-requisitos

1. Uma conta Google (pode ser @gmail.com)
2. Acesso ao Google Cloud Console
3. Projeto criado no Google Cloud

## Passo 1: Criar Credenciais OAuth2

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione ou crie um projeto
3. Navegue até **APIs & Services** > **Library**
4. Procure por "Gmail API" e ative-a
5. Vá para **APIs & Services** > **Credentials**
6. Clique em **Create Credentials** > **OAuth client ID**
7. Se necessário, configure a tela de consentimento OAuth
8. Selecione "Web application" como tipo
9. Configure:
   - **Authorized redirect URIs**: `http://localhost:8080` (para obter o token inicial)
10. Salve o **Client ID** e **Client Secret**

## Passo 2: Obter o Refresh Token

### Método 1: Usando OAuth Playground

1. Acesse [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Clique no ícone de engrenagem (⚙️) no canto superior direito
3. Marque "Use your own OAuth credentials"
4. Cole seu **Client ID** e **Client Secret**
5. Na lista de APIs à esquerda, procure por "Gmail API v1"
6. Selecione o escopo: `https://www.googleapis.com/auth/gmail.send`
7. Clique em "Authorize APIs"
8. Faça login com a conta Google que enviará os e-mails
9. Autorize o acesso
10. Clique em "Exchange authorization code for tokens"
11. Copie o **Refresh Token** gerado

### Método 2: Usando cURL (Avançado)

```bash
# 1. Gere a URL de autorização (substitua CLIENT_ID)
https://accounts.google.com/o/oauth2/v2/auth?client_id=SEU_CLIENT_ID&redirect_uri=http://localhost:8080&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent

# 2. Abra a URL no navegador, autorize e copie o 'code' da URL de redirect

# 3. Troque o code por tokens (substitua os valores)
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=SEU_CLIENT_ID" \
  -d "client_secret=SEU_CLIENT_SECRET" \
  -d "code=SEU_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:8080"

# O response conterá o refresh_token
```

## Passo 3: Configurar os Secrets no Supabase

Adicione os seguintes secrets no seu projeto:

- `GOOGLE_CLIENT_ID`: O Client ID obtido no Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: O Client Secret obtido no Google Cloud Console
- `GOOGLE_REFRESH_TOKEN`: O Refresh Token obtido via OAuth Playground ou cURL

## Como Funciona

1. A função usa o **refresh_token** para obter um **access_token** válido
2. O access_token é usado para autenticar na Gmail API
3. O e-mail é formatado em RFC 2822 e codificado em base64url
4. A mensagem é enviada via endpoint `users.messages.send` da Gmail API
5. A função retorna o ID da mensagem enviada com sucesso

## Atualização do Refresh Token

### O Refresh Token Expira?

O refresh token **geralmente não expira**, mas pode ser invalidado se:

- O usuário revoga o acesso à aplicação
- O token fica inativo por 6 meses
- O usuário muda a senha da conta
- Você excede o limite de tokens emitidos (100 tokens por conta/cliente)

### Como Atualizar

Se o refresh token expirar, você precisará:

1. Repetir o Passo 2 para obter um novo refresh token
2. Atualizar o secret `GOOGLE_REFRESH_TOKEN` no Supabase

### Logs de Debugging

A função inclui logs detalhados para facilitar o debugging:

```typescript
// Logs de sucesso
console.log("Getting Gmail access token...");
console.log("Access token obtained successfully");
console.log("Sending email via Gmail API to:", contactEmail);
console.log("Email sent successfully. Message ID:", messageId);

// Logs de erro
console.error("Error getting access token:", error);
console.error("Error sending email:", error);
console.error("Error in send-nps-reminder function:", error);
```

## Testando

Para testar o envio de e-mail:

1. Certifique-se de que todos os secrets estão configurados
2. Faça uma requisição para a função `send-nps-reminder`
3. Verifique os logs no Supabase para ver o status do envio
4. Confira a caixa de entrada do destinatário

## Troubleshooting

### Erro 401: Unauthorized
- Verifique se o refresh_token está correto
- Confirme que o Client ID e Client Secret estão corretos
- Certifique-se de que a Gmail API está ativada no projeto

### Erro 403: Insufficient Permission
- Verifique se o escopo `https://www.googleapis.com/auth/gmail.send` foi autorizado
- Reautorize a aplicação com o escopo correto

### Erro 400: Bad Request
- Verifique o formato do e-mail
- Confirme que o conteúdo HTML está correto
- Teste com destinatários válidos

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca exponha seus Client ID, Client Secret ou Refresh Token publicamente
- Use sempre secrets/variáveis de ambiente para armazenar credenciais
- Rotacione seus tokens periodicamente
- Revogue acesso imediatamente se suspeitar de comprometimento

## Referências

- [Gmail API Documentation](https://developers.google.com/gmail/api/guides)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail API Send Message](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send)
